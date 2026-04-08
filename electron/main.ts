import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Resolve __dirname for ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    height: 720,
    minWidth: 1280,
    minHeight: 720,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      height: 32,
      color: 'green',
      symbolColor: '#f8fafc',
    },
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