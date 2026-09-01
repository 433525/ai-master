// AIMaster 星际学习平台 - Electron 主进程
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL, fileURLToPath } = require('url');

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
  'interview':     { label: '面试演示',    file: 'frontend/static/interview.html' },
  'history':       { label: '📜 历史对话',  file: 'frontend/history/index.html' }
};
// 章节 1-10
for (let i = 1; i <= 10; i++) {
  NAV_PAGES['chapter' + i] = { label: '第 ' + i + ' 章', file: 'frontend/chapter/' + i + '/index.html' };
}

/* ---------- DSH 历史对话读取（带缓存与懒加载） ---------- */
const { decompress } = require('fzstd');
const os = require('os');

function dshHome() {
  return process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
}
function sessionsRoot() {
  const root = path.join(dshHome(), 'sessions');
  return fs.existsSync(root) ? root : null;
}
// 列出所有 workspace 会话目录下的 session.jsonl.zstd
function listSessionFiles() {
  const root = sessionsRoot();
  if (!root) return [];
  const out = [];
  try {
    for (const ws of fs.readdirSync(root)) {
      const wsPath = path.join(root, ws);
      if (!fs.statSync(wsPath).isDirectory()) continue;
      for (const s of fs.readdirSync(wsPath)) {
        const f = path.join(wsPath, s, 'session.jsonl.zstd');
        if (fs.existsSync(f)) out.push(f);
      }
    }
  } catch (e) { }
  return out;
}

// 解压缓存：file path -> parsed events（避免重复解压大文件）
const decodeCache = new Map();
function decodeSessionFile(file, useCache = true) {
  if (useCache && decodeCache.has(file)) return decodeCache.get(file);
  try {
    const buf = fs.readFileSync(file);
    const out = decompress(new Uint8Array(buf));
    const text = Buffer.from(out).toString('utf8');
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const parsed = [];
    for (const l of lines) {
      try { parsed.push(JSON.parse(l)); } catch (e) { }
    }
    if (useCache) {
      // 缓存上限控制（防内存膨胀）
      if (decodeCache.size > 40) decodeCache.clear();
      decodeCache.set(file, parsed);
    }
    return parsed;
  } catch (e) {
    if (useCache) decodeCache.set(file, null);
    return null;
  }
}

// 轻量读取：只解析会话头（不缓存大对象，但借用缓存避免重复）
function readSessionHeader(file) {
  const events = decodeSessionFile(file);
  if (!events || !events.length) return null;
  const head = events[0];
  if (!head || head.type !== 'session') return null;
  return head;
}

// 提取会话元信息（懒加载：逐文件解压，按需）
function sessionSummary(file) {
  const events = decodeSessionFile(file);
  if (!events || !events.length) return null;
  const head = events[0];
  if (!head || head.type !== 'session') return null;
  const title = (events.find(e => e.type === 'session/title') || {}).data || null;
  const userMsgs = events.filter(e => e.type === 'user/message' && !(e.data && e.data.source && e.data.source.kind === 'system'));
  const lastEvent = events[events.length - 1];
  return {
    id: head.id,
    title: typeof title === 'string' ? title : (userMsgs[0] ? userMsgs[0].data.content.filter(c => c.type === 'text').map(c => c.text).join(' ').slice(0, 60) : '未命名会话'),
    createdAt: head.createdAt,
    lastTime: lastEvent ? (lastEvent.time || head.createdAt) : head.createdAt,
    cwd: head.cwd || '',
    messageCount: userMsgs.length,
    preview: userMsgs[0] ? userMsgs[0].data.content.filter(c => c.type === 'text').map(c => c.text).join(' ').slice(0, 90) : ''
  };
}
// 提取完整对话（按 turn 组织 user -> assistant）
function sessionMessages(file) {
  const events = decodeSessionFile(file);
  if (!events) return { ok: false, error: '无法解压会话文件' };
  const head = events.find(e => e.type === 'session');
  const title = (events.find(e => e.type === 'session/title') || {}).data || '未命名会话';
  const messages = [];
  let currentUser = null;
  for (const e of events) {
    if (e.type === 'user/message') {
      const isSystem = e.data && e.data.source && (e.data.source.kind === 'system' || e.data.source.kind === 'bootstrap');
      const text = (e.data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
      if (text && !isSystem) {
        currentUser = { role: 'user', text: text.slice(0, 8000), time: e.time };
        messages.push(currentUser);
      }
    } else if (e.type === 'assistant/message') {
      const d = e.data;
      if (d && typeof d === 'object' && d.content) {
        let text = '';
        if (typeof d.content === 'string') text = d.content;
        else if (Array.isArray(d.content)) {
          text = d.content.filter(c => c && c.type === 'text').map(c => c.text).join('\n');
        }
        if (text) {
          messages.push({ role: 'assistant', text: text.slice(0, 12000), time: e.time });
          currentUser = null;
        }
      }
    }
  }
  return { ok: true, title: typeof title === 'string' ? title : '未命名会话', messages };
}

// 注册 IPC（懒加载：列表用一次解压缓存，读取复用缓存）
function registerHistoryIpc() {
  ipcMain.handle('dsh:list-sessions', () => {
    try {
      const files = listSessionFiles();
      const sessions = files.map(sessionSummary).filter(Boolean)
        .sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
      return { ok: true, sessions };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  ipcMain.handle('dsh:read-session', (event, id) => {
    try {
      // 先查缓存中已解压的会话（列表时已解压过）
      for (const [file, events] of decodeCache) {
        if (events && events[0] && events[0].id === id) {
          return sessionMessages(file);
        }
      }
      // 缓存未命中：定位文件并解压
      const file = listSessionFiles().find(f => {
        const h = readSessionHeader(f);
        return h && h.id === id;
      });
      if (!file) return { ok: false, error: '未找到会话 ' + id };
      return sessionMessages(file);
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  ipcMain.handle('dsh:open-sessions-dir', () => {
    const root = sessionsRoot();
    if (root) shell.openPath(root);
    return { ok: !!root };
  });
}

registerHistoryIpc();

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

  // 修复目录形式链接（如 ../canvas/、../chapter/4、../chapter/1/#kp-1）：
  // file:// 下目录 URL 不会自动补 index.html，直接导航会 ERR_FILE_NOT_FOUND 白屏且无法注入导航栏
  // → 检测到目标是目录时自动补全（保留 hash 锚点）
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) return;
    try {
      const hashIdx = url.indexOf('#');
      const hash = hashIdx >= 0 ? url.slice(hashIdx) : '';
      const clean = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
      const p = fileURLToPath(clean);
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
        event.preventDefault();
        win.loadURL(clean.replace(/\/?$/, '/') + 'index.html' + hash);
      }
    } catch (e) { /* 非本地路径，忽略 */ }
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
