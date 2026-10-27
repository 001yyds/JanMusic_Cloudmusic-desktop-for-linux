import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import { activeLineIndex, parseLyric, type LyricLine } from './lyrics'
import { usePlayerStore } from '../store/player'
import { useSettingsStore } from '../store/settings'

/**
 * 把当前歌词同步到桌面歌词覆盖层（仅桌面端）。
 * 只在行号 / 播放状态变化时推送，避免每帧写 stdin。
 */
export function useDesktopLyrics(): void {
  const enabled = useSettingsStore((state) => state.settings?.desktopLyrics ?? false)
  const locked = useSettingsStore((state) => state.settings?.desktopLyricsLocked ?? false)
  const fontSize = useSettingsStore((state) => state.settings?.desktopLyricsFontSize ?? 30)

  const current = usePlayerStore((state) => state.current)
  const playing = usePlayerStore((state) => state.playing)
  const time = usePlayerStore((state) => state.time)

  const [lines, setLines] = useState<LyricLine[]>([])
  const songId = current?.id ?? null
  const lastKey = useRef('')

  useEffect(() => {
    if (!enabled || !songId) {
      setLines([])
      return
    }
    let alive = true
    api.song
      .lyric(songId)
      .then((result) => {
        if (alive) setLines(parseLyric(result.lrc ?? '', result.tlyric ?? ''))
      })
      .catch(() => {
        if (alive) setLines([])
      })
    return () => {
      alive = false
    }
  }, [enabled, songId])

  useEffect(() => {
    void api.lyrics?.setVisible(enabled)
    if (!enabled) lastKey.current = ''
  }, [enabled])

  useEffect(() => {
    void api.lyrics?.setLocked(locked)
  }, [locked])

  useEffect(() => {
    void api.lyrics?.setFont(fontSize)
  }, [fontSize])

  useEffect(() => {
    if (!enabled) return
    const index = activeLineIndex(lines, time)
    const line = lines[index]
    const next = lines[index + 1]
    const secondary = line?.translation ?? next?.text ?? ''
    const key = `${songId}:${index}:${playing}:${secondary}`
    if (key === lastKey.current) return
    lastKey.current = key
    api.lyrics?.update({ current: line?.text ?? '', secondary, playing })
  }, [enabled, lines, time, playing, songId])
}
