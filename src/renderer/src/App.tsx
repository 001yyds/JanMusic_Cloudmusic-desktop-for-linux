import { useEffect } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { Ambient } from './components/Ambient'
import { CommentsPanel } from './components/CommentsPanel'
import { LoginModal } from './components/LoginModal'
import { NowPlaying } from './components/NowPlaying'
import { PageRouter } from './components/PageRouter'
import { PlayerBar } from './components/PlayerBar'
import { QueuePanel } from './components/QueuePanel'
import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { Toasts } from './components/Toasts'
import { useAppBootstrap } from './lib/bootstrap'
import { useGlassPointer } from './lib/liquidGlass'
import { isMobile } from './lib/platform'
import { MobileApp } from './mobile/MobileApp'
import { usePlayerStore } from './store/player'
import { useUiStore } from './store/ui'

function DesktopApp(): React.JSX.Element {
  const route = useUiStore((state) => state.route)
  const navigate = useUiStore((state) => state.navigate)

  useAppBootstrap()

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
        if (useUiStore.getState().commentsFor) {
          useUiStore.getState().closeComments()
          return
        }
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

  return (
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
                initial={{ y: 10 }}
                animate={{ y: 0 }}
                exit={{ y: -6 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="h-full overflow-y-auto"
              >
                <PageRouter route={route} />
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
  )
}

export default function App(): React.JSX.Element {
  useGlassPointer()

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
    >
      {isMobile() ? <MobileApp /> : <DesktopApp />}
      <CommentsPanel />
    </MotionConfig>
  )
}
