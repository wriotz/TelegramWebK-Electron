const { app, BrowserWindow, Tray, Menu, Notification, globalShortcut, session, ipcMain, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow = null
let tray = null
let isAlwaysOnTop = false
let isQuitting = false


const stateFile = path.join(app.getPath('userData'), 'window-state.json')

function loadWindowState() {
  try {
    const data = fs.readFileSync(stateFile, 'utf8')
    return JSON.parse(data)
  } catch {
    return { width: 1200, height: 800, x: undefined, y: undefined }
  }
}

function saveWindowState() {
  if (!mainWindow) return
  try {
    const bounds = mainWindow.getBounds()
    fs.writeFileSync(stateFile, JSON.stringify(bounds), 'utf8')
  } catch (e) {
    console.error('Не удалось сохранить состояние окна:', e)
  }
}


function createWindow() {
  const saved = loadWindowState()

  mainWindow = new BrowserWindow({
    width: saved.width || 1200,
    height: saved.height || 800,
    x: saved.x,
    y: saved.y,
    title: 'Telegram Web K',
    icon: path.join(__dirname, 'icon.png'),
    frame: false,                       
    titleBarStyle: 'hidden',            
    trafficLightPosition: { x: 12, y: 12 }, 
    backgroundColor: '#17212b',          
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

  mainWindow.loadURL('https://web.telegram.org/k/')

  Menu.setApplicationMenu(null)

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      saveWindowState()
      mainWindow.hide()
    }
  })

  let saveTimer = null
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(saveWindowState, 500)
  }
  mainWindow.on('resize', scheduleSave)
  mainWindow.on('move', scheduleSave)


  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized', false)
  })
}


ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.on('window-maximize-toggle', () => {
  if (!mainWindow) return
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow.maximize()
  }
})

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close()
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false
})


function createTray() {
  const iconPath = path.join(__dirname, 'icon.png')
  const trayIcon = nativeImage.createFromPath(iconPath)

  tray = new Tray(trayIcon)
  tray.setToolTip('Telegram Electron')

  updateTrayMenu()
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Показать окно',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: 'Скрыть окно',
      click: () => {
        if (mainWindow) mainWindow.hide()
      }
    },
    { type: 'separator' },
    {
      label: 'Поверх всех окон',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: (item) => {
        isAlwaysOnTop = item.checked
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(isAlwaysOnTop, 'floating')
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Очистить кэш и перезагрузить',
      click: async () => {
        if (mainWindow) {
          await session.defaultSession.clearStorageData()
          mainWindow.reload()
        }
      }
    },
    {
      label: 'Выход',
      click: () => {
        isQuitting = true
        saveWindowState()
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}


function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (mainWindow) mainWindow.hide()
  })
}


ipcMain.on('show-notification', (event, data) => {
  if (!Notification.isSupported()) return

  const notif = new Notification({
    title: data.title || 'Telegram',
    body: data.body || '',
    icon: data.icon || path.join(__dirname, 'icon.png'),
    silent: false
  })

  notif.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  notif.show()
})


app.whenReady().then(() => {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  session.defaultSession.setUserAgent(userAgent)

  if (process.platform === 'win32') {
    app.setAppUserModelId(process.execPath)
  }

  createWindow()
  createTray()
  registerShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else if (mainWindow) {
      mainWindow.show()
    }
  })
})

app.on('window-all-closed', () => {

})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})