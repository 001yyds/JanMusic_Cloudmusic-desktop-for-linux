export type Quality = 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires'

export interface Artist {
  id: number
  name: string
}

export interface Album {
  id: number
  name: string
  picUrl?: string
}

export interface Song {
  id: number
  name: string
  ar?: Artist[]
  al?: Album
  artists?: Artist[]
  album?: Album
  dt?: number
  duration?: number
  fee?: number
  mvid?: number
  privilege?: Record<string, unknown>
}

export interface Playlist {
  id: number
  name: string
  coverImgUrl?: string
  picUrl?: string
  trackCount?: number
  playCount?: number
  description?: string
  creator?: { userId: number; nickname: string; avatarUrl?: string }
  subscribed?: boolean
  updateFrequency?: string
  specialType?: number
  tracks?: Song[]
}

export interface Profile {
  userId: number
  nickname: string
  avatarUrl?: string
  backgroundUrl?: string
  signature?: string
  follows?: number
  followeds?: number
  playlistCount?: number
}

export interface DownloadRecord {
  id: number
  name: string
  artist: string
  album: string
  cover: string
  level: Quality
  path: string
  size: number
  createdAt: number
}

export interface AppInfo {
  version: string
  electron: string
  chrome: string
  node: string
}

export interface Settings {
  quality: Quality
  volume: number
  downloadDir: string
  downloads: DownloadRecord[]
  lyricFontSize: number
}

export interface SongUrlResult {
  id: number
  url: string | null
  upstream: string | null
  level: Quality
  br: number
  size: number
  trial: boolean
  type: string
}

export interface LyricResult {
  lrc: string
  tlyric: string
}

export interface MediaWarmPayload {
  id: number
  upstream: string
  level: Quality
  type: string
  size: number
}
