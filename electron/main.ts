import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as fs from "fs";
import os from "os";
import { promisify } from "node:util";
import http from "node:http";

// ==============================
// 📁 ESM __dirname FIX
// ==============================
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ==============================
// 🧠 App Configuration
// ==============================
app.setPath("userData", path.join(app.getPath("appData"), "DroneMeshPro"));

app.commandLine.appendSwitch("disable-features", "AutofillServerCommunication");
app.commandLine.appendSwitch("disable-blink-features", "ResizeObserver");

// ==============================
// 📦 Paths
// ==============================
process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// ==============================
// 🪟 Window Reference & Types
// ==============================
let win: BrowserWindow | null = null;
let systemStatsTimer: NodeJS.Timeout | null = null;

type SystemStats = {
  cpuUsage: number;
  gpuUsage: number;
  storageUsedGB: number;
  storageTotalGB: number;
  storagePercent: number;
  storageLabel: string;
};

type SelectedImage = {
  path: string;
  name: string;
  size: number;
};

type CreateProjectPayload = {
  projectId: string;
  projectName: string;
  projectLocation: string;
  description: string;
  images: SelectedImage[];
};

type ExternalGoogleAuthResult = {
  idToken: string;
  accessToken?: string;
};

const GOOGLE_AUTH_CALLBACK_PORT = 6000;
const GOOGLE_AUTH_CALLBACK_HOST = "localhost";

const emptySystemStats: SystemStats = {
  cpuUsage: 0,
  gpuUsage: 0,
  storageUsedGB: 0,
  storageTotalGB: 0,
  storagePercent: 0,
  storageLabel: "C: drive",
};

let latestSystemStats: SystemStats = emptySystemStats;
const execFileAsync = promisify(execFile);

// ==============================
// 📊 System Metrics Logic
// ==============================
function getStorageUsage(): Pick<SystemStats, "storageUsedGB" | "storageTotalGB" | "storagePercent" | "storageLabel"> {
  const rootPath = path.parse(os.homedir()).root || "C:\\";
  const stats = fs.statfsSync(rootPath);
  const blockSize = Number(stats.bsize || (stats as any).frsize || 0);
  const totalBytes = blockSize * Number(stats.blocks || 0);
  const availableBytes = blockSize * Number(stats.bavail || 0);
  const usedBytes = Math.max(totalBytes - availableBytes, 0);
  const percent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

  return {
    storageUsedGB: usedBytes / 1024 ** 3,
    storageTotalGB: totalBytes / 1024 ** 3,
    storagePercent: percent,
    storageLabel: `${rootPath.replace(/\\$/, "")} drive`,
  };
}

async function getCpuUsage(): Promise<number> {
  const sample = () => os.cpus().map((cpu) => {
    const times = cpu.times;
    const total = times.user + times.nice + times.sys + times.idle + times.irq;
    return { idle: times.idle, total };
  });

  const start = sample();
  await new Promise((resolve) => setTimeout(resolve, 100));
  const end = sample();

  const totalDelta = end.reduce((sum, cpu, index) => sum + (cpu.total - start[index].total), 0);
  const idleDelta = end.reduce((sum, cpu, index) => sum + (cpu.idle - start[index].idle), 0);

  return totalDelta > 0 ? ((totalDelta - idleDelta) / totalDelta) * 100 : 0;
}

async function getGpuUsage(): Promise<number> {
  if (process.platform !== "win32") return 0;
  const script = [
    "$gpu = $null",
    "try {",
    "  $samples = (Get-Counter '\\GPU Engine(*)\\Utilization Percentage' -ErrorAction Stop).CounterSamples | Where-Object { $_.CookedValue -gt 0 }",
    "  if ($samples) { $gpu = [math]::Round((($samples | Measure-Object CookedValue -Average).Average), 0) }",
    "} catch {}",
    "if ($null -eq $gpu) { try { $controller = Get-CimInstance Win32_VideoController | Select-Object -First 1; if ($null -ne $controller.LoadPercentage) { $gpu = [int]$controller.LoadPercentage } } catch {} }",
    "if ($null -eq $gpu) { $gpu = 0 }",
    "[int]$gpu",
  ].join("; ");

  try {
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", script]);
    const parsed = Number.parseInt(stdout.trim(), 10);
    return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;
  } catch { return 0; }
}

async function refreshSystemStats() {
  const [storageUsage, gpuUsage, cpuUsage] = await Promise.all([
    Promise.resolve(getStorageUsage()),
    getGpuUsage(),
    getCpuUsage(),
  ]);
  latestSystemStats = { cpuUsage: Math.min(100, Math.max(0, cpuUsage)), gpuUsage, ...storageUsage };
}

function startSystemStatsPolling() {
  void refreshSystemStats();
  systemStatsTimer = setInterval(() => { void refreshSystemStats(); }, 3000);
}

// ==============================
// 🛠️ Utility Functions
// ==============================
function sanitizeFolderName(folderName: string) {
  return folderName.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "-").replace(/\.+$/g, "").replace(/\s+/g, " ") || "New Project";
}

async function getUniqueFilePath(filePath: string) {
  const parsedPath = path.parse(filePath);
  let candidatePath = filePath;
  let counter = 1;
  while (fs.existsSync(candidatePath)) {
    candidatePath = path.join(parsedPath.dir, `${parsedPath.name}-${counter}${parsedPath.ext}`);
    counter += 1;
  }
  return candidatePath;
}

// ==============================
// 🔑 Google Auth Logic
// ==============================
async function createGoogleAuthUri(apiKey: string, continueUri: string) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ providerId: "google.com", continueUri }),
  });
  const payload = (await response.json()) as { authUri?: string };
  if (!payload.authUri) throw new Error("Google sign-in URL was not returned.");
  return payload.authUri;
}

async function signInWithGoogleInBrowser(apiKey: string): Promise<ExternalGoogleAuthResult> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (request, response) => {
      try {
        const urlObj = new URL(request.url || "/", `http://${GOOGLE_AUTH_CALLBACK_HOST}:${GOOGLE_AUTH_CALLBACK_PORT}`);
        if (urlObj.pathname !== "/auth/google/callback") {
          response.statusCode = 404; response.end("Not found"); return;
        }
        if (!urlObj.search) {
          response.statusCode = 200; response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(`<html><body style="font-family: sans-serif; text-align: center; padding-top: 50px;"><h3>Finalizing Authentication...</h3><script>if (window.location.hash) { const query = window.location.hash.replace(/^#/, ''); window.location.replace('/auth/google/callback?' + query); } else { setTimeout(() => window.close(), 250); }</script></body></html>`);
          return;
        }
        const idToken = urlObj.searchParams.get("id_token") || urlObj.searchParams.get("oauthIdToken");
        const accessToken = urlObj.searchParams.get("access_token") || urlObj.searchParams.get("oauthAccessToken") || undefined;
        if (idToken) {
          response.statusCode = 200; response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(`<html><body style="font-family: sans-serif; text-align: center; padding-top: 50px;"><h3>Sign-in complete.</h3><script>setTimeout(() => window.close(), 250);</script></body></html>`);
          cleanup(); resolve({ idToken, accessToken });
        } else {
          cleanup(); reject(new Error("No ID Token"));
        }
      } catch (e) { cleanup(); reject(e); }
    });

    const cleanup = () => { if (timeout) clearTimeout(timeout); server.close(); };
    let timeout = setTimeout(() => { cleanup(); reject(new Error("Timeout")); }, 180000);

    server.listen(GOOGLE_AUTH_CALLBACK_PORT, async () => {
      const continueUri = `http://${GOOGLE_AUTH_CALLBACK_HOST}:${GOOGLE_AUTH_CALLBACK_PORT}/auth/google/callback`;
      try {
        const authUri = await createGoogleAuthUri(apiKey, continueUri);
        await shell.openExternal(authUri);
      } catch (e) { cleanup(); reject(e); }
    });
  });
}

// ==============================
// 🪟 Window Management
// ==============================
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1280,
    minHeight: 800,
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    show: false,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }

  win.once("ready-to-show", () => { win?.show(); });
}

// ==============================
// 🚀 IPC HANDLERS
// ==============================

// --- WINDOW & PROJECT HANDLERS ---
ipcMain.on("window-minimize", () => win?.minimize());
ipcMain.on("window-maximize", () => {
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on("window-close", () => win?.close());
ipcMain.handle("get-system-stats", async () => latestSystemStats);

ipcMain.handle("select-folder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("select-images", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "tif", "tiff", "bmp", "webp"] }],
  });
  if (result.canceled) return [];
  return Promise.all(result.filePaths.map(async (fp) => {
    const stats = await fs.promises.stat(fp);
    return { path: fp, name: path.basename(fp), size: stats.size };
  }));
});

ipcMain.handle("open-ply-file", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "PLY", extensions: ["ply"] }],
  });

  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("read-ply-file", async (_event, filePath: string) => {
  const normalizedPath = path.normalize(filePath);
  const data = await fs.promises.readFile(normalizedPath);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
});

ipcMain.handle("read-file-binary", async (_event, filePath: string) => {
  const normalizedPath = path.normalize(filePath);
  const data = await fs.promises.readFile(normalizedPath);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
});

ipcMain.handle("read-file-text", async (_event, filePath: string) => {
  const normalizedPath = path.normalize(filePath);
  return fs.promises.readFile(normalizedPath, "utf8");
});

ipcMain.handle("save-screenshot", async (_event, payload: { filePath: string; dataUrl: string }) => {
  const screenshotFolder = path.dirname(payload.filePath);
  const normalizedFolder = path.normalize(screenshotFolder);
  await fs.promises.mkdir(normalizedFolder, { recursive: true });

  const base64Data = payload.dataUrl.replace(/^data:image\/png;base64,/, "");
  const fileBuffer = Buffer.from(base64Data, "base64");
  await fs.promises.writeFile(path.normalize(payload.filePath), fileBuffer);

  return { saved: true, filePath: path.normalize(payload.filePath) };
});

ipcMain.handle("create-project", async (_event, payload: CreateProjectPayload) => {
  const projectRoot = path.join(payload.projectLocation, sanitizeFolderName(payload.projectName));
  const imagesFolder = path.join(projectRoot, "images");
  await fs.promises.mkdir(imagesFolder, { recursive: true });
  await fs.promises.writeFile(path.join(projectRoot, "description.txt"), payload.description || "");
  for (const image of payload.images) {
    await fs.promises.copyFile(image.path, await getUniqueFilePath(path.join(imagesFolder, image.name)));
  }
  return { projectPath: projectRoot };
});

ipcMain.handle("read-directory", async (_event, dirPath: string) => {
  try {
    const files = await fs.promises.readdir(dirPath);
    const detailedFiles = await Promise.all(files.map(async (file) => {
      const fullPath = path.join(dirPath, file);
      const stats = await fs.promises.stat(fullPath);
      return { name: file, path: fullPath, isDirectory: stats.isDirectory(), size: stats.size, type: stats.isDirectory() ? "folder" : path.extname(file).toLowerCase() };
    }));
    const allowed = [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".obj", ".ply"];
    return detailedFiles.filter(f => f.isDirectory || allowed.includes(f.type));
  } catch (err: any) { return { error: err.message }; }
});

ipcMain.handle("open-explorer", async (_event, folderPath: string) => {
  if (folderPath) shell.openPath(folderPath);
});

ipcMain.handle("trash-project-folder", async (_event, folderPath: string) => {
  const normalizedPath = path.normalize(folderPath);
  if (!fs.existsSync(normalizedPath)) return { movedToTrash: false, reason: "not-found" };
  await shell.trashItem(normalizedPath);
  return { movedToTrash: true };
});

ipcMain.handle("sign-in-google-external", async () => {
  const apiKey = "AIzaSyBtOBq3HC-4AiDqPdCFprfxx1IzXgSVDQo"; 
  return signInWithGoogleInBrowser(apiKey);
});

// ==============================
// 🔁 App Lifecycle
// ==============================
app.whenReady().then(async () => {
  await refreshSystemStats();
  startSystemStatsPolling();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (systemStatsTimer) clearInterval(systemStatsTimer);
    app.quit();
  }
});