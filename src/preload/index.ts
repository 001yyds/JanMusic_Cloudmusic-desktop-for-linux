import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppInfo,
  Comment,
  MediaWarmPayload,
  Quality,
  Settings,
  Song
} from '../shared/types'

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> =>
  ipcRenderer.invoke(channel, ...args) as Promise<T>

const api = {
  platform: 'desktop' as const,
  auth: {
    qrCreate: () => invoke<{ key: string }>('auth:qr:create'),
    qrCheck: (key: string) => invoke<{ code: number; message?: string }>('auth:qr:check', key),
    captchaSend: (phone: string, countryCode = '86') =>
      invoke<{ code: number; message?: string }>('auth:captcha:send', phone, countryCode),
    phoneLogin: (phone: string, captcha: string, countryCode = '86') =>
      invoke<{ code: number; message?: string }>('auth:phone:login', phone, captcha, countryCode),
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
  comment: {
    list: (songId: number, offset = 0, limit = 20) =>
      invoke('comment:list', songId, offset, limit),
    sorted: (songId: number, sort: 99 | 2 | 3, pageNo = 1, limit = 20, cursor = '') =>
      invoke('comment:sorted', songId, sort, pageNo, limit, cursor),
    floor: (songId: number, parentCommentId: number, limit = 50) =>
      invoke('comment:floor', songId, parentCommentId, limit),
    like: (songId: number, commentId: number, like: boolean) =>
      invoke('comment:like', songId, commentId, like),
    add: (songId: number, content: string, replyTo?: number) =>
      invoke<Comment | null>('comment:add', songId, content, replyTo),
    remove: (songId: number, commentId: number) =>
      invoke('comment:remove', songId, commentId)
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
  lyrics: {
    update: (state: { current: string; secondary?: string; playing?: boolean }) =>
      ipcRenderer.send('lyrics:update', state),
    setVisible: (visible: boolean) => invoke<boolean>('lyrics:visible', visible),
    setLocked: (locked: boolean) => invoke<boolean>('lyrics:lock', locked),
    setFont: (size: number) => invoke<boolean>('lyrics:font', size)
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
