/* ============================================================
   AIMaster 桌面宠物 - 独立透明置顶窗口渲染逻辑
   - 自主漫游（屏幕边缘转向、随机日常动作）
   - 拖拽物理（速度追踪、重力抛物、边缘反弹、摩擦停稳）
   - 睡眠 / 专注徽章 / 气泡
   - 通过 IPC 与主窗口双向通信
   ============================================================ */
(function () {
  'use strict';
  const { ipcRenderer } = require('electron');

  // ---------- 动画素材 ----------
  const ANIM_ROOT = 'file:///' + __dirname.replace(/\\/g, '/')
    .replace(/frontend\/pet-desktop$/, 'third_party/dsh-pet/dsh-pet/assets/webm/');
  const ANIM_NAMES = ["三球抛接","下五子棋","东张西望","中秋赏月吃月饼","优雅女仆舞","余额-分文不剩","余额-数金皱眉","余额-袋空如洗","余额-金袋叮当","余额-钱袋如常","余额-钱袋满溢","偷吃零食被抓住","写代码","写福字","凭空生花","动物环绕","原地专心玩魔方","原地小憩沉眠","原地左转奔跑","原地敲击桌面互动","原地漂浮踏步","原地跳跃抓碎头顶物品","原地蹲下玩玩具汽车","原地重力下蹲压缩","变鸽子","可爱宅舞","吃Token","吃冰淇淋融化","吃午餐","吃大闸蟹","吃年糕","吃早餐","吃晚餐","吃汤圆","吃白饭","吃粽子","吃糖葫芦","吃腊八粥","吃西瓜","吃重阳糕","吃长寿面","吃青团","吃饺子","吹气球","吹笛子","哈欠连天","堆雪人","大口吃零食","女仆屈膝礼仪","小幅度原地360度旋转展示","小提琴演奏","待机呼吸休闲","悠闲哼歌","扑克魔术","打瞌睡被惊醒","抽陀螺","拆礼物","插茱萸赏菊","摇扇纳凉","撸猫","收红包","放孔明灯","放河灯","放烟花","放风筝","整体换装试色","是啊，吃什么","晨间刷牙","涮火锅","深度思考碎碎念","点击回应-傲娇生气","点击回应-元气挥手","点击回应-害羞惊讶","点击回应-开心跃动","点击回应-挠痒咯咯笑","照镜子","玩水枪","玩游戏气急败坏","用鲸鱼尾巴拍打地面","碎碎念-发呆碎碎念","碎碎念-对屏碎碎念","碎碎念-擦桌碎碎念","穿针乞巧","舞狮头","荡秋千","萌化小幽灵","蓝鲸现世","蝴蝶蜜蜂环绕头顶开花","螃蟹走路","被吓一跳","被落叶淹没","被鼠标拖拽悬空反馈","装点圣诞树","讨糖南瓜灯","超大伸懒腰","踢毽子","轻快摇摆舞","轻快记录","骑木马","鲸鱼吐泡泡特效"];
  const DAILY_POOL = ['东张西望','原地漂浮踏步','原地左转奔跑','摇扇纳凉','轻快摇摆舞','悠闲哼歌','照镜子','打哈欠连天','超大伸懒腰'];
  // 时段动作池
  function timeActionPool() {
    const h = new Date().getHours();
    if (h >= 5 && h < 9) return ['晨间刷牙','哈欠连天','超大伸懒腰','原地漂浮踏步'];
    if (h >= 9 && h < 12) return ['写代码','轻快摇摆舞','东张西望','原地左转奔跑'];
    if (h >= 12 && h < 14) return ['吃午餐','悠闲哼歌','照镜子','原地漂浮踏步'];
    if (h >= 14 && h < 18) return ['写代码','摇扇纳凉','轻快记录','东张西望'];
    if (h >= 18 && h < 22) return ['吃晚餐','悠闲哼歌','照镜子','超大伸懒腰'];
    return ['原地小憩沉眠','哈欠连天','原地漂浮踏步','照镜子'];
  }
  const WHALE_SRC = 'file:///' + __dirname.replace(/\\/g, '/')
    .replace(/frontend\/pet-desktop$/, 'frontend/static/avatar-widget/assets/DSniang1.png');

  const stage = document.getElementById('pet-stage');
  const whaleImg = document.getElementById('pet-whale');
  const animVideo = document.getElementById('pet-video');
  const bubbleEl = document.getElementById('pet-bubble');
  const focusBadge = document.getElementById('pet-focus-badge');
  const sleepIcon = document.getElementById('pet-sleep-icon');

  whaleImg.src = WHALE_SRC;

  // ---------- 窗口尺寸与位置状态 ----------
  let W = 220, H = 124;
  let screenW = window.screen.width, screenH = window.screen.height;
  let x = screenW - W - 24, y = screenH - H - 80;
  let facing = -1; // -1 朝左, 1 朝右
  stage.style.width = W + 'px';
  stage.style.height = H + 'px';

  function syncWindow() {
    ipcRenderer.send('pet:move', Math.round(x), Math.round(y));
    ipcRenderer.send('pet:flip', facing < 0);
  }
  function applyPos() {
    stage.style.left = '0px';
    stage.style.top = '0px';
    syncWindow();
  }
  function screenBounds() {
    return { w: screenW, h: screenH };
  }

  // ---------- 动画播放 ----------
  let currentAnim = '';
  function playAnim(name, loop) {
    if (!name || ANIM_NAMES.indexOf(name) === -1) return;
    currentAnim = name;
    animVideo.loop = !!loop;
    animVideo.src = ANIM_ROOT + encodeURIComponent(name) + '.webm';
    animVideo.style.display = 'block';
    whaleImg.style.visibility = 'hidden';
    animVideo.play().catch(() => stopAnim());
    if (!loop) {
      animVideo.onended = () => resumeIdle();
    } else {
      animVideo.onended = null;
    }
  }
  function stopAnim() {
    try { animVideo.pause(); animVideo.removeAttribute('src'); animVideo.load(); } catch(e){}
    animVideo.style.display = 'none';
    whaleImg.style.visibility = 'visible';
  }
  function resumeIdle() {
    stopAnim();
    playAnim('待机呼吸休闲', true);
  }

  // ---------- 气泡 ----------
  let bubbleTimer = null;
  function showBubble(html, autoHide) {
    bubbleEl.innerHTML = html;
    bubbleEl.classList.add('show');
    if (bubbleTimer) clearTimeout(bubbleTimer);
    if (autoHide !== false) bubbleTimer = setTimeout(hideBubble, 5000);
  }
  function hideBubble() { bubbleEl.classList.remove('show'); }

  // ---------- 睡眠 ----------
  let sleeping = false;
  let lastInteract = Date.now();
  let sleepMin = 3;
  function touchInteract() {
    lastInteract = Date.now();
    if (sleeping) wakeUp();
  }
  function maybeSleep() {
    if (sleeping || dragging) return;
    if (focusActive) return;
    if (Date.now() - lastInteract < sleepMin * 60000) return;
    sleeping = true;
    stage.classList.add('aw-sleeping');
    playAnim('原地小憩沉眠', true);
    showBubble('💤 我先眯一会儿… 点我叫我起床', true);
  }
  function wakeUp() {
    if (!sleeping) return;
    sleeping = false;
    stage.classList.remove('aw-sleeping');
    hideBubble();
    playAnim('打瞌睡被惊醒', false);
  }

  // ---------- 专注徽章 ----------
  let focusActive = false;
  function setFocus(active, remainMs) {
    focusActive = active;
    if (!active) { focusBadge.style.display = 'none'; focusBadge.innerHTML = ''; return; }
    focusBadge.style.display = 'flex';
    const sec = Math.max(0, Math.ceil(remainMs / 1000));
    const mm = String(Math.floor(sec/60)).padStart(2,'0');
    const ss = String(sec%60).padStart(2,'0');
    focusBadge.innerHTML = '<span>🍅</span><b>' + mm + ':' + ss + '</b>';
  }

  // ---------- 自主漫游 ----------
  const WALK_SPEED = 55; // px/s
  let wanderState = 'idle'; // idle | walk
  let wanderDir = -1;
  let wanderTimer = 0;
  let wanderActionTimer = 0;
  let wanderVel = 0;
  const WALK_ANIM = '螃蟹走路';
  const TURN_ANIMS = ['东张西望','原地左转奔跑'];

  function startWander() {
    if (dragging || sleeping || focusActive) return;
    wanderState = 'walk';
    wanderDir = (Math.random() < 0.5) ? -1 : 1;
    facing = wanderDir;
    updateFlip();
    wanderTimer = 3000 + Math.random() * 4000; // 走 3-7 秒
    playAnim(WALK_ANIM, true);
  }
  function stopWander() {
    wanderState = 'idle';
    wanderVel = 0;
    resumeIdle();
  }
  function maybeTurn() {
    // 边缘检测：距离边缘不足 80px 就转向
    if (x < 80) { wanderDir = 1; facing = 1; playAnim('原地左转奔跑', false); }
    else if (x > screenW - W - 80) { wanderDir = -1; facing = -1; playAnim('原地左转奔跑', false); }
    updateFlip();
  }

  function updateFlip() {
    stage.classList.toggle('aw-flipped', facing < 0);
    syncWindow();
  }

  // ---------- 物理引擎（拖拽抛物 + 反弹） ----------
  let dragging = false;
  let dragStartX = 0, dragStartY = 0;
  let dragOrigX = 0, dragOrigY = 0;
  let velX = 0, velY = 0;
  let lastMoveX = 0, lastMoveY = 0, lastMoveT = 0;
  let draggingAnimOn = false;
  const GRAVITY = 1400; // px/s^2
  const RESTITUTION = 0.55; // 弹性系数
  const FRICTION = 0.985;
  const FLOOR_FRICTION = 0.92;
  const SETTLE_VEL = 12;

  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (sleeping) { touchInteract(); return; }
    dragging = true;
    draggingAnimOn = false;
    stage.classList.add('aw-pressed','dragging');
    dragStartX = e.screenX; dragStartY = e.screenY;
    dragOrigX = x; dragOrigY = y;
    lastMoveX = e.screenX; lastMoveY = e.screenY; lastMoveT = performance.now();
    velX = 0; velY = 0;
    wanderState = 'idle';
    stopAnim();
    try { stage.setPointerCapture(e.pointerId); } catch(_){}
    ipcRenderer.send('pet:grab', true);
  });

  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.screenX - dragStartX;
    const dy = e.screenY - dragStartY;
    x = dragOrigX + dx;
    y = dragOrigY + dy;
    // 限制在屏幕内
    x = Math.max(0, Math.min(x, screenW - W));
    y = Math.max(0, Math.min(y, screenH - H));
    applyPos();

    const now = performance.now();
    const dt = Math.max(1, now - lastMoveT) / 1000;
    velX = (e.screenX - lastMoveX) / dt;
    velY = (e.screenY - lastMoveY) / dt;
    lastMoveX = e.screenX; lastMoveY = e.screenY; lastMoveT = now;

    if (Math.abs(dx) + Math.abs(dy) > 6 && !draggingAnimOn) {
      draggingAnimOn = true;
      playAnim('被鼠标拖拽悬空反馈', true);
    }
  });

  function release() {
    if (!dragging) return;
    const wasDrag = draggingAnimOn;
    dragging = false;
    stage.classList.remove('aw-pressed','dragging');
    ipcRenderer.send('pet:grab', false);
    // 速度过大 → 抛物飞行；否则原地停住
    const speed = Math.hypot(velX, velY);
    if (speed > 300) {
      const maxV = 1600;
      if (speed > maxV) { velX = velX / speed * maxV; velY = velY / speed * maxV; }
      flying = true;
      if (draggingAnimOn) { draggingAnimOn = false; resumeIdle(); }
      requestAnimationFrame(flyStep);
    } else {
      velX = 0; velY = 0;
      if (draggingAnimOn) { draggingAnimOn = false; resumeIdle(); }
      snapToEdge();
      // 没有明显拖拽 → 视为点击，展示学习摘要
      if (!wasDrag) onPetClick();
    }
  }

  // 点击桌宠：展示学习数据摘要气泡
  function onPetClick() {
    touchInteract();
    playClickAnim();
    if (lastStats) {
      const s = lastStats;
      const html =
        '<div style="min-width:180px;font-size:12px;line-height:1.7;">' +
          '<div style="font-weight:700;color:#72f6e4;margin-bottom:4px;">📊 今日学习报告</div>' +
          '<div>📖 学习：<b>' + s.studyMin + '</b> 分钟（本周 ' + s.weekMin + ' 分钟）</div>' +
          '<div>🔥 连续打卡：<b>' + s.streak + '</b> 天</div>' +
          (s.quizCount > 0 ? '<div>✏️ 答题：<b>' + s.quizCorrect + '/' + s.quizCount + '</b>（正确率 ' + s.accuracy + '%）</div>' : '') +
          (s.focusCount > 0 ? '<div>🎯 专注：<b>' + s.focusCount + '</b> 次</div>' : '') +
          (s.chapterCount > 0 ? '<div>📚 访问章节：<b>' + s.chapterCount + '</b> 个</div>' : '') +
        '</div>';
      showBubble(html, true);
    } else {
      const lines = ['你好呀~ 今天也要加油哦！', '点我可以查看学习报告~', '和鲸鱼娘一起学习吧！', '保持专注，你可以的！'];
      showBubble(lines[Math.floor(Math.random() * lines.length)], true);
    }
  }

  function playClickAnim() {
    const clickAnims = ANIM_NAMES.filter(n => n.indexOf('点击回应') === 0);
    if (clickAnims.length) playAnim(clickAnims[Math.floor(Math.random() * clickAnims.length)], false);
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  // 右键菜单
  stage.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    ipcRenderer.send('pet:context-menu');
  });

  let flying = false;
  let lastFlyT = 0;
  function flyStep(ts) {
    if (!flying) return;
    if (!lastFlyT) lastFlyT = ts;
    let dt = (ts - lastFlyT) / 1000;
    lastFlyT = ts;
    if (dt > 0.05) dt = 0.05;

    velY += GRAVITY * dt;
    x += velX * dt;
    y += velY * dt;

    // 边缘反弹
    if (x < 0) { x = 0; velX = -velX * RESTITUTION; bounceSquash(); }
    if (x > screenW - W) { x = screenW - W; velX = -velX * RESTITUTION; bounceSquash(); }
    if (y < 0) { y = 0; velY = -velY * RESTITUTION; bounceSquash(); }
    if (y > screenH - H) {
      y = screenH - H;
      velY = -velY * RESTITUTION;
      velX *= FLOOR_FRICTION;
      bounceSquash();
      if (Math.abs(velY) < SETTLE_VEL && Math.abs(velX) < SETTLE_VEL) {
        velX = 0; velY = 0; flying = false;
        resumeIdle();
        snapToEdge();
        return;
      }
    } else {
      velX *= FRICTION;
    }
    applyPos();
    requestAnimationFrame(flyStep);
  }

  function bounceSquash() {
    stage.classList.add('aw-pressed');
    setTimeout(() => stage.classList.remove('aw-pressed'), 90);
  }

  function snapToEdge() {
    const left = x < screenW * 0.25;
    const right = x + W > screenW * 0.75;
    const top = y < screenH * 0.25;
    const bottom = y + H > screenH * 0.75;
    if (left) { x = 8; facing = 1; }
    else if (right) { x = screenW - W - 8; facing = -1; }
    if (top) y = 8;
    else if (bottom) y = screenH - H - 8;
    applyPos();
    updateFlip();
  }

  // ---------- 鼠标穿透 ----------
  // 整个窗口默认穿透，鼠标移到宠物上时取消穿透
  function updateMouseIgnore(screenX, screenY) {
    const localX = screenX - x;
    const localY = screenY - y;
    const onPet = localX >= 0 && localX <= W && localY >= 0 && localY <= H;
    ipcRenderer.send('pet:ignore-mouse', !onPet);
  }
  document.addEventListener('mousemove', (e) => {
    updateMouseIgnore(e.screenX, e.screenY);
  });
  // 初始穿透
  ipcRenderer.send('pet:ignore-mouse', true);

  // ---------- 主循环 ----------
  let lastT = performance.now();
  function loop(ts) {
    let dt = (ts - lastT) / 1000;
    lastT = ts;
    if (dt > 0.1) dt = 0.1;

    if (!dragging && !flying) {
      if (wanderState === 'walk') {
        wanderTimer -= dt * 1000;
        x += wanderDir * WALK_SPEED * dt;
        if (wanderTimer <= 0) {
          stopWander();
          wanderActionTimer = 2000 + Math.random() * 5000;
        } else {
          maybeTurn();
        }
        applyPos();
      } else {
        wanderActionTimer -= dt * 1000;
        if (wanderActionTimer <= 0) {
          // 随机决定：走 or 做小动作（优先时段动作）
          if (Math.random() < 0.6) startWander();
          else {
            const pool = timeActionPool();
            const a = pool[Math.floor(Math.random() * pool.length)];
            playAnim(a, false);
            wanderActionTimer = 6000 + Math.random() * 8000;
          }
        }
      }
    }

    maybeSleep();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ---------- IPC：接收主窗口指令 ----------
  ipcRenderer.on('pet:bubble', (e, html, autoHide) => showBubble(html, autoHide));
  ipcRenderer.on('pet:hide-bubble', () => hideBubble());
  ipcRenderer.on('pet:anim', (e, name, loop) => playAnim(name, loop));
  ipcRenderer.on('pet:idle', () => resumeIdle());
  ipcRenderer.on('pet:focus', (e, active, remainMs) => setFocus(active, remainMs));
  ipcRenderer.on('pet:greeting', (e, text) => showBubble(text, true));
  ipcRenderer.on('pet:sleep-setting', (e, on, min) => {
    if (!on && sleeping) wakeUp();
    sleepMin = min || 3;
  });
  ipcRenderer.on('pet:screen-info', (e, w, h) => {
    screenW = w; screenH = h;
  });

  // 学习数据摘要缓存（主窗口推送）
  let lastStats = null;
  ipcRenderer.on('pet:stats', (e, summary) => { lastStats = summary; });

  // 右键菜单指令
  ipcRenderer.on('pet:toggle-sleep', () => {
    if (sleeping) wakeUp(); else { sleeping = true; stage.classList.add('aw-sleeping'); playAnim('原地小憩沉眠', true); showBubble('💤 晚安…', true); }
  });
  ipcRenderer.on('pet:show-report', () => { onPetClick(); });

  // 通知主进程桌宠已就绪
  ipcRenderer.send('pet:ready');

  // 初始化：待机呼吸
  playAnim('待机呼吸休闲', true);
  updateFlip();

  // 窗口尺寸变化时同步屏幕尺寸
  window.addEventListener('resize', () => {
    screenW = window.screen.width;
    screenH = window.screen.height;
  });
})();
