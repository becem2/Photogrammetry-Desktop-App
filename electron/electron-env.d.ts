/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer
  electronAPI: {
    readDirectory: (dirPath: string) => Promise<unknown>
    selectFolder: () => Promise<string | null>
    selectImages: () => Promise<Array<{ path: string; name: string; size: number }>>
    openPlyFile: () => Promise<string | null>
    readPlyFile: (filePath: string) => Promise<ArrayBuffer>
    readFileBinary: (filePath: string) => Promise<ArrayBuffer>
    readFileText: (filePath: string) => Promise<string>
    saveScreenshot: (payload: { filePath: string; dataUrl: string }) => Promise<void>
    createProject: (payload: {
      projectId: string
      projectName: string
      projectLocation: string
      description: string
      images: Array<{ path: string; name: string; size: number }>
    }) => Promise<{
      projectPath: string
      imagesCopied: number
      descriptionPath: string
    }>
    getSystemStats: () => Promise<{
      cpuUsage: number
      gpuUsage: number
      storageUsedGB: number
      storageTotalGB: number
      storagePercent: number
      storageLabel: string
    }>
    minimize: () => void
    maximize: () => void
    close: () => void
    openExplorer: (folderPath: string) => Promise<unknown>
    trashProjectFolder: (folderPath: string) => Promise<
      | { movedToTrash: true }
      | { movedToTrash: false; reason: "not-found" }
    >
    signInWithGoogleExternal: () => Promise<{
      idToken: string
      accessToken?: string
    }>
  }
}
