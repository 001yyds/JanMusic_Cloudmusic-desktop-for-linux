import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Ambient } from '../components/Ambient'
import { LoginModal } from '../components/LoginModal'
import { NowPlaying } from '../components/NowPlaying'
import { PageRouter } from '../components/PageRouter'
import { Toasts } from '../components/Toasts'
import { useAppBootstrap } from '../lib/bootstrap'
import { useUiStore } from '../store/ui'
import { MobileHeader } from './MobileHeader'
import { MobileNav } from './MobileNav'
import { MobilePlayer } from './MobilePlayer'
import { MobileQueue } from './MobileQueue'

export function MobileApp(): React.JSX.Element {
  const route = useUiStore((state) => state.route)
  const mainRef = useRef<HTMLElement>(null)
  const pageKey = route.page === 'playlist' ? `playlist-${route.id}` : route.page

  useAppBootstrap()

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [pageKey])

  useEffect(() => {
    let remove: (() => void) | undefined
    void import('@capacitor/app')
      .then(async ({ App }) => {
        const handle = await App.addListener('backButton', () => {
          const ui = useUiStore.getState()
          if (ui.loginOpen) {
            ui.setLoginOpen(false)
            return
          }
          if (ui.commentsFor) {
            ui.closeComments()
            return
          }
          if (ui.queueOpen) {
            ui.setQueueOpen(false)
            return
          }
          if (ui.nowPlaying) {
            ui.setNowPlaying(false)
            return
          }
          if (ui.canGoBack) {
            ui.back()
            return
          }
          void App.exitApp()
        })
        remove = () => void handle.remove()
      })
      .catch(() => undefined)
    return () => remove?.()
  }, [])

  return (
    <div className="app-shell relative flex h-full flex-col overflow-hidden">
      <Ambient />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <MobileHeader />
        <main ref={mainRef} className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pageKey}
              initial={{ y: 8 }}
              animate={{ y: 0 }}
              exit={{ y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-full pb-[168px]"
            >
              <PageRouter route={route} />
            </motion.div>
          </AnimatePresence>
        </main>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
          <div className="pointer-events-auto">
            <MobilePlayer />
          </div>
          <div className="pointer-events-auto">
            <MobileNav />
          </div>
        </div>
      </div>
      <MobileQueue />
      <NowPlaying />
      <LoginModal />
      <Toasts />
    </div>
  )
}
