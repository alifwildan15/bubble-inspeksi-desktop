const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openPdf: () => ipcRenderer.invoke('dialog:openPdf'),
  savePdf: (defaultName) => ipcRenderer.invoke('dialog:savePdf', defaultName),
  writeFile: (filePath, data) => ipcRenderer.invoke('file:write', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  onMenuOpen: (cb) => ipcRenderer.on('menu-open-pdf', cb),
  onMenuExport: (cb) => ipcRenderer.on('menu-export-pdf', cb),
  onMenuZoomIn: (cb) => ipcRenderer.on('menu-zoom-in', cb),
  onMenuZoomOut: (cb) => ipcRenderer.on('menu-zoom-out', cb),
  onMenuZoomFit: (cb) => ipcRenderer.on('menu-zoom-fit', cb),
});
