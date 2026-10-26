import type { Quality, Song } from '../../../shared/types'
import { usePlayerStore } from '../store/player'
import { useSettingsStore } from '../store/settings'
import { useUiStore } from '../store/ui'
import { api } from './api'
import { loadPlaylist } from './playlistCache'

export async function playPlaylist(id: number, index = 0): Promise<void> {
  const { toast } = useUiStore.getState()
  try {
    const playlist = await loadPlaylist(id)
    if (!playlist?.tracks?.length) {
      toast('这个歌单还没有可播放的歌曲', 'error')
      return
    }
    usePlayerStore.getState().playQueue(playlist.tracks, index)
  } catch {
    toast('加载歌单失败', 'error')
  }
}

export async function downloadSong(song: Song, level: Quality): Promise<void> {
  const { toast } = useUiStore.getState()
  toast(`开始下载《${song.name}》`, 'info')
  try {
    const record = await api.downloads.add(song, level)
    toast(`已保存：${record.name}`, 'success')
    await useSettingsStore.getState().refreshDownloads()
  } catch (error) {
    toast(error instanceof Error ? error.message : '下载失败', 'error')
  }
}
