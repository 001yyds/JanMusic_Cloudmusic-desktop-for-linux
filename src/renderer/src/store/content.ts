import { create } from 'zustand'
import type { Playlist, Song } from '../../../shared/types'
import { api } from '../lib/api'

interface ContentState {
  daily: Song[]
  playlists: Playlist[]
  newsongs: Song[]
  toplists: Playlist[]
  loading: boolean
  loaded: boolean
  load: (force?: boolean) => Promise<void>
}

export const useContentStore = create<ContentState>((set, get) => ({
  daily: [],
  playlists: [],
  newsongs: [],
  toplists: [],
  loading: false,
  loaded: false,
  load: async (force = false) => {
    if (get().loading) return
    if (get().loaded && !force) return
    set({ loading: true })
    const [daily, playlists, newsongs, toplists] = await Promise.allSettled([
      api.discover.daily(),
      api.discover.playlists(),
      api.discover.newsongs(),
      api.discover.toplists()
    ])
    set({
      daily: daily.status === 'fulfilled' ? daily.value : get().daily,
      playlists: playlists.status === 'fulfilled' ? playlists.value : get().playlists,
      newsongs: newsongs.status === 'fulfilled' ? newsongs.value : get().newsongs,
      toplists: toplists.status === 'fulfilled' ? toplists.value : get().toplists,
      loading: false,
      loaded: true
    })
  }
}))
