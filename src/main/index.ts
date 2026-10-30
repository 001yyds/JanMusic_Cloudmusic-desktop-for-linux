import { app, BrowserWindow, globalShortcut, Menu, protocol, shell } from 'electron'
import { stopDesktopLyrics } from './desktopLyrics'
import { join } from 'node:path'
import { registerIpc } from './ipc'
import { registerMediaProtocol } from './media'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'ncm',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
      corsEnabled: true
    }
  }
])

app.setName('BetterNCM')
app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
app.commandLine.appendSwitch('enable-features', 'WaylandWindowDecorations,GlobalShortcutsPortal')

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 820,
    minHeight: 640,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.on('maximize', () => mainWindow?.webContents.send('win:maximized', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('win:maximized', false))
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  // 应用只应停留在自己的页面上，任何外部导航一律拦下
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env.ELECTRON_RENDERER_URL
    const allowed = devUrl ? url.startsWith(devUrl) : url.startsWith('file://')
    if (!allowed) event.preventDefault()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const locked = app.requestSingleInstanceLock()

if (!locked) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    registerMediaProtocol()
    registerIpc()
    createWindow()

    const forward = (command: string) => (): void => {
      mainWindow?.webContents.send('player:command', command)
    }
    globalShortcut.register('MediaPlayPause', forward('toggle'))
    globalShortcut.register('MediaNextTrack', forward('next'))
    globalShortcut.register('MediaPreviousTrack', forward('previous'))

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopDesktopLyrics()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
