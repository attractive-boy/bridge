const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')



function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
      webSecurity: false
    },
    frame: false,
    autoHideMenuBar: true, 
    titleBarStyle: 'hidden',
    resizable: true,
    minWidth: 800,
    minHeight: 600
  })

  // 加载 index.html
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000')
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }

  // 启用开发者工具
  // win.webContents.openDevTools()

  // 处理窗口控制事件
  ipcMain.on('window-minimize', () => {
    win.minimize()
  })

  ipcMain.on('window-maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.on('window-close', () => {
    win.close()
  })

  // 添加快捷键
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      win.webContents.toggleDevTools()
      event.preventDefault()
    }
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}) 