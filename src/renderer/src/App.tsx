import { useEffect } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { LoginModal } from './components/LoginModal'
import { NowPlaying } from './components/NowPlaying'
import { PlayerBar } from './components/PlayerBar'
import { QueuePanel } from './components/QueuePanel'
import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { Toasts } from './components/Toasts'
import { songCover } from './lib/api'
import { rgba, useDominantColor } from './lib/color'
import { DailyPage } from './pages/DailyPage'
import { DownloadsPage } from './pages/DownloadsPage'
import { Home } from './pages/Home'
import { Library } from './pages/Library'
import { PlaylistPage } from './pages/PlaylistPage'
import { SearchPage } from './pages/SearchPage'
import { SettingsPage } from './pages/SettingsPage'
import { useAuthStore } from './store/auth'
import { useContentStore } from './store/content'
import { useLikesStore } from './store/likes'
import { restorePlayer, usePlayerStore } from './store/player'
import { useSettingsStore } from './store/settings'
import { useUiStore } from './store/ui'

function Ambient(): React.JSX.Element {
  const current = usePlayerStore((state) => state.current)
  const color = useDominantColor(songCover(current ?? undefined, 300))
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="liquid-blob liquid-blob-a -left-[18%] -top-[32%] h-[72vh] w-[66vw] transition-[background] duration-1000"
        style={{ background: `radial-gradient(circle, ${rgba(color, 0.68)} 0%, transparent 68%)` }}
      />
      <div
        className="liquid-blob liquid-blob-b -bottom-[36%] -right-[18%] h-[70vh] w-[58vw]"
        style={{ background: 'radial-gradient(circle, rgba(255, 35, 95, 0.55) 0%, transparent 68%)' }}
      />
      <div
        className="liquid-blob liquid-blob-a left-[24%] top-[0%] h-[48vh] w-[40vw]"
        style={{ background: 'radial-gradient(circle, rgba(84, 112, 255, 0.48) 0%, transparent 70%)' }}
      />
      <div
        className="liquid-blob liquid-blob-b bottom-[4%] left-[4%] h-[52vh] w-[44vw]"
        style={{ background: 'radial-gradient(circle, rgba(64, 201, 255, 0.42) 0%, transparent 70%)' }}
      />
      <div
        className="liquid-blob liquid-blob-a right-[8%] top-[16%] h-[42vh] w-[36vw]"
        style={{ background: 'radial-gradient(circle, rgba(255, 178, 104, 0.4) 0%, transparent 70%)' }}
      />
    </div>
  )
}

export default function App(): React.JSX.Element {
  const route = useUiStore((state) => state.route)
  const navigate = useUiStore((state) => state.navigate)

  useEffect(() => {
    restorePlayer()
    void (async () => {
      await useSettingsStore.getState().load()
      const settings = useSettingsStore.getState().settings
      if (settings) {
        usePlayerStore.setState({ volume: settings.volume, quality: settings.quality })
      }
      await useAuthStore.getState().init()
      void useLikesStore.getState().load()
      void useContentStore.getState().load()
    })()
  }, [])

  useEffect(() => {
    return window.ncm.events.onPlayerCommand((command) => {
      const player = usePlayerStore.getState()
      if (command === 'toggle') player.toggle()
      else if (command === 'next') player.next()
      else if (command === 'previous') player.previous()
    })
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      if (typing) {
        if (event.key === 'Escape') target.blur()
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        navigate({ page: 'search' })
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        usePlayerStore.getState().toggle()
      } else if (event.key === 'Escape') {
        useUiStore.getState().setNowPlaying(false)
        useUiStore.getState().setLoginOpen(false)
      } else if (event.key === 'ArrowRight' && event.altKey) {
        usePlayerStore.getState().next()
      } else if (event.key === 'ArrowLeft' && event.altKey) {
        usePlayerStore.getState().previous()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  const pageKey = route.page === 'playlist' ? `playlist-${route.id}` : route.page

  const renderPage = (): React.JSX.Element => {
    switch (route.page) {
      case 'library':
        return <Library />
      case 'playlist':
        return <PlaylistPage id={route.id} />
      case 'search':
        return <SearchPage initialKeyword={route.keyword} />
      case 'downloads':
        return <DownloadsPage />
      case 'daily':
        return <DailyPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <Home />
    }
  }

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
    >
      <div className="app-shell relative flex h-full flex-col overflow-hidden">
        <Ambient />
        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <TitleBar />
          <div className="relative flex min-h-0 flex-1">
            <Sidebar />
            <main className="relative min-w-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={pageKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full overflow-y-auto"
                >
                  {renderPage()}
                </motion.div>
              </AnimatePresence>
            </main>
            <QueuePanel />
          </div>
          <PlayerBar />
        </div>
        <NowPlaying />
        <LoginModal />
        <Toasts />
      </div>
    </MotionConfig>
  )
}
