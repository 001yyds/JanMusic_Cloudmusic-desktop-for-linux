import { clearCookies, loadCookies, saveCookies } from '../store'
import type { LyricResult, Playlist, Profile, Quality, Song, SongUrlResult } from '../../shared/types'
import { encodeWeapi } from './crypto'

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

type Json = Record<string, any>

class NeteaseClient {
  private cookies = new Map<string, string>()
  private loaded = false
  private dirty = false

  private ensure(): void {
    if (this.loaded) return
    this.loaded = true
    for (const [key, value] of Object.entries(loadCookies())) this.cookies.set(key, value)
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

  private absorb(response: Response): void {
    const list = response.headers.getSetCookie?.() ?? []
    for (const line of list) {
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
    saveCookies(Object.fromEntries(this.cookies))
  }

  private async request<T = Json>(path: string, payload: Json = {}): Promise<T> {
    this.ensure()
    const response = await fetch(`https://music.163.com/weapi/${path}`, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: 'https://music.163.com',
        Origin: 'https://music.163.com',
        Cookie: this.cookieHeader()
      },
      body: encodeWeapi(payload)
    })
    this.absorb(response)
    this.persist()
    const text = await response.text()
    try {
      return JSON.parse(text) as T
    } catch {
      throw new Error(`接口返回异常 (${response.status})`)
    }
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

  async account(): Promise<{ profile: Profile | null; account: Json | null }> {
    if (!this.isLoggedIn()) return { profile: null, account: null }
    const result = await this.request('w/nuser/account/get', {})
    return { profile: (result.profile as Profile) ?? null, account: result.account ?? null }
  }

  logout(): void {
    this.cookies.clear()
    clearCookies()
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
      const candidate: SongUrlResult = {
        id,
        url: item.url,
        upstream: item.url,
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
    await this.request('radio/like', {
      trackId: id,
      like,
      time: 25,
      csrf_token: this.cookies.get('__csrf') ?? ''
    })
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
    return (result.list as Playlist[]) ?? []
  }
}

export const netease = new NeteaseClient()
