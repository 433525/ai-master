// AIMaster - preload 脚本
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('aimasterDesktop', {
  platform: process.platform,
  navigate: (pageFile) => ipcRenderer.send('nav-to', pageFile),
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome
  }
});
