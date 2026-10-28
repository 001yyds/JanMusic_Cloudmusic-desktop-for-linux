import type {
  AppInfo,
  Comment,
  CommentFloorPage,
  CommentPage,
  CommentSort,
  DownloadRecord,
  LyricResult,
  MediaWarmPayload,
  Playlist,
  Profile,
  Quality,
  Settings,
  Song,
  SongUrlResult
} from './types'

export interface SearchArtist {
  id: number
  name: string
  picUrl?: string
  albumSize?: number
  fansCount?: number
}

export interface SearchResult {
  songs?: Song[]
  songCount?: number
  playlists?: Playlist[]
  playlistCount?: number
  artists?: SearchArtist[]
  artistCount?: number
}

export interface NcmApi {
  platform: 'desktop' | 'mobile'
  auth: {
    qrCreate(): Promise<{ key: string }>
    qrCheck(key: string): Promise<{ code: number; message?: string }>
    captchaSend(phone: string, countryCode?: string): Promise<{ code: number; message?: string }>
    phoneLogin(
      phone: string,
      captcha: string,
      countryCode?: string
    ): Promise<{ code: number; message?: string }>
    status(): Promise<{ loggedIn: boolean; profile: Profile | null; playlists: Playlist[] }>
    logout(): Promise<{ ok: boolean }>
    /** 仅手机端：打开官方网页登录页，人工完成短信登录与滑块验证 */
    webLogin?(): Promise<{ ok: boolean }>
  }
  /** 仅桌面端：桌面歌词覆盖层 */
  lyrics?: {
    update(state: { current: string; secondary?: string; playing?: boolean }): void
    setVisible(visible: boolean): Promise<boolean>
    setLocked(locked: boolean): Promise<boolean>
    setFont(size: number): Promise<boolean>
  }
  user: {
    playlists(uid: number): Promise<Playlist[]>
  }
  playlist: {
    detail(id: number): Promise<Playlist | null>
  }
  song: {
    url(id: number, level: Quality): Promise<SongUrlResult>
    lyric(id: number): Promise<LyricResult>
    like(id: number, like: boolean): Promise<void>
  }
  comment: {
    list(songId: number, offset?: number, limit?: number): Promise<CommentPage>
    sorted(
      songId: number,
      sort: CommentSort,
      pageNo?: number,
      limit?: number,
      cursor?: string
    ): Promise<CommentPage>
    floor(songId: number, parentCommentId: number, limit?: number): Promise<CommentFloorPage>
    like(songId: number, commentId: number, like: boolean): Promise<void>
    add(songId: number, content: string, replyTo?: number): Promise<Comment | null>
    remove(songId: number, commentId: number): Promise<void>
  }
  search: {
    query(keyword: string, type: 1 | 1000 | 100, offset?: number): Promise<SearchResult>
  }
  discover: {
    daily(): Promise<Song[]>
    playlists(): Promise<Playlist[]>
    newsongs(): Promise<Song[]>
    toplists(): Promise<Playlist[]>
  }
  media: {
    warm(payload: MediaWarmPayload): Promise<void>
    local?(id: number): Promise<string | null>
  }
  cache: {
    info(): Promise<{ audio: number; images: number }>
    clear(): Promise<void>
  }
  settings: {
    get(): Promise<Settings>
    set(patch: Partial<Settings>): Promise<Settings>
    chooseDownloadDir(): Promise<string>
  }
  app: {
    info(): Promise<AppInfo>
  }
  downloads: {
    add(song: Song, level: Quality): Promise<DownloadRecord>
    remove(id: number, path: string): Promise<boolean>
    openFolder(): Promise<string>
  }
  win: {
    minimize(): void
    toggleMaximize(): Promise<boolean>
    close(): void
    isMaximized(): Promise<boolean>
    onMaximize(callback: (value: boolean) => void): () => void
  }
  events: {
    onDownloadProgress(callback: (payload: { id: number; received: number; total: number }) => void): () => void
    onPlayerCommand(callback: (command: string) => void): () => void
  }
}
