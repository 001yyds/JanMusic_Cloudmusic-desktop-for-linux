import { spawn, type ChildProcess } from 'node:child_process'
import { appendFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { app } from 'electron'

export interface DesktopLyricState {
  current: string
  secondary?: string
  playing?: boolean
}

const CONFIG_DIR = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'BetterNCM')
const LOG_PATH = join(CONFIG_DIR, 'desktop-lyrics.log')

let child: ChildProcess | null = null
let starting = false
let stopping = false
let unavailable = false

function log(message: string): void {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true })
    appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${message}\n`)
  } catch {
    // 日志写不进去就算了
  }
}

function scriptPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'lyrics-overlay.py')
    : join(app.getAppPath(), 'resources', 'lyrics-overlay.py')
}

function send(payload: Record<string, unknown>): void {
  if (!child?.stdin?.writable) return
  child.stdin.write(`${JSON.stringify(payload)}\n`)
}

/**
 * 启动桌面歌词覆盖层。
 * Wayland 下走 gtk-layer-shell（niri / KWin Plasma 6）；非 Wayland 会话没有 layer-shell，
 * 这里直接跳过，由渲染层提示该功能仅支持 Wayland。
 */
export function startDesktopLyrics(): boolean {
  if (child) return true
  if (starting) return false
  if (unavailable) return false
  if (process.platform !== 'linux') return false
  if (!process.env.WAYLAND_DISPLAY) {
    log('skip: not a Wayland session')
    unavailable = true
    return false
  }
  starting = true
  try {
    const proc = spawn('python3', [scriptPath()], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    })
    proc.stdout?.on('data', (chunk: Buffer) => log(`stdout: ${chunk.toString().trim()}`))
    proc.stderr?.on('data', (chunk: Buffer) => log(`stderr: ${chunk.toString().trim()}`))
    proc.on('error', (error) => {
      log(`spawn error: ${error.message}`)
      child = null
      starting = false
      unavailable = true
    })
    proc.on('exit', (code, signal) => {
      log(`exit code=${code} signal=${signal}`)
      child = null
      starting = false
      if (!stopping) unavailable = true
      stopping = false
    })
    child = proc
    starting = false
    log(`started: ${scriptPath()}`)
    return true
  } catch (error) {
    log(`failed: ${error instanceof Error ? error.message : String(error)}`)
    starting = false
    return false
  }
}

export function updateDesktopLyrics(state: DesktopLyricState): void {
  if (!child && !startDesktopLyrics()) return
  send({
    cmd: 'state',
    current: state.current,
    secondary: state.secondary ?? '',
    playing: state.playing ?? true
  })
}

export function setDesktopLyricsVisible(visible: boolean): void {
  if (!visible) {
    send({ cmd: 'hide' })
    return
  }
  if (!child && !startDesktopLyrics()) return
  send({ cmd: 'show' })
}

export function setDesktopLyricsLocked(locked: boolean): void {
  if (!child && !startDesktopLyrics()) return
  send({ cmd: 'lock', value: locked })
}

export function setDesktopLyricsFont(size: number): void {
  if (!child && !startDesktopLyrics()) return
  send({ cmd: 'theme', font: size })
}

export function stopDesktopLyrics(): void {
  if (!child) return
  stopping = true
  try {
    child.stdin?.write(`${JSON.stringify({ cmd: 'quit' })}\n`)
  } catch {
    // ignore
  }
  const proc = child
  child = null
  setTimeout(() => {
    if (!proc.killed) proc.kill('SIGTERM')
  }, 400).unref?.()
}
