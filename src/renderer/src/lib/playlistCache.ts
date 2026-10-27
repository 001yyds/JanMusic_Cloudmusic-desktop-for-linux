import type { Playlist } from '../../../shared/types'
import { api } from './api'

const cache = new Map<number, Playlist>()

export async function loadPlaylist(id: number): Promise<Playlist | null> {
  const cached = cache.get(id)
  if (cached) return cached
  const playlist = await api.playlist.detail(id)
  if (playlist) cache.set(id, playlist)
  return playlist
}

export function cachedPlaylist(id: number): Playlist | undefined {
  return cache.get(id)
}

export function invalidatePlaylist(id: number): void {
  cache.delete(id)
}

export function clearPlaylistCache(): void {
  cache.clear()
}
