// AIMaster 星际学习平台 - Electron 主进程
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// 导航页映射（软件内所有可访问页面）
const NAV_PAGES = {
  'home':          { label: '首页',        file: 'index.html' },
  'dashboard':     { label: '仪表盘',      file: 'frontend/dashboard/index.html' },
  'learning':      { label: '学习中心',    file: 'frontend/learning-center/index.html' },
  'stars':         { label: '知识星图',    file: 'frontend/knowledge-stars/index.html' },
  'playground':    { label: '实验场',      file: 'frontend/playground/index.html' },
  'canvas':        { label: '画布演示',    file: 'frontend/canvas/index.html' },
  'transition':    { label: '转场演示',    file: 'frontend/transition/index.html' },
  'odyssey':       { label: 'AI 奥德赛',   file: 'frontend/static/ai_odyssey.html' },
  'llm':           { label: 'LLM 入门',    file: 'frontend/static/llm_intro.html' },
  'transformer':   { label: 'Transformer', file: 'frontend/static/transformer_cg.html' },
  'prompt':        { label: '提示词工坊',  file: 'frontend/static/prompt_cg_starlab/index.html' },
  'agentic':       { label: 'Agent 工程',  file: 'frontend/static/agentic_cg/index.html' },
  'claude':        { label: 'Claude 工坊', file: 'frontend/static/claude_cg/index.html' },
  'rag':           { label: 'RAG 知识库',  file: 'frontend/static/rag_cg/index.html' },
  'interview':     { label: '面试演示',    file: 'frontend/static/interview.html' }
};
// 章节 1-10
for (let i = 1; i <= 10; i++) {
  NAV_PAGES['chapter' + i] = { label: '第 ' + i + ' 章', file: 'frontend/chapter/' + i + '/index.html' };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'AIMaster 星际学习平台',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // 打开外部链接用系统浏览器
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) { shell.openExternal(url); }
    return { action: 'deny' };
  });

  // 每个页面加载完成后注入顶部导航栏
  win.webContents.on('did-finish-load', () => {
    try {
      let navSrc = fs.readFileSync(path.join(__dirname, 'nav.js'), 'utf8');
      // 注入页面文件映射（key -> 相对路径）
      const filesMap = {};
      for (const k in NAV_PAGES) filesMap[k] = NAV_PAGES[k].file;
      navSrc = navSrc.replace("'NAV_FILES_JSON'", JSON.stringify(filesMap));
      // 注入应用根目录的绝对 file:// URL（正确处理中文与盘符）
      const rootUrl = pathToFileURL(path.join(__dirname, '..')).href;
      navSrc = navSrc.replace("'NAV_ROOT_URL'", JSON.stringify(rootUrl));
      win.webContents.executeJavaScript(navSrc).catch(() => {});
    } catch (e) { /* 注入失败不影响主功能 */ }
  });

  // 首页加载
  win.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
