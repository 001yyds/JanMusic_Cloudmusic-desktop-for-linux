import { create } from 'zustand'
import type { Playlist, Profile } from '../../../shared/types'
import { api } from '../lib/api'

interface AuthState {
  ready: boolean
  loggedIn: boolean
  profile: Profile | null
  playlists: Playlist[]
  loading: boolean
  init: () => Promise<void>
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  ready: false,
  loggedIn: false,
  profile: null,
  playlists: [],
  loading: false,
  init: async () => {
    try {
      const status = await api.auth.status()
      set({
        ready: true,
        loggedIn: status.loggedIn,
        profile: status.profile,
        playlists: status.playlists ?? []
      })
    } catch {
      set({ ready: true })
    }
  },
  refresh: async () => {
    set({ loading: true })
    try {
      const status = await api.auth.status()
      set({
        loggedIn: status.loggedIn,
        profile: status.profile,
        playlists: status.playlists ?? [],
        loading: false,
        ready: true
      })
    } catch {
      set({ loading: false, ready: true })
    }
  },
  logout: async () => {
    await api.auth.logout()
    set({ loggedIn: false, profile: null, playlists: [] })
  }
}))
