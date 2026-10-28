import type { Quality, Song } from '../../../shared/types'
import { usePlayerStore } from '../store/player'
import { useDownloadsStore } from '../store/downloads'
import { downloadList } from '../store/settings'
import { useUiStore } from '../store/ui'
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

export function downloadSong(song: Song, level: Quality): void {
  const { toast } = useUiStore.getState()
  if (downloadList().some((record) => record.id === song.id)) {
    toast(`《${song.name}》已下载`, 'info')
    return
  }
  const count = useDownloadsStore.getState().enqueue([song], level, false)
  if (count) toast(`已添加《${song.name}》到下载列表`, 'info')
  else toast('这首歌已在下载列表中', 'info')
}

export function downloadSongs(songs: Song[], level: Quality): void {
  const { toast } = useUiStore.getState()
  const count = useDownloadsStore.getState().enqueue(songs, level)
  if (count) toast(`已添加 ${count} 首到下载列表`, 'success')
  else toast('这些歌曲已下载或正在下载', 'info')
}
