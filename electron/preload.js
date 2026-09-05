// AIMaster - preload 脚本
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('aimasterDesktop', {
  platform: process.platform,
  navigate: (pageFile) => ipcRenderer.send('nav-to', pageFile),
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome
  },
  // DSH 历史对话
  listSessions: () => ipcRenderer.invoke('dsh:list-sessions'),
  readSession: (id) => ipcRenderer.invoke('dsh:read-session', id),
  openSessionsDir: () => ipcRenderer.invoke('dsh:open-sessions-dir'),
  // 沉浸刷题题库
  getQuizBank: () => ipcRenderer.invoke('quiz:get-bank'),
  // 本地记忆问答
  recordQuizResult: (result) => ipcRenderer.invoke('memory:record-quiz-result', result),
  getMemoryOverview: () => ipcRenderer.invoke('memory:overview'),
  askMemory: (question) => ipcRenderer.invoke('memory:ask', question),
  // 真实大模型
  getLlmConfig: () => ipcRenderer.invoke('llm:get-config'),
  saveLlmConfig: (cfg) => ipcRenderer.invoke('llm:save-config', cfg),
  chatLlm: (messages) => ipcRenderer.invoke('llm:chat', messages),
  // 桌面宠物（独立透明置顶窗口）
  onPetDesktopReady: (cb) => ipcRenderer.on('pet:desktop-ready', () => cb && cb()),
  onPetDesktopClose: (cb) => ipcRenderer.on('pet:desktop-close', () => cb && cb()),
  petShowBubble: (html, autoHide) => ipcRenderer.send('pet:show-bubble', html, autoHide),
  petHideBubble: () => ipcRenderer.send('pet:show-bubble', '', false),
  petPlayAnim: (name, loop) => ipcRenderer.send('pet:play-anim', name, loop),
  petIdle: () => ipcRenderer.send('pet:idle'),
  petFocusState: (active, remainMs) => ipcRenderer.send('pet:focus-state', active, remainMs || 0),
  petSleepCfg: (on, min) => ipcRenderer.send('pet:sleep-cfg', on, min),
  petGreet: (text) => ipcRenderer.send('pet:greet', text),
  petPushStats: (summary) => ipcRenderer.send('pet:push-stats', summary),
  petToggleDesktop: (enabled) => ipcRenderer.invoke('pet:toggle-desktop', enabled),
  petDesktopStatus: () => ipcRenderer.invoke('pet:desktop-status')
});
