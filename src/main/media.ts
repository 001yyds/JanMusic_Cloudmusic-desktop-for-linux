import { app, protocol } from 'electron'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, readdir, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import type { MediaWarmPayload } from '../shared/types'

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  mp4: 'audio/mp4',
  ogg: 'audio/ogg',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
}

const warming = new Map<string, Promise<void>>()

function cachePath(name: string): string {
  return join(app.getPath('userData'), name)
}

function mimeOf(ext: string): string {
  return MIME[ext.toLowerCase()] ?? 'application/octet-stream'
}

function withCors(headers: Record<string, string> = {}): Headers {
  const result = new Headers(headers)
  result.set('Access-Control-Allow-Origin', '*')
  return result
}

function audioFile(id: string, level: string, size: number, ext: string): { dir: string; file: string } {
  const dir = cachePath('audio-cache')
  return { dir, file: join(dir, `${id}-${level}-${size}.${ext}`) }
}

function normalizeExt(raw: string): string {
  const ext = raw.replace(/[^a-z0-9]/g, '').toLowerCase()
  return MIME[ext]?.startsWith('audio/') ? ext : 'mp3'
}

async function serveFile(request: Request, file: string, size: number, type: string): Promise<Response> {
  const range = request.headers.get('range')
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range)
    let start = match?.[1] ? Number(match[1]) : 0
    let end = match?.[2] ? Number(match[2]) : size - 1
    if (!Number.isFinite(start) || start < 0) start = 0
    if (!Number.isFinite(end) || end >= size) end = size - 1
    if (start > end) {
      return new Response(null, { status: 416, headers: withCors({ 'Content-Range': `bytes */${size}` }) })
    }
    const stream = createReadStream(file, { start, end })
    return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
      status: 206,
      headers: withCors({
        'Content-Type': type,
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes'
      })
    })
  }
  const stream = createReadStream(file)
  return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
    status: 200,
    headers: withCors({
      'Content-Type': type,
      'Content-Length': String(size),
      'Accept-Ranges': 'bytes'
    })
  })
}

async function handleAudio(request: Request, url: URL): Promise<Response> {
  const id = url.pathname.replace(/^\/+/, '') || 'unknown'
  const upstream = url.searchParams.get('u')
  if (!upstream) return new Response('missing upstream url', { status: 400 })

  const level = (url.searchParams.get('q') ?? 'exhigh').replace(/[^a-z]/g, '')
  const size = Number((url.searchParams.get('s') ?? '0').replace(/[^0-9]/g, '')) || 0
  const ext = normalizeExt(url.searchParams.get('e') ?? 'mp3')
  const { file } = audioFile(id, level, size, ext)

  try {
    const info = await stat(file)
    if (info.size > 0 && (!size || info.size === size)) {
      return serveFile(request, file, info.size, mimeOf(ext))
    }
    if (info.size > 0) await unlink(file).catch(() => undefined)
  } catch {
    // not cached yet
  }

  const headers: Record<string, string> = { 'User-Agent': UA, Referer: 'https://music.163.com/' }
  const range = request.headers.get('range')
  if (range) headers.Range = range

  const upstreamResponse = await fetch(upstream, { headers })
  if (!upstreamResponse.ok || !upstreamResponse.body) {
    return new Response(null, { status: upstreamResponse.status || 502 })
  }

  const passthrough = new Headers()
  for (const key of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const value = upstreamResponse.headers.get(key)
    if (value) passthrough.set(key, value)
  }
  if (!passthrough.has('content-type')) passthrough.set('content-type', mimeOf(ext))
  passthrough.set('Access-Control-Allow-Origin', '*')

  return new Response(upstreamResponse.body as unknown as ReadableStream, {
    status: upstreamResponse.status,
    headers: passthrough
  })
}

export async function warmAudio(payload: MediaWarmPayload): Promise<void> {
  const { id, upstream, level, size } = payload
  const ext = normalizeExt(payload.type)
  const { dir, file } = audioFile(String(id), level, size, ext)

  try {
    const info = await stat(file)
    if (info.size > 0 && (!size || info.size === size)) return
  } catch {
    // not cached yet
  }

  const existing = warming.get(file)
  if (existing) return existing

  const task = (async () => {
    await mkdir(dir, { recursive: true })
    const part = `${file}.part`
    const response = await fetch(upstream, {
      headers: { 'User-Agent': UA, Referer: 'https://music.163.com/' }
    })
    if (!response.ok || !response.body) throw new Error(`upstream ${response.status}`)

    const expected = size || Number(response.headers.get('content-length') ?? 0)
    const reader = response.body.getReader()
    const sink = createWriteStream(part)
    let written = 0

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = Buffer.from(value)
      written += chunk.byteLength
      if (!sink.write(chunk)) await once(sink, 'drain')
    }
    sink.end()
    await once(sink, 'finish')

    if (expected && written !== expected) {
      await unlink(part).catch(() => undefined)
      return
    }
    await rename(part, file)
  })()
    .catch(() => undefined)
    .finally(() => warming.delete(file))

  warming.set(file, task)
  return task
}

async function handleImage(url: URL): Promise<Response> {
  const upstream = url.searchParams.get('u')
  if (!upstream) return new Response('missing image url', { status: 400 })

  let ext = 'jpg'
  try {
    const parsed = new URL(upstream)
    const suffix = parsed.pathname.split('.').pop() ?? ''
    if (['jpg', 'jpeg', 'png', 'webp'].includes(suffix.toLowerCase())) ext = suffix.toLowerCase()
  } catch {
    // keep jpg
  }

  const dir = cachePath('image-cache')
  const hash = createHash('sha1').update(upstream).digest('hex')
  const file = join(dir, `${hash}.${ext}`)

  try {
    const buffer = await readFile(file)
    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: withCors({
        'Content-Type': mimeOf(ext),
        'Cache-Control': 'public, max-age=31536000, immutable'
      })
    })
  } catch {
    // not cached yet
  }

  const response = await fetch(upstream, { headers: { 'User-Agent': UA, Referer: 'https://music.163.com/' } })
  if (!response.ok) return new Response(null, { status: response.status || 502 })
  const buffer = Buffer.from(await response.arrayBuffer())
  const type = response.headers.get('content-type') ?? mimeOf(ext)
  void (async () => {
    try {
      await mkdir(dir, { recursive: true })
      await writeFile(file, buffer)
    } catch {
      // cache failures are not fatal
    }
  })()
  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: withCors({ 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable' })
  })
}

export async function cacheInfo(): Promise<{ audio: number; images: number }> {
  const sizeOf = async (dir: string): Promise<number> => {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      let total = 0
      for (const entry of entries) {
        if (!entry.isFile()) continue
        try {
          total += (await stat(join(dir, entry.name))).size
        } catch {
          // skip unreadable entry
        }
      }
      return total
    } catch {
      return 0
    }
  }
  return {
    audio: await sizeOf(cachePath('audio-cache')),
    images: await sizeOf(cachePath('image-cache'))
  }
}

export async function clearCache(): Promise<void> {
  await rm(cachePath('audio-cache'), { recursive: true, force: true })
  await rm(cachePath('image-cache'), { recursive: true, force: true })
}

export function registerMediaProtocol(): void {
  protocol.handle('ncm', async (request) => {
    try {
      const url = new URL(request.url)
      if (url.host === 'image') return await handleImage(url)
      return await handleAudio(request, url)
    } catch {
      return new Response('media proxy error', { status: 500 })
    }
  })
}
