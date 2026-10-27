import { create } from 'zustand'
import type { Song } from '../../../shared/types'
import { api } from '../lib/api'
import { invalidatePlaylist } from '../lib/playlistCache'
import { useAuthStore } from './auth'
import { useUiStore } from './ui'

interface LikesState {
  liked: Set<number>
  loaded: boolean
  loading: boolean
  load: (force?: boolean) => Promise<void>
  isLiked: (id: number) => boolean
  toggle: (song: Song) => Promise<void>
}

export const useLikesStore = create<LikesState>((set, get) => ({
  liked: new Set<number>(),
  loaded: false,
  loading: false,
  load: async (force = false) => {
    const { loggedIn, playlists } = useAuthStore.getState()
    if (!loggedIn) return
    if (get().loaded && !force) return
    if (get().loading) return
    const target =
      playlists.find((playlist) => playlist.specialType === 5) ??
      playlists.find((playlist) => playlist.name.includes('喜欢的音乐'))
    if (!target) return
    set({ loading: true })
    try {
      const detail = await api.playlist.detail(target.id)
      set({
        liked: new Set((detail?.tracks ?? []).map((song) => song.id)),
        loaded: true,
        loading: false
      })
    } catch {
      set({ loading: false })
    }
  },
  isLiked: (id) => get().liked.has(id),
  toggle: async (song) => {
    if (!useAuthStore.getState().loggedIn) {
      useUiStore.getState().setLoginOpen(true)
      return
    }
    const { playlists } = useAuthStore.getState()
    const target =
      playlists.find((playlist) => playlist.specialType === 5) ??
      playlists.find((playlist) => playlist.name.includes('喜欢的音乐'))
    const before = get().liked
    const liked = new Set(before)
    const next = !liked.has(song.id)
    if (next) liked.add(song.id)
    else liked.delete(song.id)
    set({ liked })
    try {
      await api.song.like(song.id, next)
      if (target) {
        invalidatePlaylist(target.id)
        useAuthStore.setState((state) => ({
          playlists: state.playlists.map((playlist) =>
            playlist.id === target.id && playlist.trackCount != null
              ? { ...playlist, trackCount: Math.max(0, playlist.trackCount + (next ? 1 : -1)) }
              : playlist
          )
        }))
      }
      useUiStore.getState().toast(next ? '已添加到我喜欢' : '已取消喜欢', 'success')
    } catch (error) {
      set({ liked: before })
      useUiStore.getState().toast(error instanceof Error ? error.message : '操作失败，请重试', 'error')
    }
  }
}))
