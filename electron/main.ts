import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolve __dirname for ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Force a writable userData path on Windows to avoid cache access issues
app.setPath('userData', path.join(app.getPath('appData'), 'DroneMeshPro'));
app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication');
app.commandLine.appendSwitch('disable-blink-features', 'ResizeObserver');

// Set app root
process.env.APP_ROOT = path.join(__dirname, '..');

// Paths
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

// Keep a reference for the main window
let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    show: false,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
    },
  });

  // Send message to renderer when content is loaded
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  // Load dev server or built index.html
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  // Show window after content is loaded
  win.once('ready-to-show', () => {
    win?.show();
  });

  // Open DevTools only in development mode
  const isDev = !!VITE_DEV_SERVER_URL || !app.isPackaged;
  if (isDev) {
    win.webContents.openDevTools();
  }
}

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    win = null;
    app.quit();
  }
});

// macOS: Re-create window when clicking dock icon
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Create the main window
app.whenReady().then(createWindow);

// IPC Handlers for window controls
ipcMain.on('window-minimize', () => {
  if (win) {
    win.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (win) {
    win.close();
  }
});