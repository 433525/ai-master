/* ============================================================
   AI Master 虚拟形象助手 (Avatar Widget)
   - 浮动虚拟形象（可拖拽、四边吸附、左吸附镜像翻转、按压 Q 弹）
   - 形象选择：预设形象 + 上传自定义形象
   - 学习状态监控 + 屏幕使用时间统计
   交互设计参考: MeteorNOX/DeepSeek-Balance-Whale-Widget (MIT)
   ============================================================ */
(function () {
  'use strict';
  if (window.__aimasterAvatarLoaded) return;
  window.__aimasterAvatarLoaded = true;

  var script = document.currentScript;
  var BASE = script ? script.src.replace(/[^/]*$/, '') : '';

  /* ---------- 预设形象 ---------- */
  function svgAvatar(body) {
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>" + body + "</svg>";
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  var PRESET_AVATARS = [
    { id: 'whale1',  name: '鲸鱼娘',  src: BASE + 'assets/DSniang1.png' },
    { id: 'whale2',  name: '鲸鱼整图', src: BASE + 'assets/DSniang02.png' },
    { id: 'rua',     name: 'rua动图', src: BASE + 'assets/rua.gif' },
    { id: 'cat',     name: '橘猫',    src: svgAvatar("<circle cx='100' cy='115' r='78' fill='#f7b267'/><circle cx='52' cy='58' r='24' fill='#f7b267'/><circle cx='148' cy='58' r='24' fill='#f7b267'/><circle cx='48' cy='52' r='12' fill='#f0a05a'/><circle cx='152' cy='52' r='12' fill='#f0a05a'/><ellipse cx='100' cy='115' rx='46' ry='38' fill='#fbe9d0'/><circle cx='84' cy='112' r='7' fill='#2b2b2b'/><circle cx='116' cy='112' r='7' fill='#2b2b2b'/><circle cx='86' cy='110' r='2.6' fill='#fff'/><circle cx='118' cy='110' r='2.6' fill='#fff'/><path d='M92 138 Q100 146 108 138' stroke='#2b2b2b' stroke-width='4' fill='none' stroke-linecap='round'/>") },
    { id: 'star',    name: '星宝',    src: svgAvatar("<polygon points='100,14 122,72 184,76 136,116 150,176 100,142 50,176 64,116 16,76 78,72' fill='#ffd75e' stroke='#e8b83a' stroke-width='4'/><circle cx='78' cy='100' r='8' fill='#2b2b2b'/><circle cx='122' cy='100' r='8' fill='#2b2b2b'/><circle cx='80' cy='97' r='3' fill='#fff'/><circle cx='124' cy='97' r='3' fill='#fff'/><path d='M88 126 Q100 138 112 126' stroke='#2b2b2b' stroke-width='4' fill='none' stroke-linecap='round'/>") },
    { id: 'robot',   name: '小机器人', src: svgAvatar("<rect x='52' y='46' width='96' height='86' rx='18' fill='#7fb3ff'/><rect x='70' y='72' width='24' height='24' rx='6' fill='#123'/><rect x='106' y='72' width='24' height='24' rx='6' fill='#123'/><rect x='74' y='74' width='20' height='20' rx='5' fill='#9be8ff'/><rect x='110' y='74' width='20' height='20' rx='5' fill='#9be8ff'/><rect x='60' y='112' width='80' height='10' rx='5' fill='#5a8cd6'/><rect x='80' y='126' width='12' height='34' rx='6' fill='#5a8cd6'/><rect x='108' y='126' width='12' height='34' rx='6' fill='#5a8cd6'/><rect x='90' y='16' width='20' height='30' rx='6' fill='#7fb3ff'/><circle cx='100' cy='14' r='8' fill='#ff8fa3'/>") }
  ];

  /* ---------- 台词库 ---------- */
  var RANDOM_LINES = [
    { w: 5, text: function () { return '📖 今天已经学习 ' + fmtMin(stats().studyMs) + ' 分钟啦，继续保持！'; } },
    { w: 5, text: function () { return '⏱️ 今天在屏幕上待了 ' + fmtMin(stats().screenMs) + ' 分钟，注意休息眼睛哦~'; } },
    { w: 4, text: function () { return '🐋 加油！你是最棒的 AI 学习者！'; } },
    { w: 4, text: function () { return '✨ 看完这一章，你就是星际学霸了！'; } },
    { w: 3, text: function () { return '🤔 需要休息的话，就闭眼 20 秒吧~'; } },
    { w: 3, text: function () { return '🎯 学习状态：' + studyLabel() + '，继续冲！'; } },
    { w: 3, text: function () { return '💤 检测到你长时间使用，去喝口水吧！'; } },
    { w: 2, text: function () { return '🎮 别被游戏拐走了，回来学习！'; } },
    { w: 2, text: function () { return '🌌 今天的星际航程，你走了多远？'; } },
    { w: 2, text: function () { return '🧠 知识就是力量，冲鸭！'; } },
    { w: 1, text: function () { return '哦鲸鲸... '; } },
    { w: 1, text: function () { return '我去吃饭啦，学完叫我~'; } }
  ];

  /* ---------- 存储 ---------- */
  var SETTINGS_KEY = 'aimaster_avatar_settings';
  var STATS_KEY = 'aimaster_avatar_stats';
  var CUSTOM_KEY = 'aimaster_avatar_customs';
  function lsGet(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { } }
  function todayKey() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  var DEFAULT_SETTINGS = { avatar: 'whale1', size: 1, sound: true, volume: 0.6, bubbleOn: true, x: null, y: null };
  function loadSettings() {
    var s = lsGet(SETTINGS_KEY) || {};
    var out = {};
    for (var k in DEFAULT_SETTINGS) out[k] = (s[k] !== undefined) ? s[k] : DEFAULT_SETTINGS[k];
    return out;
  }
  var settings = loadSettings();
  function saveSettings() { lsSet(SETTINGS_KEY, settings); }

  var customs = lsGet(CUSTOM_KEY) || [];
  function saveCustoms() { lsSet(CUSTOM_KEY, customs); }

  var _statsCache = null;
  function stats() {
    var d = todayKey();
    if (!_statsCache || _statsCache.date !== d) {
      var s = lsGet(STATS_KEY);
      if (s && s.date === d) { _statsCache = s; }
      else {
        // 归档昨日
        if (s) { try { localStorage.setItem('aimaster_avatar_stats_' + s.date, JSON.stringify(s)); } catch (e) { } }
        _statsCache = { date: d, screenMs: 0, studyMs: 0, visits: {}, lastTick: Date.now() };
        lsSet(STATS_KEY, _statsCache);
      }
    }
    return _statsCache;
  }
  function saveStats() { lsSet(STATS_KEY, _statsCache); }

  /* ---------- 页面学习判定（基于完整路径） ---------- */
  function currentPage() {
    var p = location.pathname.replace(/\\/g, '/');
    if (!p || p === '/' || p === '/index.html') return '/index.html';
    return p;
  }
  // 非学习页：首页/登录页/推广页/视频页（仅限仓库根目录）
  var NON_STUDY_RE = /^\/(index|login|aimaster-promo|agent-video)\.html$/;
  function isStudyPage() { return !NON_STUDY_RE.test(currentPage()); }
  function studyLabel() {
    var p = currentPage();
    var m = p.match(/chapter\/(\d+)/);
    if (m) return '第 ' + m[1] + ' 章';
    if (p.indexOf('learning-center') !== -1) return '学习中心';
    if (p.indexOf('knowledge-stars') !== -1 || p.indexOf('knowledge_stars') !== -1) return '知识星图';
    if (p.indexOf('playground') !== -1) return '实验场';
    if (p.indexOf('dashboard') !== -1) return '仪表盘';
    if (p.indexOf('canvas') !== -1) return '画布演示';
    if (p.indexOf('transition') !== -1) return '转场演示';
    if (p.indexOf('llm_training_game') !== -1) return 'LLM 训练游戏';
    if (p.indexOf('transformer') !== -1) return 'Transformer 实验室';
    if (p.indexOf('rag') !== -1) return 'RAG 知识库';
    if (p.indexOf('prompt_cg') !== -1) return '提示词工坊';
    if (p.indexOf('claude_cg') !== -1) return 'Claude 工坊';
    if (p.indexOf('trae_tutorial') !== -1) return 'Trae 教程';
    if (p.indexOf('agentic') !== -1) return 'Agent 工程';
    if (p.indexOf('bpe_game') !== -1) return 'BPE 猜词游戏';
    if (p.indexOf('ai_odyssey') !== -1) return 'AI 奥德赛';
    if (p.indexOf('interview') !== -1) return '面试演示';
    if (p.indexOf('revelation_cg') !== -1) return '启示录演示';
    if (p.indexOf('workbuddy') !== -1 || p.indexOf('zcode') !== -1) return '工具展示';
    if (p.indexOf('vibe-coding') !== -1) return 'Vibe Coding';
    return '学习中';
  }
  function fmtMin(ms) {
    var min = Math.floor(ms / 60000);
    if (min < 1) return '不到1';
    return String(min);
  }

  /* ---------- 构建 DOM ---------- */
  var root = document.createElement('div');
  root.id = 'aimaster-avatar-root';
  root.innerHTML =
    '<div class="aw-stage" id="aw-stage">' +
      '<img class="aw-whale" id="aw-whale" alt="虚拟形象" draggable="false" />' +
      '<div class="aw-gear" id="aw-gear" title="设置">⚙️</div>' +
      '<div class="aw-bubble" id="aw-bubble"></div>' +
      '<div class="aw-menu" id="aw-menu"></div>' +
    '</div>';
  document.documentElement.appendChild(root);
  var stage = root.querySelector('#aw-stage');
  var whaleImg = root.querySelector('#aw-whale');
  var bubbleEl = root.querySelector('#aw-bubble');
  var menuEl = root.querySelector('#aw-menu');
  var gearBtn = root.querySelector('#aw-gear');

  /* ---------- 音效 ---------- */
  var audios = [];
  var SOUND_FILES = ['Ya1.mp3', 'Ya2.mp3', 'D1.mp3', 'D2.mp3'];
  function ensureAudio() {
    if (audios.length || !settings.sound) return;
    SOUND_FILES.forEach(function (f) {
      try {
        var a = new Audio(BASE + 'assets/' + f);
        a.volume = settings.volume;
        audios.push(a);
      } catch (e) { }
    });
  }
  function playPress() {
    if (!settings.sound || settings.volume <= 0) return;
    ensureAudio();
    if (!audios.length) return;
    var a = audios[Math.floor(Math.random() * audios.length)];
    try { a.currentTime = 0; a.volume = settings.volume; a.play().catch(function () { }); } catch (e) { }
  }

  /* ---------- 形象渲染 ---------- */
  function avatarSrc(id) {
    for (var i = 0; i < PRESET_AVATARS.length; i++) if (PRESET_AVATARS[i].id === id) return PRESET_AVATARS[i].src;
    for (var j = 0; j < customs.length; j++) if (customs[j].id === id) return customs[j].src;
    return PRESET_AVATARS[0].src;
  }
  function renderAvatar() {
    whaleImg.src = avatarSrc(settings.avatar);
    applySize();
  }
  function applySize() {
    root.style.setProperty('--aw-scale', settings.size);
  }

  /* ---------- 拖拽与吸附 ---------- */
  var dragging = false, moved = false, dragX = 0, dragY = 0, startX = 0, startY = 0, startLeft = 0, startTop = 0;
  function stageRect() { return { w: stage.offsetWidth, h: stage.offsetHeight }; }
  function setPos(x, y) {
    x = Math.max(0, Math.min(x, window.innerWidth - 60));
    y = Math.max(0, Math.min(y, window.innerHeight - 60));
    stage.style.left = x + 'px';
    stage.style.top = y + 'px';
    settings.x = x; settings.y = y;
    updateFlip();
  }
  function updateFlip() {
    var r = stageRect();
    var x = parseInt(stage.style.left, 10) || 0;
    var flipped = x < (window.innerWidth - r.w) / 2;
    stage.classList.toggle('aw-flipped', flipped);
  }
  stage.addEventListener('pointerdown', function (e) {
    if (e.target === gearBtn || menuEl.contains(e.target)) return;
    dragging = true; moved = false;
    stage.classList.add('aw-pressed');
    playPress();
    var r = stageRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = parseInt(stage.style.left, 10) || (window.innerWidth - r.w - 16);
    startTop = parseInt(stage.style.top, 10) || (window.innerHeight - r.h - 16);
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    setPos(startLeft + dx, startTop + dy);
  });
  function release() {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('aw-pressed');
    snapToEdge();
    saveSettings();
  }
  function snapToEdge() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var r = stageRect();
    var x = parseInt(stage.style.left, 10) || 0;
    var y = parseInt(stage.style.top, 10) || 0;
    // 四边四分之一吸附
    var left = x < vw * 0.25;
    var right = x + r.w > vw * 0.75;
    var top = y < vh * 0.25;
    var bottom = y + r.h > vh * 0.75;
    var nx = x, ny = y;
    if (left) nx = 8;
    else if (right) nx = vw - r.w - 8;
    if (top) ny = 8;
    else if (bottom) ny = vh - r.h - 8;
    stage.style.transition = 'left .25s ease, top .25s ease';
    setPos(nx, ny);
    setTimeout(function () { stage.style.transition = ''; }, 260);
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  /* ---------- 气泡 ---------- */
  var bubbleTimer = null;
  function showBubble(html, autoHide) {
    if (!settings.bubbleOn) return;
    bubbleEl.innerHTML = html;
    bubbleEl.classList.add('aw-show');
    if (bubbleTimer) clearTimeout(bubbleTimer);
    if (autoHide !== false) bubbleTimer = setTimeout(hideBubble, 5000);
  }
  function hideBubble() {
    bubbleEl.classList.remove('aw-show');
  }
  function randomLine() {
    var total = 0, i;
    for (i = 0; i < RANDOM_LINES.length; i++) total += RANDOM_LINES[i].w;
    var pick = Math.random() * total;
    for (i = 0; i < RANDOM_LINES.length; i++) {
      pick -= RANDOM_LINES[i].w;
      if (pick <= 0) return RANDOM_LINES[i].text();
    }
    return RANDOM_LINES[0].text();
  }
  function statusBubbleHtml() {
    var s = stats();
    var vis = s.visits || {};
    var key = currentPage();
    var v = vis[key] || { count: 0 };
    return '<div class="aw-bb-row"><span class="aw-bb-tag">学习状态</span><span>' + studyLabel() + '</span></div>' +
           '<div class="aw-bb-row"><span class="aw-bb-tag">今日学习</span><span class="aw-bb-num">' + fmtMin(s.studyMs) + ' 分钟</span></div>' +
           '<div class="aw-bb-row"><span class="aw-bb-tag">屏幕使用</span><span class="aw-bb-num">' + fmtMin(s.screenMs) + ' 分钟</span></div>' +
           '<div class="aw-bb-row"><span class="aw-bb-tag">本页访问</span><span>' + v.count + ' 次</span></div>';
  }
  var gifMode = false;
  function cycleBubble() {
    if (!settings.bubbleOn) return;
    var r = Math.random();
    if (r < 0.08) {
      gifMode = true;
      showBubble('<img class="aw-gif" src="' + BASE + 'assets/rua.gif" alt="rua" />', true);
    } else if (r < 0.28) {
      gifMode = false;
      showBubble(statusBubbleHtml(), true);
    } else {
      gifMode = false;
      showBubble('<div class="aw-bb-row"><span class="aw-bb-tag">🐋</span><span>' + randomLine() + '</span></div>', true);
    }
  }
  whaleImg.addEventListener('click', function (e) {
    if (moved) return;
    cycleBubble();
  });
  bubbleEl.addEventListener('click', function () {
    hideBubble();
  });

  /* ---------- 菜单 ---------- */
  var menuOpen = false;
  function avatarGridHtml() {
    var html = '';
    var all = PRESET_AVATARS.concat(customs);
    for (var i = 0; i < all.length; i++) {
      var a = all[i];
      var on = a.id === settings.avatar ? ' aw-on' : '';
      html += '<div class="aw-av' + on + '" data-avid="' + a.id + '">' +
              '<img src="' + a.src + '" alt="' + a.name + '" />' +
              '<span>' + a.name + '</span></div>';
    }
    return html;
  }
  function renderMenu() {
    var s = stats();
    var minSize = 0.6, maxSize = 2.5;
    menuEl.innerHTML =
      '<h4>🐋 虚拟形象</h4>' +
      '<div class="aw-sec">' +
        '<div class="aw-avatars">' + avatarGridHtml() + '</div>' +
        '<button class="aw-upload-btn" id="aw-upload">📤 上传自定义形象 (PNG/JPG/GIF)</button>' +
      '</div>' +
      '<h4>⚙️ 设置</h4>' +
      '<div class="aw-sec">' +
        '<label class="aw-row">大小 <input type="range" id="aw-size" min="' + minSize + '" max="' + maxSize + '" step="0.05" value="' + settings.size + '" /><span class="aw-val">' + settings.size.toFixed(2) + '</span></label>' +
        '<label class="aw-row">音效 <input type="checkbox" id="aw-sound" ' + (settings.sound ? 'checked' : '') + ' /></label>' +
        '<label class="aw-row">音量 <input type="range" id="aw-vol" min="0" max="1" step="0.05" value="' + settings.volume + '" /><span class="aw-val">' + Math.round(settings.volume * 100) + '%</span></label>' +
        '<label class="aw-row">气泡台词 <input type="checkbox" id="aw-bubble" ' + (settings.bubbleOn ? 'checked' : '') + ' /></label>' +
      '</div>' +
      '<h4>📊 今日数据</h4>' +
      '<div class="aw-sec">' +
        '<div class="aw-stats">' +
          '<div class="aw-stat"><b>' + fmtMin(s.studyMs) + '</b><span>学习分钟</span></div>' +
          '<div class="aw-stat"><b>' + fmtMin(s.screenMs) + '</b><span>屏幕分钟</span></div>' +
        '</div>' +
        '<button class="aw-btn" id="aw-reset-pos">📍 重置位置</button>' +
        '<button class="aw-btn" id="aw-reset-stats">🧹 清零今日统计</button>' +
      '</div>';
    bindMenu();
  }
  function bindMenu() {
    var sizeInput = menuEl.querySelector('#aw-size');
    var sizeVal = menuEl.querySelector('#aw-size + .aw-val');
    if (sizeInput) sizeInput.addEventListener('input', function () {
      settings.size = parseFloat(sizeInput.value);
      applySize();
      sizeVal.textContent = settings.size.toFixed(2);
      saveSettings();
    });
    var soundBox = menuEl.querySelector('#aw-sound');
    if (soundBox) soundBox.addEventListener('change', function () {
      settings.sound = soundBox.checked;
      if (!settings.sound) audios = [];
      saveSettings();
    });
    var volInput = menuEl.querySelector('#aw-vol');
    var volVal = menuEl.querySelector('#aw-vol + .aw-val');
    if (volInput) volInput.addEventListener('input', function () {
      settings.volume = parseFloat(volInput.value);
      volVal.textContent = Math.round(settings.volume * 100) + '%';
      audios.forEach(function (a) { a.volume = settings.volume; });
      saveSettings();
    });
    var bubbleBox = menuEl.querySelector('#aw-bubble');
    if (bubbleBox) bubbleBox.addEventListener('change', function () {
      settings.bubbleOn = bubbleBox.checked;
      if (!settings.bubbleOn) hideBubble();
      saveSettings();
    });
    var uploadBtn = menuEl.querySelector('#aw-upload');
    if (uploadBtn) uploadBtn.addEventListener('click', function () {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', function () { if (input.files && input.files[0]) uploadAvatar(input.files[0]); });
      input.click();
    });
    var resetPos = menuEl.querySelector('#aw-reset-pos');
    if (resetPos) resetPos.addEventListener('click', function () {
      var r = stageRect();
      setPos(window.innerWidth - r.w - 16, window.innerHeight - r.h - 16);
      saveSettings();
    });
    var resetStats = menuEl.querySelector('#aw-reset-stats');
    if (resetStats) resetStats.addEventListener('click', function () {
      _statsCache.screenMs = 0; _statsCache.studyMs = 0; _statsCache.visits = {};
      saveStats();
      renderMenu();
      showBubble('🧹 今日统计已清零，重新出发！', true);
    });
    var avs = menuEl.querySelectorAll('.aw-av');
    for (var i = 0; i < avs.length; i++) {
      avs[i].addEventListener('click', function () {
        settings.avatar = this.getAttribute('data-avid');
        saveSettings();
        renderAvatar();
        renderMenu();
        showBubble('✨ 已切换形象！', true);
      });
    }
  }
  function uploadAvatar(file) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        // 压缩到 480px
        var max = 480, w = img.width, h = img.height;
        if (w > max || h > max) {
          var ratio = Math.min(max / w, max / h);
          w = Math.round(w * ratio); h = Math.round(h * ratio);
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var src = canvas.toDataURL('image/png');
        var id = 'custom_' + Date.now();
        customs.push({ id: id, name: file.name.replace(/\.[^.]+$/, '').slice(0, 12), src: src });
        if (customs.length > 4) customs.shift();
        saveCustoms();
        settings.avatar = id;
        saveSettings();
        renderAvatar();
        renderMenu();
        showBubble('📤 自定义形象已上传并启用！', true);
      };
      img.onerror = function () { showBubble('😢 图片加载失败，换个格式试试', true); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }
  function toggleMenu() {
    menuOpen = !menuOpen;
    stage.classList.toggle('aw-menu-open', menuOpen);
    if (menuOpen) renderMenu();
  }
  gearBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleMenu();
  });
  stage.addEventListener('pointerdown', function (e) {
    if (menuOpen && !menuEl.contains(e.target) && e.target !== gearBtn) { menuOpen = false; stage.classList.remove('aw-menu-open'); }
  });

  /* ---------- 统计 tick ---------- */
  var lastTick = Date.now();
  function tick() {
    var now = Date.now();
    var dt = now - lastTick;
    lastTick = now;
    if (document.visibilityState === 'visible' && dt < 60000) {
      var s = stats();
      s.screenMs += dt;
      if (isStudyPage()) s.studyMs += dt;
      var key = currentPage();
      if (!s.visits[key]) s.visits[key] = { count: 0, ms: 0 };
      s.visits[key].ms += dt; // 本页停留时长
      saveStats();
    }
  }
  // 页面访问计数（每次加载 +1）
  (function () {
    var s = stats();
    var key = currentPage();
    if (!s.visits[key]) s.visits[key] = { count: 0, ms: 0 };
    s.visits[key].count += 1;
    saveStats();
  })();

  /* ---------- 初始化 ---------- */
  renderAvatar();
  // 初始位置：右下角
  var r = stageRect();
  if (settings.x === null || settings.y === null) {
    setPos(window.innerWidth - r.w - 16, window.innerHeight - r.h - 16);
  } else {
    setPos(settings.x, settings.y);
  }
  setTimeout(function () { updateFlip(); }, 50);
  setInterval(tick, 5000);
  // 3 秒后打个招呼
  setTimeout(function () {
    if (settings.bubbleOn) showBubble('<div class="aw-bb-row"><span class="aw-bb-tag">🐋</span><span>你好呀！我是你的虚拟学习助手，点我聊天，悬停右上角 ⚙️ 可以设置哦~</span></div>', true);
  }, 3000);
})();
