import { useEffect } from 'react'
import { useAuthStore } from '../store/auth'
import { useContentStore } from '../store/content'
import { useLikesStore } from '../store/likes'
import { restorePlayer, usePlayerStore } from '../store/player'
import { useSettingsStore } from '../store/settings'

export function useAppBootstrap(): void {
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
}
