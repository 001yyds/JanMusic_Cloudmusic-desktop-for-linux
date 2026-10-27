import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import type { NcmApi, SearchResult } from '../shared/api'
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
} from '../shared/types'

declare const __JANMUSIC_VERSION__: string

const UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
const PRESET_KEY = '0CoJUm6Qyw8W8jud'
const IV = '0102030405060708'
const PUBLIC_KEY = '010001'
const MODULUS =
  '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7'
const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const COOKIE_KEY = 'janmusic-cookies-v1'
const SETTINGS_KEY = 'janmusic-settings-v1'
const DOC_DIR = 'JanMusic'
const DOC_LABEL = 'Documents/JanMusic'

type Json = Record<string, any>

const encoder = new TextEncoder()
const MODULUS_N = BigInt(`0x${MODULUS}`)
const EXPONENT = BigInt(`0x${PUBLIC_KEY}`)
const MODULUS_BYTES = 128

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

async function aesEncrypt(text: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  )
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: encoder.encode(IV) },
    cryptoKey,
    encoder.encode(text)
  )
  return toBase64(new Uint8Array(encrypted))
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n
  let value = base % modulus
  let power = exponent
  while (power > 0n) {
    if (power & 1n) result = (result * value) % modulus
    value = (value * value) % modulus
    power >>= 1n
  }
  return result
}

function rsaEncrypt(text: string): string {
  const reversed = text.split('').reverse().join('')
  const bytes = encoder.encode(reversed)
  const block = new Uint8Array(MODULUS_BYTES)
  block.set(bytes, MODULUS_BYTES - bytes.length)
  let hex = '0x'
  for (const byte of block) hex += byte.toString(16).padStart(2, '0')
  return modPow(BigInt(hex), EXPONENT, MODULUS_N).toString(16).padStart(MODULUS_BYTES * 2, '0')
}

async function encodeWeapi(payload: unknown): Promise<string> {
  let secret = ''
  const random = crypto.getRandomValues(new Uint8Array(16))
  for (const byte of random) secret += BASE62[byte % BASE62.length]
  const params = await aesEncrypt(await aesEncrypt(JSON.stringify(payload), PRESET_KEY), secret)
  return new URLSearchParams({ params, encSecKey: rsaEncrypt(secret) }).toString()
}

function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/^http:\/\//, 'https://')
}

function splitSetCookie(raw: string): string[] {
  return raw.split(/,(?=\s*[A-Za-z0-9_#.\-]+=)/)
}

class MobileNetease {
  private cookies = new Map<string, string>()
  private loaded = false
  private dirty = false

  private ensure(): void {
    if (this.loaded) return
    this.loaded = true
    try {
      const stored = JSON.parse(localStorage.getItem(COOKIE_KEY) ?? '{}') as Record<string, string>
      for (const [key, value] of Object.entries(stored)) this.cookies.set(key, value)
    } catch {
      // ignore corrupted cookie storage
    }
  }

  isLoggedIn(): boolean {
    this.ensure()
    return this.cookies.has('MUSIC_U') || this.cookies.has('MUSIC_A')
  }

  private cookieHeader(): string {
    this.ensure()
    const parts = new Map(this.cookies)
    if (!parts.has('os')) parts.set('os', 'pc')
    if (!parts.has('appver')) parts.set('appver', '8.10.40')
    return [...parts].map(([key, value]) => `${key}=${value}`).join('; ')
  }

  private absorbHeaders(headers: Record<string, string> | undefined): void {
    if (!headers) return
    const raw = headers['set-cookie'] ?? headers['Set-Cookie']
    if (!raw) return
    for (const line of splitSetCookie(raw)) {
      const pair = line.split(';')[0]
      const index = pair.indexOf('=')
      if (index <= 0) continue
      const key = pair.slice(0, index).trim()
      const value = pair.slice(index + 1).trim()
      if (value) this.cookies.set(key, value)
      else this.cookies.delete(key)
      this.dirty = true
    }
  }

  private absorbCookieString(raw: string): void {
    for (const piece of raw.split(';')) {
      const pair = piece.trim()
      const index = pair.indexOf('=')
      if (index <= 0) continue
      this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim())
      this.dirty = true
    }
  }

  private persist(): void {
    if (!this.dirty) return
    this.dirty = false
    try {
      localStorage.setItem(COOKIE_KEY, JSON.stringify(Object.fromEntries(this.cookies)))
    } catch {
      // storage unavailable
    }
  }

  private assertOk(result: Json, fallback: string): void {
    if (typeof result.code === 'number' && result.code !== 200) {
      throw new Error(result.message ?? result.msg ?? fallback)
    }
  }

  private csrfToken(): string {
    return this.cookies.get('__csrf') ?? ''
  }

  private async request<T = Json>(path: string, payload: Json = {}): Promise<T> {
    this.ensure()
    let response
    try {
      response = await CapacitorHttp.request({
        url: `https://music.163.com/weapi/${path}`,
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: 'https://music.163.com',
          Origin: 'https://music.163.com',
          Cookie: this.cookieHeader()
        },
        data: await encodeWeapi(payload),
        connectTimeout: 15000,
        readTimeout: 20000
      })
    } catch {
      throw new Error('网络连接失败，请检查网络')
    }

    this.absorbHeaders(response.headers as Record<string, string>)
    this.persist()
    if (response.status < 200 || response.status >= 400) {
      throw new Error(`接口返回异常 (${response.status})`)
    }

    let data: unknown = response.data
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch {
        throw new Error(`接口返回异常 (${response.status})`)
      }
    }
    return data as T
  }

  async qrCreate(): Promise<{ key: string }> {
    const result = await this.request('login/qrcode/unikey', { type: 1 })
    const key = (result.unikey ?? result.data?.unikey) as string | undefined
    if (!key) throw new Error(result.message ?? '无法获取登录二维码')
    return { key }
  }

  async qrCheck(key: string): Promise<{ code: number; message?: string }> {
    const result = await this.request('login/qrcode/client/login', { key, type: 1 })
    if (result.code === 803) {
      if (typeof result.cookie === 'string') this.absorbCookieString(result.cookie)
      this.persist()
    }
    return { code: result.code, message: result.message }
  }

  async captchaSend(phone: string, countryCode = '86'): Promise<{ code: number; message?: string }> {
    const result = await this.request('sms/captcha/sent', {
      cellphone: phone,
      ctcode: countryCode,
      secrete: 'music_middleuser_pclogin',
      csrf_token: this.csrfToken()
    })
    return { code: result.code ?? 0, message: result.message ?? result.msg }
  }

  async phoneLogin(
    phone: string,
    captcha: string,
    countryCode = '86'
  ): Promise<{ code: number; message?: string }> {
    const result = await this.request('w/login/cellphone', {
      type: '1',
      https: 'true',
      phone,
      countrycode: countryCode,
      captcha,
      remember: 'true',
      secureCaptcha: '',
      csrf_token: this.csrfToken()
    })
    if (result.code === 200) {
      if (typeof result.cookie === 'string') this.absorbCookieString(result.cookie)
      this.persist()
    }
    return { code: result.code ?? 0, message: result.message ?? result.msg }
  }

  async account(): Promise<{ profile: Profile | null; account: Json | null }> {
    if (!this.isLoggedIn()) return { profile: null, account: null }
    const result = await this.request('w/nuser/account/get', {})
    return { profile: (result.profile as Profile) ?? null, account: result.account ?? null }
  }

  logout(): void {
    this.cookies.clear()
    this.loaded = true
    this.dirty = false
    try {
      localStorage.removeItem(COOKIE_KEY)
    } catch {
      // storage unavailable
    }
  }

  async userPlaylists(uid: number): Promise<Playlist[]> {
    const result = await this.request('user/playlist', {
      uid,
      limit: 1000,
      offset: 0,
      includeVideo: true
    })
    return (result.playlist as Playlist[]) ?? []
  }

  async songDetail(ids: number[]): Promise<Song[]> {
    if (!ids.length) return []
    const result = await this.request('v3/song/detail', {
      c: JSON.stringify(ids.map((id) => ({ id })))
    })
    return (result.songs as Song[]) ?? []
  }

  async playlistDetail(id: number): Promise<Playlist | null> {
    const result = await this.request('v6/playlist/detail', { id, n: 1000, s: 8 })
    const playlist = result.playlist as Playlist | undefined
    if (!playlist) return null
    const order: number[] = ((playlist as Json).trackIds ?? []).map((item: Json) => item.id as number)
    const tracks = playlist.tracks ?? []
    if (!order.length) return playlist
    if (order.length === tracks.length && tracks.every((track, index) => track.id === order[index])) {
      return playlist
    }
    const known = new Map(tracks.map((track) => [track.id, track]))
    const missing = order.filter((trackId) => !known.has(trackId))
    for (let index = 0; index < missing.length; index += 500) {
      const batch = await this.songDetail(missing.slice(index, index + 500))
      for (const song of batch) known.set(song.id, song)
    }
    playlist.tracks = order.map((trackId) => known.get(trackId)).filter((song): song is Song => !!song)
    return playlist
  }

  async songUrl(id: number, preferred: Quality): Promise<SongUrlResult> {
    const chain: Quality[] =
      preferred === 'lossless' || preferred === 'hires' ? [preferred, 'exhigh'] : [preferred]
    let trial: SongUrlResult | null = null
    for (const level of chain) {
      const result = await this.request('song/enhance/player/url/v1', {
        ids: JSON.stringify([id]),
        level,
        encodeType: 'flac'
      })
      const item = result.data?.[0]
      if (!item?.url) continue
      const upstream = normalizeMediaUrl(item.url)
      const candidate: SongUrlResult = {
        id,
        url: upstream,
        upstream,
        level,
        br: item.br ?? 0,
        size: item.size ?? 0,
        trial: !!item.freeTrialInfo,
        type: item.type ?? ''
      }
      if (!candidate.trial) return candidate
      trial ??= candidate
    }
    if (trial) return trial
    return { id, url: null, upstream: null, level: preferred, br: 0, size: 0, trial: false, type: '' }
  }

  async like(id: number, like: boolean): Promise<void> {
    this.ensure()
    const result = await this.request('radio/like', {
      alg: 'itembased',
      trackId: id,
      like,
      time: '3',
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, like ? '喜欢失败，请稍后重试' : '取消喜欢失败，请稍后重试')
  }

  async comments(songId: number, offset = 0, limit = 20): Promise<CommentPage> {
    const result = await this.request(`v1/resource/comments/R_SO_4_${songId}`, {
      rid: songId,
      limit,
      offset,
      beforeTime: 0
    })
    this.assertOk(result, '评论加载失败')
    return {
      total: (result.total as number) ?? 0,
      hasMore: !!result.more,
      hotComments: (result.hotComments as Comment[]) ?? [],
      comments: (result.comments as Comment[]) ?? []
    }
  }

  async sortedComments(
    songId: number,
    sort: CommentSort,
    pageNo = 1,
    limit = 20,
    cursor = ''
  ): Promise<CommentPage> {
    const position = Math.max(0, pageNo - 1) * limit
    const cursorValue = sort === 99 ? String(position) : sort === 2 ? `normalHot#${position}` : cursor || '0'
    const result = await this.request('v2/resource/comments', {
      threadId: `R_SO_4_${songId}`,
      pageNo,
      showInner: true,
      pageSize: limit,
      cursor: cursorValue,
      sortType: sort
    })
    this.assertOk(result, '评论加载失败')
    const data = (result.data as Json) ?? {}
    return {
      total: (data.totalCount as number) ?? 0,
      hasMore: !!data.hasMore,
      hotComments: [],
      comments: (data.comments as Comment[]) ?? [],
      cursor: (data.cursor as string) ?? cursorValue
    }
  }

  async commentFloor(songId: number, parentCommentId: number, limit = 50): Promise<CommentFloorPage> {
    const result = await this.request('resource/comment/floor/get', {
      parentCommentId,
      threadId: `R_SO_4_${songId}`,
      time: -1,
      limit
    })
    this.assertOk(result, '回复加载失败')
    const data = (result.data as Json) ?? {}
    return {
      total: (data.totalCount as number) ?? 0,
      hasMore: !!data.hasMore,
      comments: (data.comments as Comment[]) ?? []
    }
  }

  async commentLike(songId: number, commentId: number, like: boolean): Promise<void> {
    this.ensure()
    const result = await this.request(`v1/comment/${like ? 'like' : 'unlike'}`, {
      threadId: `R_SO_4_${songId}`,
      commentId,
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, like ? '点赞失败' : '取消点赞失败')
  }

  async addComment(songId: number, content: string, replyTo?: number): Promise<Comment | null> {
    this.ensure()
    const result = await this.request(`resource/comments/${replyTo ? 'reply' : 'add'}`, {
      threadId: `R_SO_4_${songId}`,
      content,
      ...(replyTo ? { commentId: replyTo } : {}),
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, '评论失败，请稍后重试')
    return (result.comment as Comment) ?? null
  }

  async deleteComment(songId: number, commentId: number): Promise<void> {
    this.ensure()
    const result = await this.request('resource/comments/delete', {
      threadId: `R_SO_4_${songId}`,
      commentId,
      csrf_token: this.csrfToken()
    })
    this.assertOk(result, '删除评论失败')
  }

  async lyric(id: number): Promise<LyricResult> {
    const result = await this.request('song/lyric', { id, lv: -1, kv: -1, tv: -1 })
    return {
      lrc: (result.lrc?.lyric as string) ?? '',
      tlyric: (result.tlyric?.lyric as string) ?? ''
    }
  }

  async search(keywords: string, type: 1 | 1000 | 100, offset = 0, limit = 30): Promise<Json> {
    const result = await this.request('cloudsearch/pc', {
      s: keywords,
      type,
      offset,
      limit,
      total: true
    })
    return result.result ?? {}
  }

  async dailySongs(): Promise<Song[]> {
    const result = await this.request('v3/discovery/recommend/songs', {})
    return (result.data?.dailySongs as Song[]) ?? []
  }

  async recommendPlaylists(): Promise<Playlist[]> {
    const result = await this.request('personalized/playlist', { limit: 12, total: true, n: 1000 })
    return (result.result as Playlist[]) ?? []
  }

  async newSongs(): Promise<Song[]> {
    const result = await this.request('personalized/newsong', { type: 'recommend' })
    return ((result.result as Json[]) ?? [])
      .map((item) => (item.song as Song) ?? (item as unknown as Song))
      .filter((song) => !!song?.id)
  }

  async toplists(): Promise<Playlist[]> {
    const result = await this.request('toplist/detail', {})
    const list = (result.list as Json[]) ?? []
    return list.map((item) => {
      const tracks = ((item.tracks as Json[]) ?? []).map((track, index) => {
        const artist = (track.second as string) ?? ''
        return {
          id: Number(track.id ?? item.topTrackIds?.[index] ?? index + 1),
          name: (track.name as string) ?? (track.first as string) ?? '',
          ar: (track.ar as Song['ar']) ?? (artist ? [{ id: 0, name: artist }] : []),
          al: (track.al as Song['al']) ?? undefined,
          dt: track.dt as number | undefined
        } as Song
      })
      return { ...(item as unknown as Playlist), tracks }
    })
  }
}

const netease = new MobileNetease()

function defaults(): Settings {
  return {
    quality: 'exhigh',
    volume: 0.75,
    downloadDir: DOC_LABEL,
    downloads: [],
    lyricFontSize: 22
  }
}

function readSettings(): Settings {
  try {
    return { ...defaults(), ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<Settings>) }
  } catch {
    return defaults()
  }
}

function writeSettings(next: Settings): Settings {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable
  }
  return next
}

function artistNames(song: Song): string {
  const list = song.ar ?? song.artists ?? []
  return list.map((artist) => artist.name).join(' / ') || '未知艺人'
}

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|#%]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120)
}

async function fileExists(path: string, directory: Directory): Promise<boolean> {
  try {
    await Filesystem.stat({ path, directory })
    return true
  } catch {
    return false
  }
}

async function downloadSong(song: Song, level: Quality): Promise<DownloadRecord> {
  const result = await netease.songUrl(song.id, level)
  if (!result.upstream) throw new Error('该歌曲暂无可下载音源')
  if (result.trial) throw new Error('会员歌曲仅提供试听片段，无法下载')

  const ext = (result.type || (result.upstream.includes('.flac') ? 'flac' : 'mp3')).replace(/[^a-z0-9]/gi, '')
  const base = safeName(`${artistNames(song)} - ${song.name}`)
  let file = `${base}.${ext}`
  let index = 1
  while (await fileExists(`${DOC_DIR}/${file}`, Directory.Documents)) {
    index += 1
    file = `${base} (${index}).${ext}`
  }

  let directory = Directory.Documents
  const path = `${DOC_DIR}/${file}`
  let saved: { path?: string }
  try {
    saved = await Filesystem.downloadFile({
      url: result.upstream,
      path,
      directory,
      headers: { 'User-Agent': UA, Referer: 'https://music.163.com/' },
      recursive: true
    })
  } catch {
    directory = Directory.External
    saved = await Filesystem.downloadFile({
      url: result.upstream,
      path,
      directory,
      headers: { 'User-Agent': UA, Referer: 'https://music.163.com/' },
      recursive: true
    })
  }

  let size = result.size
  let uri = `${DOC_LABEL}/${file}`
  const target = saved.path ?? path
  const absolute = target.startsWith('/')
  try {
    const info = absolute
      ? await Filesystem.stat({ path: target })
      : await Filesystem.stat({ path: target, directory })
    size = info.size
  } catch {
    // keep upstream size
  }
  if (absolute) {
    uri = encodeURI(`file://${target}`)
  } else {
    try {
      const resolved = await Filesystem.getUri({ path: target, directory })
      if (resolved.uri) uri = resolved.uri
    } catch {
      // keep display path
    }
  }

  const record: DownloadRecord = {
    id: song.id,
    name: song.name,
    artist: artistNames(song),
    album: (song.al ?? song.album)?.name ?? '',
    cover: normalizeMediaUrl((song.al ?? song.album)?.picUrl) ?? '',
    level: result.level,
    path: uri,
    size,
    createdAt: Date.now()
  }

  const current = readSettings()
  writeSettings({ ...current, downloads: [record, ...current.downloads].slice(0, 200) })
  return record
}

function chromeVersion(): string {
  const match = /Chrome\/([\d.]+)/.exec(navigator.userAgent)
  return match?.[1] ?? '—'
}

const api: NcmApi = {
  platform: 'mobile',

  auth: {
    qrCreate: () => netease.qrCreate(),
    qrCheck: (key) => netease.qrCheck(key),
    captchaSend: (phone, countryCode = '86') => netease.captchaSend(phone, countryCode),
    phoneLogin: (phone, captcha, countryCode = '86') =>
      netease.phoneLogin(phone, captcha, countryCode),
    status: async () => {
      try {
        const { profile } = await netease.account()
        if (!profile) return { loggedIn: false, profile: null, playlists: [] }
        const playlists = await netease.userPlaylists(profile.userId)
        return { loggedIn: true, profile, playlists }
      } catch {
        return { loggedIn: false, profile: null, playlists: [] }
      }
    },
    logout: async () => {
      netease.logout()
      return { ok: true }
    }
  },

  user: {
    playlists: (uid) => netease.userPlaylists(uid)
  },

  playlist: {
    detail: (id) => netease.playlistDetail(id)
  },

  song: {
    url: (id, level) => netease.songUrl(id, level),
    lyric: (id) => netease.lyric(id),
    like: (id, like) => netease.like(id, like)
  },

  comment: {
    list: (songId, offset = 0, limit = 20) => netease.comments(songId, offset, limit),
    sorted: (songId, sort, pageNo = 1, limit = 20, cursor = '') =>
      netease.sortedComments(songId, sort, pageNo, limit, cursor),
    floor: (songId, parentCommentId, limit = 50) =>
      netease.commentFloor(songId, parentCommentId, limit),
    like: (songId, commentId, like) => netease.commentLike(songId, commentId, like),
    add: (songId, content, replyTo) => netease.addComment(songId, content, replyTo),
    remove: (songId, commentId) => netease.deleteComment(songId, commentId)
  },

  search: {
    query: async (keyword, type, offset = 0): Promise<SearchResult> =>
      (await netease.search(keyword, type, offset)) as SearchResult
  },

  discover: {
    daily: () => netease.dailySongs(),
    playlists: () => netease.recommendPlaylists(),
    newsongs: () => netease.newSongs(),
    toplists: () => netease.toplists()
  },

  media: {
    warm: async (_payload: MediaWarmPayload) => undefined,
    local: async (id: number) => {
      const record = readSettings().downloads.find((item) => item.id === id && item.path.startsWith('file://'))
      if (!record) return null
      try {
        return Capacitor.convertFileSrc(record.path)
      } catch {
        return null
      }
    }
  },

  cache: {
    info: async () => ({ audio: 0, images: 0 }),
    clear: async () => undefined
  },

  settings: {
    get: async () => readSettings(),
    set: async (patch) => writeSettings({ ...readSettings(), ...patch }),
    chooseDownloadDir: async () => readSettings().downloadDir
  },

  app: {
    info: async (): Promise<AppInfo> => ({
      version: __JANMUSIC_VERSION__,
      electron: '—',
      chrome: chromeVersion(),
      node: '—'
    })
  },

  downloads: {
    add: (song, level) => downloadSong(song, level),
    openFolder: async () => readSettings().downloadDir
  },

  win: {
    minimize: () => undefined,
    toggleMaximize: async () => false,
    close: () => undefined,
    isMaximized: async () => false,
    onMaximize: () => () => undefined
  },

  events: {
    onDownloadProgress: () => () => undefined,
    onPlayerCommand: () => () => undefined
  }
}

export function installMobileBridge(): void {
  window.ncm = api
}
