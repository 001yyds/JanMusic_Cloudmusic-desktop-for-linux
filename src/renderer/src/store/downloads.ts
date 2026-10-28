import { create } from 'zustand'
import type { Quality, Song } from '../../../shared/types'
import { api } from '../lib/api'
import { useSettingsStore } from './settings'
import { useUiStore } from './ui'

export type DownloadStatus = 'queued' | 'downloading' | 'done' | 'error'

export interface DownloadTask {
  key: string
  song: Song
  level: Quality
  status: DownloadStatus
  received: number
  total: number
  error?: string
  quiet: boolean
  createdAt: number
}

interface DownloadsState {
  tasks: DownloadTask[]
  running: boolean
  enqueue: (songs: Song[], level: Quality, quiet?: boolean) => number
  clearFinished: () => void
  removeTask: (key: string) => void
}

let sequence = 0
let draining = false

function patchTask(key: string, update: Partial<DownloadTask>): void {
  useDownloadsStore.setState((state) => ({
    tasks: state.tasks.map((task) => (task.key === key ? { ...task, ...update } : task))
  }))
}

async function drain(): Promise<void> {
  if (draining) return
  draining = true
  useDownloadsStore.setState({ running: true })
  try {
    for (;;) {
      const task = useDownloadsStore.getState().tasks.find((item) => item.status === 'queued')
      if (!task) break
      patchTask(task.key, { status: 'downloading', received: 0, total: 0 })
      try {
        const record = await api.downloads.add(task.song, task.level)
        patchTask(task.key, { status: 'done', received: record.size, total: record.size })
        if (!task.quiet) {
          useUiStore.getState().toast(`《${task.song.name}》下载完成`, 'success')
        }
        await useSettingsStore.getState().refreshDownloads()
      } catch (error) {
        const message = error instanceof Error ? error.message : '下载失败'
        patchTask(task.key, { status: 'error', error: message })
        useUiStore.getState().toast(`《${task.song.name}》${message}`, 'error')
      }
    }
  } finally {
    draining = false
    useDownloadsStore.setState({ running: false })
  }
}

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  tasks: [],
  running: false,
  enqueue: (songs, level, quiet = true) => {
    const blocked = new Set<number>([
      ...get()
        .tasks.filter((task) => task.status === 'queued' || task.status === 'downloading')
        .map((task) => task.song.id),
      ...(useSettingsStore.getState().settings?.downloads ?? []).map((record) => record.id)
    ])
    const fresh = songs.filter((song) => {
      if (blocked.has(song.id)) return false
      // 同一批里重复出现的歌曲也只入队一次
      blocked.add(song.id)
      return true
    })
    if (!fresh.length) return 0
    const tasks = fresh.map<DownloadTask>((song) => ({
      key: `${song.id}-${(sequence += 1)}`,
      song,
      level,
      status: 'queued',
      received: 0,
      total: 0,
      quiet,
      createdAt: Date.now()
    }))
    set((state) => ({ tasks: [...tasks, ...state.tasks] }))
    void drain()
    return fresh.length
  },
  clearFinished: () =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.status === 'queued' || task.status === 'downloading')
    })),
  removeTask: (key) => set((state) => ({ tasks: state.tasks.filter((task) => task.key !== key) }))
}))

api.events.onDownloadProgress(({ id, received, total }) => {
  const task = useDownloadsStore
    .getState()
    .tasks.find((item) => item.song.id === id && item.status === 'downloading')
  if (!task) return
  patchTask(task.key, { received, total: total || task.total })
})
