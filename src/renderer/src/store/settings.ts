import { create } from 'zustand'
import type { DownloadRecord, Settings } from '../../../shared/types'
import { api } from '../lib/api'

interface SettingsState {
  settings: Settings | null
  load: () => Promise<void>
  patch: (patch: Partial<Settings>) => Promise<void>
  refreshDownloads: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  load: async () => {
    const settings = await api.settings.get()
    set({ settings })
  },
  patch: async (patch) => {
    const settings = await api.settings.set(patch)
    set({ settings })
  },
  refreshDownloads: async () => {
    const settings = await api.settings.get()
    set({ settings })
  }
}))

export function downloadList(): DownloadRecord[] {
  return useSettingsStore.getState().settings?.downloads ?? []
}
