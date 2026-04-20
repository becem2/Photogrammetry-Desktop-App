import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// Mount the React app into the Vite root element.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Keep a development-time log of messages coming from the main process.
if (window.ipcRenderer && typeof window.ipcRenderer.on === 'function') {
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
}
