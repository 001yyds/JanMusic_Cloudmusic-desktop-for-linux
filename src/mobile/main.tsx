import './install'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import App from '../renderer/src/App'
import '../renderer/src/index.css'

if (Capacitor.isNativePlatform()) {
  void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined)
  void StatusBar.setStyle({ style: Style.Light }).catch(() => undefined)
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

requestAnimationFrame(() => {
  if (Capacitor.isNativePlatform()) {
    void SplashScreen.hide({ fadeOutDuration: 260 }).catch(() => undefined)
  }
})
