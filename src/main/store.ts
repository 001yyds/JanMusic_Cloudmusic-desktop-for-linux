import { app, safeStorage } from 'electron'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DownloadRecord, Quality, Settings } from '../shared/types'

function settingsFile(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function sessionFile(): string {
  return join(app.getPath('userData'), 'session.bin')
}

function defaults(): Settings {
  return {
    quality: 'exhigh',
    volume: 0.75,
    downloadDir: join(app.getPath('music'), 'JanMusic'),
    downloads: [],
    lyricFontSize: 22
  }
}

let cached: Settings | null = null

export function getSettings(): Settings {
  if (cached) return cached
  try {
    cached = { ...defaults(), ...(JSON.parse(readFileSync(settingsFile(), 'utf8')) as Partial<Settings>) }
  } catch {
    cached = defaults()
  }
  return cached
}

export function updateSettings(patch: Partial<Settings>): Settings {
  cached = { ...getSettings(), ...patch }
  mkdirSync(app.getPath('userData'), { recursive: true })
  writeFileSync(settingsFile(), JSON.stringify(cached, null, 2))
  return cached
}

export function addDownload(record: DownloadRecord): void {
  const current = getSettings()
  updateSettings({ downloads: [record, ...current.downloads].slice(0, 200) })
}

export function loadCookies(): Record<string, string> {
  try {
    const raw = readFileSync(sessionFile())
    if (raw.subarray(0, 4).toString() === 'PLN1') return JSON.parse(raw.subarray(4).toString('utf8'))
    if (raw.subarray(0, 4).toString() === 'ENV1' && safeStorage.isEncryptionAvailable()) {
      return JSON.parse(safeStorage.decryptString(raw.subarray(4)))
    }
  } catch {
    return {}
  }
  return {}
}

export function saveCookies(cookies: Record<string, string>): void {
  mkdirSync(app.getPath('userData'), { recursive: true })
  const json = JSON.stringify(cookies)
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(sessionFile(), Buffer.concat([Buffer.from('ENV1'), safeStorage.encryptString(json)]))
  } else {
    writeFileSync(sessionFile(), Buffer.concat([Buffer.from('PLN1'), Buffer.from(json, 'utf8')]))
  }
}

export function clearCookies(): void {
  saveCookies({})
}

export const QUALITY_LABEL: Record<Quality, string> = {
  standard: '标准',
  higher: '较高',
  exhigh: '极高',
  lossless: '无损',
  hires: 'Hi-Res'
}
