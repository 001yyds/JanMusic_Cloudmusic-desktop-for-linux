import { create } from 'zustand'
import type { Quality, Song } from '../../../shared/types'
import { api, audioUrl, songAlbum, songArtists, songDuration } from '../lib/api'
import { useSettingsStore } from './settings'
import { useUiStore } from './ui'

export type PlayMode = 'order' | 'repeat' | 'single' | 'shuffle'

interface PlayerState {
  queue: Song[]
  index: number
  current: Song | null
  playing: boolean
  loading: boolean
  time: number
  duration: number
  volume: number
  muted: boolean
  mode: PlayMode
  quality: Quality
  trial: boolean
  play: (song: Song, queue?: Song[]) => void
  playQueue: (queue: Song[], index: number) => void
  toggle: () => void
  next: (auto?: boolean) => void
  previous: () => void
  seek: (seconds: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  setMode: (mode: PlayMode) => void
  cycleMode: () => void
  setQuality: (quality: Quality) => void
  addToQueue: (songs: Song[]) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
}

const audio = new Audio()
audio.preload = 'auto'

let token = 0
let errorStreak = 0
let pendingSeek: number | null = null
let volumeTimer: ReturnType<typeof setTimeout> | undefined
let warmTimer: ReturnType<typeof setTimeout> | undefined

let shuffleQueue: Song[] | null = null
let shuffleOrder: number[] = []
let shufflePos = -1

function buildShuffleOrder(length: number): number[] {
  const order = Array.from({ length }, (_, index) => index)
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = order[i]
    order[i] = order[j]
    order[j] = current
  }
  return order
}

function startShuffle(queue: Song[], currentIndex: number): void {
  shuffleQueue = queue
  const rest: number[] = []
  for (let index = 0; index < queue.length; index += 1) {
    if (index !== currentIndex) rest.push(index)
  }
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const current = rest[i]
    rest[i] = rest[j]
    rest[j] = current
  }
  shuffleOrder = [currentIndex, ...rest]
  shufflePos = 0
}

function ensureShuffle(queue: Song[], currentIndex: number): void {
  if (shuffleQueue !== queue || shuffleOrder.length !== queue.length) {
    startShuffle(queue, currentIndex)
    return
  }
  if (shuffleOrder[shufflePos] !== currentIndex) {
    const position = shuffleOrder.indexOf(currentIndex)
    if (position >= 0) shufflePos = position
    else startShuffle(queue, currentIndex)
  }
}

function nextShuffleIndex(queue: Song[], currentIndex: number): number {
  ensureShuffle(queue, currentIndex)
  if (queue.length <= 1) return currentIndex
  if (shufflePos + 1 >= shuffleOrder.length) {
    shuffleOrder = buildShuffleOrder(queue.length)
    shuffleQueue = queue
    if (shuffleOrder[0] === currentIndex) {
      const swap = 1 + Math.floor(Math.random() * (shuffleOrder.length - 1))
      const head = shuffleOrder[0]
      shuffleOrder[0] = shuffleOrder[swap]
      shuffleOrder[swap] = head
    }
    shufflePos = 0
    return shuffleOrder[0]
  }
  shufflePos += 1
  return shuffleOrder[shufflePos]
}

function previousShuffleIndex(queue: Song[], currentIndex: number): number {
  ensureShuffle(queue, currentIndex)
  if (queue.length <= 1) return currentIndex
  if (shufflePos <= 0) {
    shufflePos = shuffleOrder.length - 1
    return shuffleOrder[shufflePos]
  }
  shufflePos -= 1
  return shuffleOrder[shufflePos]
}

function toast(message: string, kind: 'info' | 'error' | 'success' = 'info'): void {
  useUiStore.getState().toast(message, kind)
}

function updateSession(song: Song): void {
  if (!('mediaSession' in navigator)) return
  try {
    const album = songAlbum(song)
    const artwork = album?.picUrl?.replace(/^http:\/\//, 'https://')
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.name,
      artist: songArtists(song),
      album: album?.name ?? '',
      artwork: artwork
        ? [
            {
              src: `${artwork}${artwork.includes('?') ? '&' : '?'}param=512y512`,
              sizes: '512x512',
              type: 'image/jpeg'
            }
          ]
        : []
    })
  } catch {
    // media session metadata is best effort
  }
}

async function start(song: Song, autoplay: boolean): Promise<void> {
  const myToken = (token += 1)
  usePlayerStore.setState({
    current: song,
    loading: true,
    time: 0,
    duration: songDuration(song) / 1000,
    trial: false
  })
  updateSession(song)
  clearTimeout(warmTimer)
  try {
    const local = await api.media.local?.(song.id)
    if (myToken !== token) return
    if (local) {
      audio.src = local
      audio.volume = usePlayerStore.getState().muted ? 0 : usePlayerStore.getState().volume
      usePlayerStore.setState({ trial: false })
      if (!autoplay) {
        usePlayerStore.setState({ loading: false })
        return
      }
      try {
        await audio.play()
        usePlayerStore.setState({ playing: true, loading: false })
        return
      } catch {
        // fall back to streaming when the local file cannot be played
      }
    }
  } catch {
    // fall back to streaming
  }

  try {
    const result = await api.song.url(song.id, usePlayerStore.getState().quality)
    if (myToken !== token) return
    if (!result.upstream) {
      usePlayerStore.setState({ loading: false, playing: false })
      toast('该歌曲暂无版权或需要会员', 'error')
      return
    }
    audio.src = audioUrl(song.id, result.upstream, result.level, result.type, result.size)
    audio.volume = usePlayerStore.getState().muted ? 0 : usePlayerStore.getState().volume
    usePlayerStore.setState({ trial: result.trial })

    if (!result.trial && result.upstream) {
      const payload = {
        id: song.id,
        upstream: result.upstream,
        level: result.level,
        type: result.type,
        size: result.size
      }
      warmTimer = setTimeout(() => {
        if (audio.paused) return
        if (usePlayerStore.getState().current?.id !== song.id) return
        void api.media.warm(payload)
      }, 15000)
    }

    if (autoplay) {
      await audio.play()
      usePlayerStore.setState({ playing: true })
    }
  } catch {
    if (myToken !== token) return
    usePlayerStore.setState({ loading: false, playing: false })
    toast('播放失败，请检查网络或切换音质', 'error')
  }
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  index: -1,
  current: null,
  playing: false,
  loading: false,
  time: 0,
  duration: 0,
  volume: 0.75,
  muted: false,
  mode: 'repeat',
  quality: 'exhigh',
  trial: false,

  play: (song, list) => {
    let queue = get().queue
    let index = 0
    if (list && list.length) {
      queue = list
      index = Math.max(
        0,
        list.findIndex((item) => item.id === song.id)
      )
      set({ queue, index })
    } else {
      const found = queue.findIndex((item) => item.id === song.id)
      if (found >= 0) {
        index = found
        set({ index })
      } else {
        queue = [...queue, song]
        index = queue.length - 1
        set({ queue, index })
      }
    }
    if (get().mode === 'shuffle') startShuffle(queue, index)
    void start(song, true)
  },

  playQueue: (queue, index) => {
    if (!queue.length) return
    const safeIndex = Math.min(Math.max(0, index), queue.length - 1)
    set({ queue, index: safeIndex })
    if (get().mode === 'shuffle') startShuffle(queue, safeIndex)
    void start(queue[safeIndex], true)
  },

  toggle: () => {
    const { current, queue } = get()
    if (!current) {
      if (queue.length) {
        set({ index: 0 })
        void start(queue[0], true)
      }
      return
    }
    if (audio.paused) {
      if (!audio.currentSrc) {
        void start(current, true)
        return
      }
      void audio.play().catch(() => toast('无法播放当前音源', 'error'))
    } else {
      audio.pause()
    }
  },

  next: (auto = false) => {
    const { queue, index, mode } = get()
    if (!queue.length) return
    if (mode === 'shuffle' && queue.length > 1) {
      const target = nextShuffleIndex(queue, index)
      set({ index: target })
      void start(queue[target], true)
      return
    }
    if (auto && mode === 'single') {
      audio.currentTime = 0
      void audio.play().catch(() => undefined)
      return
    }
    let target = index + 1
    if (target >= queue.length) {
      if (auto && mode === 'order') {
        set({ playing: false })
        return
      }
      target = 0
    }
    set({ index: target })
    void start(queue[target], true)
  },

  previous: () => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0
      set({ time: 0 })
      return
    }
    const { queue, index, mode } = get()
    if (!queue.length) return
    if (mode === 'shuffle' && queue.length > 1) {
      const target = previousShuffleIndex(queue, index)
      set({ index: target })
      void start(queue[target], true)
      return
    }
    const target = (index - 1 + queue.length) % queue.length
    set({ index: target })
    void start(queue[target], true)
  },

  seek: (seconds) => {
    if (!Number.isFinite(seconds)) return
    const clamped = Math.min(Math.max(0, seconds), audio.duration || 0)
    audio.currentTime = clamped
    set({ time: clamped })
  },

  setVolume: (volume) => {
    const value = Math.min(1, Math.max(0, volume))
    audio.volume = value
    set({ volume: value, muted: false })
    clearTimeout(volumeTimer)
    volumeTimer = setTimeout(() => {
      void useSettingsStore.getState().patch({ volume: value })
    }, 500)
  },

  toggleMute: () => {
    const muted = !get().muted
    audio.volume = muted ? 0 : get().volume
    set({ muted })
  },

  setMode: (mode) => {
    set({ mode })
    if (mode === 'shuffle') {
      const { queue, index } = get()
      if (queue.length) startShuffle(queue, index)
    }
  },

  cycleMode: () => {
    const order: PlayMode[] = ['repeat', 'shuffle', 'single', 'order']
    const next = order[(order.indexOf(get().mode) + 1) % order.length]
    set({ mode: next })
    if (next === 'shuffle') {
      const { queue, index } = get()
      if (queue.length) {
        shuffleQueue = null
        startShuffle(queue, index)
        toast(`随机播放 · 本轮 ${queue.length} 首不重复`, 'info')
      } else {
        toast('随机播放', 'info')
      }
      return
    }
    toast(
      { repeat: '列表循环', single: '单曲循环', order: '顺序播放', shuffle: '随机播放' }[next],
      'info'
    )
  },

  setQuality: (quality) => {
    set({ quality })
    void useSettingsStore.getState().patch({ quality })
    const { current } = get()
    if (!current) return
    const wasPlaying = !audio.paused
    pendingSeek = audio.currentTime
    void start(current, wasPlaying)
  },

  addToQueue: (songs) => {
    if (!songs.length) return
    shuffleQueue = null
    set({ queue: [...get().queue, ...songs] })
    toast(`已添加 ${songs.length} 首到播放队列`, 'success')
  },

  removeFromQueue: (index) => {
    const { queue, index: current } = get()
    if (index < 0 || index >= queue.length) return

    if (index === current) {
      const nextQueue = queue.filter((_, position) => position !== index)
      if (!nextQueue.length) {
        shuffleQueue = null
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
        set({
          queue: [],
          index: -1,
          current: null,
          playing: false,
          loading: false,
          time: 0,
          duration: 0,
          trial: false
        })
        return
      }
      const target = Math.min(index, nextQueue.length - 1)
      const wasPlaying = !audio.paused
      shuffleQueue = null
      set({ queue: nextQueue, index: target })
      if (get().mode === 'shuffle') startShuffle(nextQueue, target)
      void start(nextQueue[target], wasPlaying)
      return
    }

    const nextQueue = queue.filter((_, position) => position !== index)
    const nextIndex = index < current ? current - 1 : current
    shuffleQueue = null
    set({ queue: nextQueue, index: nextIndex })
    if (get().mode === 'shuffle') startShuffle(nextQueue, nextIndex)
  },

  clearQueue: () => {
    const { current } = get()
    shuffleQueue = null
    set({ queue: current ? [current] : [], index: current ? 0 : -1 })
  }
}))

audio.addEventListener('timeupdate', () => {
  usePlayerStore.setState({ time: audio.currentTime })
  if ('mediaSession' in navigator && Number.isFinite(audio.duration) && audio.duration > 0) {
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        position: Math.min(audio.currentTime, audio.duration),
        playbackRate: audio.playbackRate
      })
    } catch {
      // position state is optional
    }
  }
})

audio.addEventListener('durationchange', () => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    usePlayerStore.setState({ duration: audio.duration })
  }
})

audio.addEventListener('loadedmetadata', () => {
  if (pendingSeek != null) {
    const target = pendingSeek
    pendingSeek = null
    try {
      audio.currentTime = target
    } catch {
      // ignore seek failures
    }
  }
})

audio.addEventListener('play', () => usePlayerStore.setState({ playing: true }))
audio.addEventListener('pause', () => usePlayerStore.setState({ playing: false }))
audio.addEventListener('waiting', () => usePlayerStore.setState({ loading: true }))
audio.addEventListener('playing', () => {
  errorStreak = 0
  usePlayerStore.setState({ loading: false })
})
audio.addEventListener('canplay', () => usePlayerStore.setState({ loading: false }))
audio.addEventListener('ended', () => usePlayerStore.getState().next(true))
audio.addEventListener('error', () => {
  usePlayerStore.setState({ loading: false, playing: false })
  const { queue } = usePlayerStore.getState()
  errorStreak += 1
  if (errorStreak <= 3 && queue.length > 1) {
    toast('播放失败，正在切换下一首', 'error')
    window.setTimeout(() => usePlayerStore.getState().next(true), 500)
  } else if (errorStreak > 3) {
    toast('音频源暂时不可用', 'error')
  }
})

if ('mediaSession' in navigator) {
  const actions: [MediaSessionAction, () => void][] = [
    ['play', () => usePlayerStore.getState().toggle()],
    ['pause', () => usePlayerStore.getState().toggle()],
    ['previoustrack', () => usePlayerStore.getState().previous()],
    ['nexttrack', () => usePlayerStore.getState().next()]
  ]
  for (const [action, handler] of actions) {
    try {
      navigator.mediaSession.setActionHandler(action, handler)
    } catch {
      // unsupported action
    }
  }
}

const PERSIST_KEY = 'betterncm-player-v1'

usePlayerStore.subscribe((state, previous) => {
  if (state.queue !== previous.queue || state.index !== previous.index || state.mode !== previous.mode) {
    try {
      localStorage.setItem(
        PERSIST_KEY,
        JSON.stringify({ queue: state.queue, index: state.index, mode: state.mode })
      )
    } catch {
      // storage unavailable
    }
  }
})

export function restorePlayer(): void {
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as { queue?: Song[]; index?: number; mode?: PlayMode }
    if (!data.queue?.length) return
    const index = Math.min(Math.max(0, data.index ?? 0), data.queue.length - 1)
    usePlayerStore.setState({
      queue: data.queue,
      index,
      mode: data.mode ?? 'repeat',
      current: data.queue[index],
      duration: songDuration(data.queue[index]) / 1000
    })
    if ((data.mode ?? 'repeat') === 'shuffle') startShuffle(data.queue, index)
  } catch {
    // corrupted state, start fresh
  }
}
