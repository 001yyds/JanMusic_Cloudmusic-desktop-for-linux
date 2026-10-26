import type { Album, Song } from '../../../shared/types'

export const api = window.ncm

export function coverUrl(url: string | undefined, size = 400): string {
  if (!url) return ''
  const normalized = url.replace(/^http:\/\//, 'https://')
  const separator = normalized.includes('?') ? '&' : '?'
  return `ncm://image/?u=${encodeURIComponent(`${normalized}${separator}param=${size}y${size}`)}`
}

export function audioUrl(id: number, upstream: string, level: string, type: string, size = 0): string {
  const ext = /^(mp3|flac|m4a|aac|ogg)$/i.test(type) ? type.toLowerCase() : 'mp3'
  return `ncm://audio/${id}?u=${encodeURIComponent(upstream)}&q=${level}&e=${ext}&s=${size}`
}

export function songAlbum(song: Song): Album | undefined {
  return song.al ?? song.album
}

export function songArtists(song: Song): string {
  const list = song.ar ?? song.artists ?? []
  return list.map((artist) => artist.name).join(' / ') || '未知艺人'
}

export function songDuration(song: Song): number {
  return song.dt ?? song.duration ?? 0
}

export function songCover(song: Song | null | undefined, size = 300): string {
  if (!song) return ''
  return coverUrl(songAlbum(song)?.picUrl, size)
}

export function isPlayable(song: Song): boolean {
  const fee = song.fee ?? 0
  return fee !== 4 || !!song.privilege
}
