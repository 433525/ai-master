/* ============================================================
   AIMaster 桌面宠物窗口管理（主进程）
   - 创建透明、无边框、置顶、穿透的宠物窗口
   - IPC 桥接主窗口 <-> 宠物窗口
   ============================================================ */
const { BrowserWindow, ipcMain, screen, Menu } = require('electron');
const path = require('path');

let petWin = null;
let mainWin = null;
let petEnabled = true;

const PET_W = 220;
const PET_H = 124;

function createPetWindow(mainWindow) {
  mainWin = mainWindow;
  if (petWin) return petWin;

  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;

  petWin = new BrowserWindow({
    width: PET_W,
    height: PET_H,
    x: sw - PET_W - 24,
    y: sh - PET_H - 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: true,
    show: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'pet-preload.js'),
      contextIsolation: false,
      nodeIntegration: true
    }
  });

  petWin.setAlwaysOnTop(true, 'screen-saver');
  petWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWin.setIgnoreMouseEvents(true, { forward: true });

  petWin.loadFile(path.join(__dirname, '..', 'frontend', 'pet-desktop', 'index.html'));

  petWin.once('ready-to-show', () => {
    petWin.show();
    petWin.webContents.send('pet:screen-info', sw, sh);
  });

  petWin.on('closed', () => { petWin = null; });

  registerPetIpc();
  return petWin;
}

function registerPetIpc() {
  // 宠物窗口 → 主进程：移动窗口
  ipcMain.on('pet:move', (e, x, y) => {
    if (!petWin || petWin.isDestroyed()) return;
    petWin.setBounds({ x, y, width: PET_W, height: PET_H });
  });

  // 宠物窗口 → 主进程：翻转（镜像）
  ipcMain.on('pet:flip', (e, flipped) => {
    if (!petWin || petWin.isDestroyed()) return;
    petWin.webContents.send('pet:apply-flip', flipped);
  });

  // 宠物窗口 → 主进程：鼠标穿透控制
  ipcMain.on('pet:ignore-mouse', (e, ignore) => {
    if (!petWin || petWin.isDestroyed()) return;
    petWin.setIgnoreMouseEvents(ignore, { forward: true });
  });

  // 宠物窗口 → 主进程：抓取/释放（暂停穿透更新）
  ipcMain.on('pet:grab', (e, grabbing) => {
    if (!petWin || petWin.isDestroyed()) return;
    petWin.setIgnoreMouseEvents(false);
  });

  // 宠物窗口就绪
  ipcMain.on('pet:ready', () => {
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('pet:desktop-ready');
    }
  });

  // 主窗口 → 宠物窗口：显示气泡
  ipcMain.on('pet:show-bubble', (e, html, autoHide) => {
    if (petWin && !petWin.isDestroyed()) petWin.webContents.send('pet:bubble', html, autoHide);
  });

  // 主窗口 → 宠物窗口：播放动画
  ipcMain.on('pet:play-anim', (e, name, loop) => {
    if (petWin && !petWin.isDestroyed()) petWin.webContents.send('pet:anim', name, loop);
  });

  // 主窗口 → 宠物窗口：回到待机
  ipcMain.on('pet:idle', () => {
    if (petWin && !petWin.isDestroyed()) petWin.webContents.send('pet:idle');
  });

  // 主窗口 → 宠物窗口：专注状态
  ipcMain.on('pet:focus-state', (e, active, remainMs) => {
    if (petWin && !petWin.isDestroyed()) petWin.webContents.send('pet:focus', active, remainMs);
  });

  // 主窗口 → 宠物窗口：睡眠设置
  ipcMain.on('pet:sleep-cfg', (e, on, min) => {
    if (petWin && !petWin.isDestroyed()) petWin.webContents.send('pet:sleep-setting', on, min);
  });

  // 主窗口 → 宠物窗口：问候
  ipcMain.on('pet:greet', (e, text) => {
    if (petWin && !petWin.isDestroyed()) petWin.webContents.send('pet:greeting', text);
  });

  // 主窗口 → 宠物窗口：学习数据摘要
  ipcMain.on('pet:push-stats', (e, summary) => {
    if (petWin && !petWin.isDestroyed()) petWin.webContents.send('pet:stats', summary);
  });

  // 宠物窗口 → 主进程：右键菜单
  ipcMain.on('pet:context-menu', (e) => {
    if (!petWin || petWin.isDestroyed()) return;
    const template = [
      { label: '💤 睡眠 / 唤醒', click: () => petWin.webContents.send('pet:toggle-sleep') },
      { label: '📊 查看学习报告', click: () => petWin.webContents.send('pet:show-report') },
      { type: 'separator' },
      { label: '🐋 回到主窗口', click: () => {
          if (mainWin && !mainWin.isDestroyed()) {
            mainWin.webContents.send('pet:desktop-close');
          }
        }
      },
      { label: '🚪 退出桌宠', click: () => {
          if (mainWin && !mainWin.isDestroyed()) {
            mainWin.webContents.send('pet:desktop-close');
          }
          if (petWin && !petWin.isDestroyed()) petWin.close();
        }
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: petWin });
  });

  // 切换桌面宠物开关
  ipcMain.handle('pet:toggle-desktop', (e, enabled) => {
    petEnabled = enabled;
    if (enabled) {
      if (!petWin || petWin.isDestroyed()) createPetWindow(mainWin);
    } else {
      if (petWin && !petWin.isDestroyed()) petWin.close();
    }
    return petEnabled;
  });

  // 查询桌面宠物状态
  ipcMain.handle('pet:desktop-status', () => {
    return { enabled: petEnabled, alive: !!(petWin && !petWin.isDestroyed()) };
  });
}

function destroyPetWindow() {
  if (petWin && !petWin.isDestroyed()) petWin.close();
  petWin = null;
}

function getPetWindow() { return petWin; }

module.exports = { createPetWindow, destroyPetWindow, getPetWindow };
