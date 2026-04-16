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
contextBridge.exposeInMainWorld("electronAPI", electronAPI);