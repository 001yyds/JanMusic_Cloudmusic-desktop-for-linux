import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { once } from 'node:events'
import { createWriteStream } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { DownloadRecord, MediaWarmPayload, Quality, Settings, Song } from '../shared/types'
import { netease } from './netease/client'
import { cacheInfo, clearCache, warmAudio } from './media'
import { addDownload, getSettings, updateSettings } from './store'

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function artistsOf(song: Song): string {
  const list = song.ar ?? song.artists ?? []
  return list.map((artist) => artist.name).join(' / ') || '未知艺人'
}

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120)
}

async function uniquePath(dir: string, base: string, ext: string): Promise<string> {
  let candidate = join(dir, `${base}.${ext}`)
  let index = 1
  for (;;) {
    try {
      await stat(candidate)
      index += 1
      candidate = join(dir, `${base} (${index}).${ext}`)
    } catch {
      return candidate
    }
  }
}

async function downloadSong(sender: Electron.WebContents, song: Song, level: Quality): Promise<DownloadRecord> {
  const result = await netease.songUrl(song.id, level)
  if (!result.upstream) throw new Error('该歌曲暂无可下载音源')
  if (result.trial) throw new Error('会员歌曲仅提供试听片段，无法下载')

  const ext = result.type || (result.upstream.includes('.flac') ? 'flac' : 'mp3')
  const dir = getSettings().downloadDir
  await mkdir(dir, { recursive: true })
  const target = await uniquePath(dir, safeName(`${artistsOf(song)} - ${song.name}`), ext)

  const response = await fetch(result.upstream, {
    headers: { 'User-Agent': UA, Referer: 'https://music.163.com/' }
  })
  if (!response.ok || !response.body) throw new Error('下载失败，来源无响应')

  const total = Number(response.headers.get('content-length') ?? 0)
  const reader = response.body.getReader()
  const sink = createWriteStream(target)
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = Buffer.from(value)
    received += chunk.byteLength
    if (!sink.write(chunk)) await once(sink, 'drain')
    if (total) sender.send('download:progress', { id: song.id, received, total })
  }
  sink.end()
  await once(sink, 'finish')

  const record: DownloadRecord = {
    id: song.id,
    name: song.name,
    artist: artistsOf(song),
    album: (song.al ?? song.album)?.name ?? '',
    cover: (song.al ?? song.album)?.picUrl ?? '',
    level: result.level,
    path: target,
    size: received,
    createdAt: Date.now()
  }
  addDownload(record)
  return record
}

export function registerIpc(): void {
  ipcMain.handle('auth:qr:create', () => netease.qrCreate())
  ipcMain.handle('auth:qr:check', (_event, key: string) => netease.qrCheck(key))
  ipcMain.handle('auth:status', async () => {
    const { profile } = await netease.account()
    if (!profile) return { loggedIn: false, profile: null, playlists: [] }
    const playlists = await netease.userPlaylists(profile.userId)
    return { loggedIn: true, profile, playlists }
  })
  ipcMain.handle('auth:logout', () => {
    netease.logout()
    return { ok: true }
  })

  ipcMain.handle('user:playlists', async (_event, uid: number) => netease.userPlaylists(uid))
  ipcMain.handle('playlist:detail', (_event, id: number) => netease.playlistDetail(id))
  ipcMain.handle('song:url', (_event, id: number, level: Quality) => netease.songUrl(id, level))
  ipcMain.handle('song:lyric', (_event, id: number) => netease.lyric(id))
  ipcMain.handle('song:like', (_event, id: number, like: boolean) => netease.like(id, like))
  ipcMain.handle('comment:list', (_event, songId: number, offset = 0, limit = 20) =>
    netease.comments(songId, offset, limit)
  )
  ipcMain.handle(
    'comment:sorted',
    (_event, songId: number, sort: 99 | 2 | 3, pageNo = 1, limit = 20, cursor = '') =>
      netease.sortedComments(songId, sort, pageNo, limit, cursor)
  )
  ipcMain.handle('comment:floor', (_event, songId: number, parentCommentId: number, limit = 50) =>
    netease.commentFloor(songId, parentCommentId, limit)
  )
  ipcMain.handle('comment:like', (_event, songId: number, commentId: number, like: boolean) =>
    netease.commentLike(songId, commentId, like)
  )
  ipcMain.handle('comment:add', (_event, songId: number, content: string, replyTo?: number) =>
    netease.addComment(songId, content, replyTo)
  )
  ipcMain.handle('comment:remove', (_event, songId: number, commentId: number) =>
    netease.deleteComment(songId, commentId)
  )
  ipcMain.handle('search:query', (_event, keyword: string, type: 1 | 1000 | 100, offset = 0) =>
    netease.search(keyword, type, offset)
  )
  ipcMain.handle('discover:daily', () => netease.dailySongs())
  ipcMain.handle('discover:playlists', () => netease.recommendPlaylists())
  ipcMain.handle('discover:newsongs', () => netease.newSongs())
  ipcMain.handle('discover:toplists', () => netease.toplists())

  ipcMain.handle('media:warm', (_event, payload: MediaWarmPayload) => warmAudio(payload))
  ipcMain.handle('cache:info', () => cacheInfo())
  ipcMain.handle('cache:clear', () => clearCache())
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_event, patch: Partial<Settings>) => updateSettings(patch))
  ipcMain.handle('settings:choose-download-dir', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
      title: '选择下载目录',
      defaultPath: getSettings().downloadDir,
      properties: ['openDirectory', 'createDirectory']
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return getSettings().downloadDir
    return updateSettings({ downloadDir: result.filePaths[0] }).downloadDir
  })
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }))

  ipcMain.handle('download:add', async (event, song: Song, level: Quality) =>
    downloadSong(event.sender, song, level)
  )
  ipcMain.handle('download:open-folder', async () => {
    const dir = getSettings().downloadDir
    await mkdir(dir, { recursive: true })
    await shell.openPath(dir)
    return dir
  })

  ipcMain.handle('win:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.handle('win:toggle-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return false
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
    return win.isMaximized()
  })
  ipcMain.handle('win:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
  ipcMain.handle('win:is-maximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })
}
