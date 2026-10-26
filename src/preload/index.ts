import { contextBridge, ipcRenderer } from 'electron'
import type { AppInfo, MediaWarmPayload, Quality, Settings, Song } from '../shared/types'

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(channel, ...args) as Promise<T>

const api = {
  auth: {
    qrCreate: () => invoke<{ key: string }>('auth:qr:create'),
    qrCheck: (key: string) => invoke<{ code: number; message?: string }>('auth:qr:check', key),
    status: () => invoke('auth:status'),
    logout: () => invoke('auth:logout')
  },
  user: {
    playlists: (uid: number) => invoke('user:playlists', uid)
  },
  playlist: {
    detail: (id: number) => invoke('playlist:detail', id)
  },
  song: {
    url: (id: number, level: Quality) => invoke('song:url', id, level),
    lyric: (id: number) => invoke('song:lyric', id),
    like: (id: number, like: boolean) => invoke('song:like', id, like)
  },
  search: {
    query: (keyword: string, type: 1 | 1000 | 100, offset = 0) =>
      invoke('search:query', keyword, type, offset)
  },
  discover: {
    daily: () => invoke('discover:daily'),
    playlists: () => invoke('discover:playlists'),
    newsongs: () => invoke('discover:newsongs'),
    toplists: () => invoke('discover:toplists')
  },
  media: {
    warm: (payload: MediaWarmPayload) => invoke('media:warm', payload)
  },
  cache: {
    info: () => invoke<{ audio: number; images: number }>('cache:info'),
    clear: () => invoke<void>('cache:clear')
  },
  settings: {
    get: () => invoke<Settings>('settings:get'),
    set: (patch: Partial<Settings>) => invoke<Settings>('settings:set', patch),
    chooseDownloadDir: () => invoke<string>('settings:choose-download-dir')
  },
  app: {
    info: () => invoke<AppInfo>('app:info')
  },
  downloads: {
    add: (song: Song, level: Quality) => invoke('download:add', song, level),
    openFolder: () => invoke<string>('download:open-folder')
  },
  win: {
    minimize: () => void ipcRenderer.invoke('win:minimize'),
    toggleMaximize: () => invoke<boolean>('win:toggle-maximize'),
    close: () => void ipcRenderer.invoke('win:close'),
    isMaximized: () => invoke<boolean>('win:is-maximized'),
    onMaximize: (callback: (value: boolean) => void) => {
      const handler = (_event: unknown, value: boolean): void => callback(value)
      ipcRenderer.on('win:maximized', handler)
      return () => ipcRenderer.removeListener('win:maximized', handler)
    }
  },
  events: {
    onDownloadProgress: (callback: (payload: { id: number; received: number; total: number }) => void) => {
      const handler = (_event: unknown, payload: { id: number; received: number; total: number }): void =>
        callback(payload)
      ipcRenderer.on('download:progress', handler)
      return () => ipcRenderer.removeListener('download:progress', handler)
    },
    onPlayerCommand: (callback: (command: string) => void) => {
      const handler = (_event: unknown, command: string): void => callback(command)
      ipcRenderer.on('player:command', handler)
      return () => ipcRenderer.removeListener('player:command', handler)
    }
  }
}

contextBridge.exposeInMainWorld('ncm', api)
