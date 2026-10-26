import { create } from 'zustand'

export type Route =
  | { page: 'home' }
  | { page: 'library' }
  | { page: 'playlist'; id: number; title?: string }
  | { page: 'search'; keyword?: string }
  | { page: 'downloads' }
  | { page: 'daily' }
  | { page: 'settings' }

export interface Toast {
  id: number
  message: string
  kind: 'info' | 'error' | 'success'
}

interface UiState {
  route: Route
  history: Route[]
  navigate: (route: Route) => void
  navigateRoot: (route: Route) => void
  back: () => void
  canGoBack: boolean
  queueOpen: boolean
  setQueueOpen: (open: boolean) => void
  nowPlaying: boolean
  setNowPlaying: (open: boolean) => void
  lyricsOpen: boolean
  setLyricsOpen: (open: boolean) => void
  loginOpen: boolean
  setLoginOpen: (open: boolean) => void
  toasts: Toast[]
  toast: (message: string, kind?: Toast['kind']) => void
  dismissToast: (id: number) => void
}

let toastSequence = 0

export const useUiStore = create<UiState>((set, get) => ({
  route: { page: 'home' },
  history: [],
  canGoBack: false,
  navigate: (route) => {
    if (JSON.stringify(get().route) === JSON.stringify(route)) return
    const history = [...get().history, get().route].slice(-40)
    set({ route, history, canGoBack: history.length > 0 })
  },
  navigateRoot: (route) => {
    if (JSON.stringify(get().route) === JSON.stringify(route)) return
    set({ route, history: [], canGoBack: false })
  },
  back: () => {
    const history = [...get().history]
    const previous = history.pop()
    if (!previous) return
    set({ route: previous, history, canGoBack: history.length > 0 })
  },
  queueOpen: false,
  setQueueOpen: (queueOpen) => set({ queueOpen }),
  nowPlaying: false,
  setNowPlaying: (nowPlaying) => set({ nowPlaying, ...(nowPlaying ? {} : { lyricsOpen: false }) }),
  lyricsOpen: false,
  setLyricsOpen: (lyricsOpen) => set({ lyricsOpen }),
  loginOpen: false,
  setLoginOpen: (loginOpen) => set({ loginOpen }),
  toasts: [],
  toast: (message, kind = 'info') => {
    const id = (toastSequence += 1)
    set({ toasts: [...get().toasts, { id, message, kind }] })
    window.setTimeout(() => {
      set({ toasts: get().toasts.filter((toast) => toast.id !== id) })
    }, 3200)
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) })
}))
