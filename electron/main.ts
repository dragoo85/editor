import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function resolvePreloadPath(): string {
  const localDistPreload = path.join(__dirname, 'preload.js');
  if (fs.existsSync(localDistPreload)) {
    return localDistPreload;
  }
  const appDistPreload = path.join(app.getAppPath(), 'dist-electron', 'preload.js');
  if (fs.existsSync(appDistPreload)) {
    return appDistPreload;
  }
  return localDistPreload;
}

function createWindow() {
  const preloadPath = resolvePreloadPath();
  console.log('[Lumina Main] Creating window with preload:', preloadPath);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0b0d',
    show: true,
    title: 'Lumina Photo Studio',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      sandbox: false
    }
  });

  mainWindow.show();
  mainWindow.focus();

  // State synchronization events
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-change', false);
  });

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error('[Lumina Main] Renderer failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('render-process-gone', (_, details) => {
    console.error('[Lumina Main] Renderer process gone:', details.reason, details.exitCode);
  });

  // Load URL in dev or file in production
  if (process.env.VITE_DEV_SERVER_URL) {
    console.log('[Lumina Main] Loading dev server URL:', process.env.VITE_DEV_SERVER_URL);
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const localIndex = path.join(__dirname, '../dist/index.html');
    const appIndex = path.join(app.getAppPath(), 'dist/index.html');

    if (fs.existsSync(localIndex)) {
      console.log('[Lumina Main] Loading local index.html:', localIndex);
      mainWindow.loadFile(localIndex);
    } else if (fs.existsSync(appIndex)) {
      console.log('[Lumina Main] Loading app index.html:', appIndex);
      mainWindow.loadFile(appIndex);
    } else {
      console.error('[Lumina Main] index.html not found! Checked:', localIndex, appIndex);
      mainWindow.loadFile(path.join(__dirname, 'index.html'));
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Secure Window Controls IPC Handlers
ipcMain.on('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.minimize();
  }
});

ipcMain.on('window:toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.close();
  }
});

ipcMain.handle('window:is-maximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win && !win.isDestroyed() ? win.isMaximized() : false;
});

// Open Directory Dialog IPC Handler
ipcMain.handle('dialog:openDirectory', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Select Photo Directory'
  });
  return result.canceled ? null : result.filePaths[0] || null;
});
