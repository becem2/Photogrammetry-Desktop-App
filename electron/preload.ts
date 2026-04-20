import { ipcRenderer, contextBridge } from "electron";

// Safe bridge exposed to the renderer.
// Keep the API surface narrow so the UI can only call approved IPC methods.
// ==============================
// 🌉 Electron API (SAFE BRIDGE)
// ==============================

const electronAPI = {
  // ==============================
  // 📁 FILE SYSTEM & PROJECTS
  // ==============================

  readDirectory: (dirPath: string) => {
    // Ask the main process to inspect a directory.
    return ipcRenderer.invoke("read-directory", dirPath);
  },

  selectFolder: () => {
    // Open the native folder picker.
    return ipcRenderer.invoke("select-folder");
  },

  selectImages: () => {
    // Open the native image picker.
    return ipcRenderer.invoke("select-images");
  },

  openPlyFile: () => {
    // Open the native PLY picker.
    return ipcRenderer.invoke("open-ply-file");
  },

  readPlyFile: async (filePath: string): Promise<ArrayBuffer> => {
    // Read raw binary bytes for PLY parsing in renderer.
    const payload = await ipcRenderer.invoke("read-ply-file", filePath);

    if (payload instanceof ArrayBuffer) {
      return payload;
    }

    if (ArrayBuffer.isView(payload)) {
      const view = payload as Uint8Array;
      const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
      return bytes.slice().buffer;
    }

    if (Array.isArray(payload)) {
      return Uint8Array.from(payload).buffer;
    }

    if (
      payload &&
      typeof payload === "object" &&
      "type" in payload &&
      "data" in payload &&
      (payload as { type?: unknown }).type === "Buffer" &&
      Array.isArray((payload as { data?: unknown }).data)
    ) {
      return Uint8Array.from((payload as { data: number[] }).data).buffer;
    }

    throw new Error("Unexpected payload while reading PLY file.");
  },

  saveScreenshot: (payload: { filePath: string; dataUrl: string }) => {
    return ipcRenderer.invoke("save-screenshot", payload);
  },

  createProject: (payload: {
    projectId: string;
    projectName: string;
    projectLocation: string;
    description: string;
    images: Array<{ path: string; name: string; size: number }>;
  }) => {
    // Delegate project folder creation and file copying to the main process.
    return ipcRenderer.invoke("create-project", payload);
  },

  getSystemStats: () => {
    // Fetch the latest system metrics snapshot.
    return ipcRenderer.invoke("get-system-stats");
  },

  // ==============================
  // 🪟 WINDOW CONTROLS
  // ==============================

  minimize: () => {
    ipcRenderer.send("window-minimize");
  },

  maximize: () => {
    ipcRenderer.send("window-maximize");
  },

  close: () => {
    ipcRenderer.send("window-close");
  },

  // ==============================
  // 🌐 EXTERNAL & SHELL
  // ==============================

  openExplorer: (folderPath: string) => {
    return ipcRenderer.invoke("open-explorer", folderPath);
  },

  trashProjectFolder: (folderPath: string) => {
    return ipcRenderer.invoke("trash-project-folder", folderPath);
  },

  signInWithGoogleExternal: () => {
    return ipcRenderer.invoke("sign-in-google-external");
  },
};

// Publish the safe API on window.electronAPI.
contextBridge.exposeInMainWorld("electronAPI", electronAPI);``