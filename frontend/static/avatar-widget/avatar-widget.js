/* ============================================================
   AI Master 虚拟形象助手 (Avatar Widget)
   - 浮动虚拟形象（可拖拽、四边吸附、按压 Q 弹）
   - 更多预设形象 + 上传自定义形象 + 本地 DIY 生成形象
   - 学习状态监控 + 精确统计 + 休息提醒 + 成就系统
   - 今日学习总结与下一步建议
   交互设计参考: MeteorNOX/DeepSeek-Balance-Whale-Widget (MIT)
   ============================================================ */
(function () {
  'use strict';
  if (window.__aimasterAvatarLoaded) return;
  window.__aimasterAvatarLoaded = true;
  var PET_ANIM_NAMES = ["三球抛接", "下五子棋", "东张西望", "中秋赏月吃月饼", "优雅女仆舞", "余额-分文不剩", "余额-数金皱眉", "余额-袋空如洗", "余额-金袋叮当", "余额-钱袋如常", "余额-钱袋满溢", "偷吃零食被抓住", "写代码", "写福字", "凭空生花", "动物环绕", "原地专心玩魔方", "原地小憩沉眠", "原地左转奔跑", "原地敲击桌面互动", "原地漂浮踏步", "原地跳跃抓碎头顶物品", "原地蹲下玩玩具汽车", "原地重力下蹲压缩", "变鸽子", "可爱宅舞", "吃Token", "吃冰淇淋融化", "吃午餐", "吃大闸蟹", "吃年糕", "吃早餐", "吃晚餐", "吃汤圆", "吃白饭", "吃粽子", "吃糖葫芦", "吃腊八粥", "吃西瓜", "吃重阳糕", "吃长寿面", "吃青团", "吃饺子", "吹气球", "吹笛子", "哈欠连天", "堆雪人", "大口吃零食", "女仆屈膝礼仪", "小幅度原地360度旋转展示", "小提琴演奏", "待机呼吸休闲", "悠闲哼歌", "扑克魔术", "打瞌睡被惊醒", "抽陀螺", "拆礼物", "插茱萸赏菊", "摇扇纳凉", "撸猫", "收红包", "放孔明灯", "放河灯", "放烟花", "放风筝", "整体换装试色", "是啊，吃什么", "晨间刷牙", "涮火锅", "深度思考碎碎念", "点击回应-傲娇生气", "点击回应-元气挥手", "点击回应-害羞惊讶", "点击回应-开心跃动", "点击回应-挠痒咯咯笑", "照镜子", "玩水枪", "玩游戏气急败坏", "用鲸鱼尾巴拍打地面", "碎碎念-发呆碎碎念", "碎碎念-对屏碎碎念", "碎碎念-擦桌碎碎念", "穿针乞巧", "舞狮头", "荡秋千", "萌化小幽灵", "蓝鲸现世", "蝴蝶蜜蜂环绕头顶开花", "螃蟹走路", "被吓一跳", "被落叶淹没", "被鼠标拖拽悬空反馈", "装点圣诞树", "讨糖南瓜灯", "超大伸懒腰", "踢毽子", "轻快摇摆舞", "轻快记录", "骑木马", "鲸鱼吐泡泡特效"];

  var script = document.currentScript;
  var BASE = script ? script.src.replace(/[^/]*$/, '') : '';
  // 由挂件目录反推项目根目录，用于在 HTTP / file:// / 子路径部署下准确识别页面
  var PROJECT_ROOT = (function () {
    try { return BASE.replace(/frontend\/static\/avatar-widget\/$/, ''); }
    catch (e) { return BASE; }
  })();

  /* ---------- 预设形象 ---------- */
  function svgAvatar(body) {
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>" + body + "</svg>";
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  var PRESET_AVATARS = [
    { id: 'whale1',  name: '鲸鱼娘',  src: BASE + 'assets/DSniang1.png' }
  ];

  /* ---------- DIY 形象生成 ---------- */
  var DIY_SHAPES = [
    { id: 'circle', name: '圆形' },
    { id: 'square', name: '圆角方块' },
    { id: 'star',   name: '星星' },
    { id: 'heart',  name: '爱心' }
  ];
  var DIY_COLORS = ['#4f8cff', '#72f6e4', '#ff8fa3', '#ffd75e', '#9be88d', '#b28cff', '#f7a23b', '#f2f2f2'];
  var DIY_EYES = {
    round: "<circle cx='78' cy='108' r='7' fill='#2b2b2b'/><circle cx='122' cy='108' r='7' fill='#2b2b2b'/><circle cx='80' cy='106' r='2.6' fill='#fff'/><circle cx='124' cy='106' r='2.6' fill='#fff'/>",
    happy: "<path d='M74 108 Q80 98 86 108' stroke='#2b2b2b' stroke-width='5' fill='none' stroke-linecap='round'/><path d='M114 108 Q120 98 126 108' stroke='#2b2b2b' stroke-width='5' fill='none' stroke-linecap='round'/>",
    star: "<polygon points='78,100 80,105 85,105 81,108 83,113 78,110 73,113 75,108 71,105 76,105' fill='#2b2b2b'/><polygon points='122,100 124,105 129,105 125,108 127,113 122,110 117,113 119,108 115,105 120,105' fill='#2b2b2b'/>"
  };
  var DIY_MOUTHS = {
    smile: "<path d='M86 134 Q100 148 114 134' stroke='#2b2b2b' stroke-width='4' fill='none' stroke-linecap='round'/>",
    open: "<ellipse cx='100' cy='140' rx='10' ry='14' fill='#5b2c2c'/><ellipse cx='100' cy='134' rx='6' ry='5' fill='#ff8fa3'/>",
    cat: "<path d='M90 142 L100 132 L110 142' stroke='#2b2b2b' stroke-width='4' fill='none' stroke-linecap='round' stroke-linejoin='round'/>"
  };
  var DIY_ACCESSORIES = {
    none: '',
    bow: "<path d='M94 52 L80 38 L80 66 Z' fill='#ff8fa3'/><path d='M106 52 L120 38 L120 66 Z' fill='#ff8fa3'/><circle cx='100' cy='52' r='8' fill='#e76f8f'/>",
    glasses: "<circle cx='78' cy='108' r='16' fill='none' stroke='#2b2b2b' stroke-width='3'/><circle cx='122' cy='108' r='16' fill='none' stroke='#2b2b2b' stroke-width='3'/><path d='M94 108 L106 108' stroke='#2b2b2b' stroke-width='3'/>",
    crown: "<polygon points='70,42 82,54 94,42 106,54 118,42 130,54 130,64 70,64' fill='#ffd75e'/><polygon points='70,42 82,54 94,42 106,54 118,42 130,54 130,58 118,46 106,58 94,46 82,58 70,46' fill='#fff2a8'/>",
    halo: "<ellipse cx='100' cy='34' rx='30' ry='8' fill='#fff8d0' stroke='#ffd75e' stroke-width='2'/>"
  };
  var builderOpen = false;
  var builderState = { shape: 'circle', color: '#4f8cff', eye: 'round', mouth: 'smile', accessory: 'none' };

  function buildAvatarSrc(state) {
    var body = '';
    var color = state.color || '#4f8cff';
    if (state.shape === 'square') {
      body += "<rect x='34' y='52' width='132' height='128' rx='26' fill='" + color + "'/>";
    } else if (state.shape === 'star') {
      body += "<polygon points='100,20 122,78 184,82 136,122 150,182 100,148 50,182 64,122 16,82 78,78' fill='" + color + "'/>";
    } else if (state.shape === 'heart') {
      body += "<path d='M100 170 C40 122 18 76 54 52 C84 32 100 54 100 68 C100 54 116 32 146 52 C182 76 160 122 100 170 Z' fill='" + color + "'/>";
    } else {
      body += "<circle cx='100' cy='116' r='68' fill='" + color + "'/>";
    }
    body += "<circle cx='68' cy='128' r='9' fill='rgba(255,255,255,0.3)'/><circle cx='132' cy='128' r='9' fill='rgba(255,255,255,0.3)'/>";
    body += (DIY_EYES[state.eye] || DIY_EYES.round);
    body += (DIY_MOUTHS[state.mouth] || DIY_MOUTHS.smile);
    body += (DIY_ACCESSORIES[state.accessory] || '');
    return svgAvatar(body);
  }

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
    { w: 2, text: function () { var g = greetingText(); return g.hi + g.note; } },
    { w: 1, text: function () { return '哦鲸鲸... '; } },
    { w: 1, text: function () { return '我去吃饭啦，学完叫我~'; } }
  ];

  /* ---------- 时段问候 ---------- */
  function greetingText() {
    var h = new Date().getHours();
    if (h >= 5 && h < 11) return { hi: '☀️ 早上好！', note: '新的一天，从点亮一颗知识星开始吧' };
    if (h >= 11 && h < 14) return { hi: '🍚 中午好！', note: '按时吃饭，下午更有精神' };
    if (h >= 14 && h < 18) return { hi: '🌤️ 下午好！', note: '现在的你一学一个准' };
    if (h >= 18 && h < 23) return { hi: '🌙 晚上好！', note: '今天学到的，都是明天的底气' };
    return { hi: '🌌 夜深了！', note: '别熬太晚，记得早点休息' };
  }

  /* ---------- 存储 ---------- */
  var SETTINGS_KEY = 'aimaster_avatar_settings';
  var STATS_KEY = 'aimaster_avatar_stats';
  var CUSTOM_KEY = 'aimaster_avatar_customs';
  var ACHIEVE_KEY = 'aimaster_avatar_achievements';
  var HISTORY_KEY = 'aimaster_avatar_history';
  function lsGet(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { } }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  var DEFAULT_SETTINGS = {
    avatar: 'whale1',
    size: 1,
    sound: true,
    volume: 0.6,
    bubbleOn: true,
    x: null,
    y: null,
    remindRest: true,
    restIntervalMin: 45,
    dailyGoalMin: 30,
    bgImage: '',
    bgOpacity: 0.55,
    bgBlur: 18,
    sleepOn: true,
    sleepMin: 3,
    voiceOn: true,
    voiceRate: 1
  };
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
  function addCustom(c) {
    customs.push(c);
    if (customs.length > 8) {
      var removed = customs.shift();
      if (settings.avatar === removed.id) {
        settings.avatar = customs.length ? customs[0].id : 'whale1';
        saveSettings();
      }
    }
    saveCustoms();
  }

  var achievements = lsGet(ACHIEVE_KEY) || {};
  function saveAchievements() { lsSet(ACHIEVE_KEY, achievements); }

  var _statsCache = null;
  function normalizeStats(s) {
    if (!s.visits) s.visits = {};
    if (!s.chapters) s.chapters = {};
    if (s.continuousMs === undefined) s.continuousMs = 0;
    if (!s.lastStudyTick) s.lastStudyTick = Date.now();
    if (!s.lastRestAt) s.lastRestAt = 0;
    if (!s.restCount) s.restCount = 0;
    if (!s.quizCount) s.quizCount = 0;
    if (!s.quizCorrect) s.quizCorrect = 0;
    if (!s.focusCount) s.focusCount = 0;
    if (!s.focusMs) s.focusMs = 0;
    return s;
  }
  function pushHistory(s) {
    if (!s || !s.date) return;
    var h = lsGet(HISTORY_KEY) || [];
    h.push({ date: s.date, studyMs: s.studyMs || 0, screenMs: s.screenMs || 0 });
    if (h.length > 90) h = h.slice(-90);
    lsSet(HISTORY_KEY, h);
  }
  function stats() {
    var d = todayKey();
    if (!_statsCache || _statsCache.date !== d) {
      var s = lsGet(STATS_KEY);
      if (s && s.date === d) {
        _statsCache = normalizeStats(s);
      } else {
        // 归档昨日
        if (s) {
          pushHistory(s);
          try { localStorage.setItem('aimaster_avatar_stats_' + s.date, JSON.stringify(s)); } catch (e) { }
        }
        _statsCache = normalizeStats({ date: d, screenMs: 0, studyMs: 0, continuousMs: 0, lastStudyTick: Date.now(), lastRestAt: 0, restCount: 0, visits: {}, chapters: {} });
        lsSet(STATS_KEY, _statsCache);
      }
    }
    return _statsCache;
  }
  function saveStats() { lsSet(STATS_KEY, _statsCache); }
  function dayStudyMs(dateStr) {
    var s = lsGet(STATS_KEY);
    if (s && s.date === dateStr) return s.studyMs || 0;
    var h = lsGet(HISTORY_KEY) || [];
    for (var i = 0; i < h.length; i++) {
      if (h[i].date === dateStr) return h[i].studyMs || 0;
    }
    return 0;
  }
  function streakDays() {
    var STREAK_MIN_MS = 10 * 60000;
    var count = 0;
    var cur = new Date();
    if (dayStudyMs(todayKey()) < STREAK_MIN_MS) cur.setDate(cur.getDate() - 1);
    for (var i = 0; i < 365; i++) {
      if (dayStudyMs(dateKey(cur)) >= STREAK_MIN_MS) {
        count++;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }

  /* ---------- 成就定义 ---------- */
  var ACHIEVEMENT_DEFS = [
    { id: 'first_study',   name: '初次启航',   icon: '🚀', desc: '今天第一次开始学习', check: function (s) { return s.studyMs >= 60000; } },
    { id: 'study_10',      name: '学习 10 分钟', icon: '⏳', desc: '单日学习满 10 分钟', check: function (s) { return s.studyMs >= 10 * 60000; } },
    { id: 'study_30',      name: '学习 30 分钟', icon: '📗', desc: '单日学习满 30 分钟', check: function (s) { return s.studyMs >= 30 * 60000; } },
    { id: 'study_60',      name: '学习 60 分钟', icon: '📘', desc: '单日学习满 60 分钟', check: function (s) { return s.studyMs >= 60 * 60000; } },
    { id: 'study_120',     name: '学习 120 分钟', icon: '📚', desc: '单日学习满 120 分钟', check: function (s) { return s.studyMs >= 120 * 60000; } },
    { id: 'chapter_1',     name: '初见知识星球', icon: '🌍', desc: '第一次进入章节页', check: function (s) { return Object.keys(s.chapters || {}).length >= 1; } },
    { id: 'chapter_5',     name: '星际探索者', icon: '🧭', desc: '进入过 5 个不同章节', check: function (s) { return Object.keys(s.chapters || {}).length >= 5; } },
    { id: 'chapter_10',    name: '星际领航员', icon: '🌟', desc: '进入过全部 10 个章节', check: function (s) { return Object.keys(s.chapters || {}).length >= 10; } },
    { id: 'custom_avatar', name: '形象设计师', icon: '🎨', desc: '使用自定义或生成形象', check: function () { return settings.avatar && (settings.avatar.indexOf('custom_') === 0 || settings.avatar.indexOf('diy_') === 0); } },
    { id: 'rest_1',        name: '懂得休息',   icon: '💤', desc: '收到第 1 次休息提醒', check: function (s) { return (s.restCount || 0) >= 1; } },
    { id: 'rest_3',        name: '劳逸结合',   icon: '🍵', desc: '收到 3 次休息提醒', check: function (s) { return (s.restCount || 0) >= 3; } },
    { id: 'streak_3',      name: '三日之约',   icon: '🔥', desc: '连续 3 天每天学习 10 分钟以上', check: function () { return streakDays() >= 3; } },
    { id: 'goal_done',     name: '达成目标',   icon: '🎯', desc: '单日学习达到设定目标', check: function (s) { return s.studyMs >= (settings.dailyGoalMin || 30) * 60000; } },
    { id: 'quiz_first',    name: '初次交手',   icon: '✏️', desc: '在随机提问中答对第 1 题', check: function (s) { return (s.quizCorrect || 0) >= 1; } },
    { id: 'quiz_10',       name: '刷题小能手', icon: '📝', desc: '累计答对 10 题', check: function (s) { return (s.quizCorrect || 0) >= 10; } },
    { id: 'focus_first',   name: '心流初体验', icon: '🍅', desc: '完成第 1 次番茄钟专注', check: function (s) { return (s.focusCount || 0) >= 1; } },
    { id: 'focus_5',       name: '专注老手',   icon: '🧘', desc: '累计完成 5 次番茄钟专注', check: function (s) { return (s.focusCount || 0) >= 5; } }
  ];
  function unlockAchievements(s) {
    var newly = [];
    for (var i = 0; i < ACHIEVEMENT_DEFS.length; i++) {
      var def = ACHIEVEMENT_DEFS[i];
      if (!achievements[def.id] && def.check(s)) {
        achievements[def.id] = Date.now();
        newly.push(def);
      }
    }
    if (newly.length) saveAchievements();
    return newly;
  }
  function showAchievementBubble(newly) {
    if (!newly || !newly.length) return;
    var names = newly.map(function (d) { return d.icon + ' ' + d.name; }).join('、');
    showBubble('<div class="aw-bb-row"><span class="aw-bb-tag">🏆 成就解锁</span><span>' + names + '</span></div>', true);
  }
  // 记录一次答题结果（统计 + 成就）
  function recordQuizResult(correct) {
    var s = stats();
    s.quizCount = (s.quizCount || 0) + 1;
    if (correct) s.quizCorrect = (s.quizCorrect || 0) + 1;
    saveStats();
    var newly = unlockAchievements(s);
    if (newly && newly.length) showAchievementBubble(newly);
  }

  /* ---------- 页面学习判定（基于项目根目录的相对路径） ---------- */
  function currentPage() {
    try {
      var href = location.href.replace(/\\/g, '/');
      if (PROJECT_ROOT && href.indexOf(PROJECT_ROOT) === 0) {
        var rel = href.slice(PROJECT_ROOT.length).split('?')[0];
        if (!rel || rel === '/' || rel === '/index.html') return '/index.html';
        if (rel.charAt(0) !== '/') rel = '/' + rel;
        return rel;
      }
    } catch (e) { }
    var p = location.pathname.replace(/\\/g, '/');
    if (!p || p === '/' || p === '/index.html') return '/index.html';
    return p;
  }
  // 非学习页：首页/登录页/推广页/视频页/前端入口/历史对话工具
  var NON_STUDY_RE = /^\/(index|login|aimaster-promo|agent-video|frontend\/index|frontend\/history(?:\/|$))/;
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

  /* ---------- 学习总结与建议 ---------- */
  function nextStepText() {
    var s = stats();
    var studyMin = Math.floor(s.studyMs / 60000);
    var contMin = Math.floor((s.continuousMs || 0) / 60000);
    var restInterval = settings.restIntervalMin || 45;
    if (contMin >= restInterval) return '你已经连续学习较久，建议先休息 5-10 分钟，再回来做一个小练习巩固。';
    if (studyMin < 10) return '今天刚开始，建议先完成 1 个章节或小实验，慢慢积累到 ' + (settings.dailyGoalMin || 30) + ' 分钟目标。';
    if (studyMin < 30) return '继续推进当前章节，试试进入对应 CG 互动页或实验游戏加深理解。';
    if (studyMin < 60) return '状态不错！接下来可以做一次费曼讲解，或完成一个实验来检验掌握度。';
    if (studyMin >= (settings.dailyGoalMin || 30)) return '今天学习量已经很足，适合做复盘总结；把今天学到的知识点用自己的话写下来。';
    return '继续保持节奏，按当前进度完成今天的章节目标。';
  }
  function learningSummaryHtml() {
    var s = stats();
    var studyMin = Math.floor(s.studyMs / 60000);
    var screenMin = Math.floor(s.screenMs / 60000);
    var contMin = Math.floor((s.continuousMs || 0) / 60000);
    var chapterCount = Object.keys(s.chapters || {}).length;
    var html = '<div class="aw-bb-row"><span class="aw-bb-tag">今日总结</span><span>学习 ' + studyMin + ' 分钟 · 屏幕 ' + screenMin + ' 分钟</span></div>';
    if (contMin > 0) html += '<div class="aw-bb-row"><span class="aw-bb-tag">连续学习</span><span>' + contMin + ' 分钟</span></div>';
    if (chapterCount > 0) html += '<div class="aw-bb-row"><span class="aw-bb-tag">章节足迹</span><span>已到过 ' + chapterCount + ' 个章节</span></div>';
    html += '<div class="aw-bb-row"><span class="aw-bb-tag">下一步</span><span>' + nextStepText() + '</span></div>';
    return html;
  }

  /* ---------- 构建 DOM ---------- */
  var root = document.createElement('div');
  root.id = 'aimaster-avatar-root';
  root.innerHTML =
    '<div class="aw-stage" id="aw-stage">' +
      '<img class="aw-whale" id="aw-whale" alt="虚拟形象" draggable="false" />' +
      '<video class="aw-whale-video" id="aw-anim-video" autoplay muted playsinline></video>' +
      '<div class="aw-gear" id="aw-gear" title="设置">⚙️</div>' +
      '<div class="aw-focus-badge" id="aw-focus-badge"></div>' +
      '<div class="aw-bubble" id="aw-bubble"></div>' +
      '<div class="aw-menu" id="aw-menu"></div>' +
    '</div>';
  document.documentElement.appendChild(root);
  var stage = root.querySelector('#aw-stage');
  var whaleImg = root.querySelector('#aw-whale');
  var bubbleEl = root.querySelector('#aw-bubble');
  var menuEl = root.querySelector('#aw-menu');
  var gearBtn = root.querySelector('#aw-gear');
  var animVideo = root.querySelector('#aw-anim-video');
  var focusBadge = root.querySelector('#aw-focus-badge');
  var PET_ANIM_ROOT = PROJECT_ROOT + 'third_party/dsh-pet/dsh-pet/assets/webm/';
  var petAnimNames = (window.DSH_PET_ANIMATIONS || PET_ANIM_NAMES || []).slice();

  /* ---------- 音效 ---------- */
  var audios = [];
  var SOUND_FILES = ['Ya1.mp3'];
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
    if (settings.avatar === 'whale1') {
      playPetAnimation('待机呼吸休闲', true);
    } else {
      stopPetAnimation();
    }
    applySize();
  }
  function applySize() {
    root.style.setProperty('--aw-scale', settings.size);
    updateStageSize();
  }
  function activeMediaEl() {
    if (settings.avatar === 'whale1' && animVideo && animVideo.style.display === 'block') return animVideo;
    return whaleImg;
  }
  function updateStageSize() {
    var media = activeMediaEl();
    var iw = 1, ih = 1;
    if (media === animVideo) {
      iw = animVideo.videoWidth || 220;
      ih = animVideo.videoHeight || 124;
    } else {
      iw = whaleImg.naturalWidth || 610;
      ih = whaleImg.naturalHeight || 610;
    }
    var scale = settings.size || 1;
    var w = 150 * scale;
    var h = w * (ih / iw);
    // 保持中心底部不变
    var oldW = stage.offsetWidth, oldH = stage.offsetHeight;
    var oldLeft = parseInt(stage.style.left, 10) || 0;
    var oldTop = parseInt(stage.style.top, 10) || 0;
    var centerX = oldLeft + oldW / 2;
    var bottomY = oldTop + oldH;
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    var newW = stage.offsetWidth, newH = stage.offsetHeight;
    setPos(centerX - newW / 2, bottomY - newH);
    updateFlip();
  }
  function applyBgSettings() {
    var img = settings.bgImage || '';
    root.style.setProperty('--aw-bg-image', img ? 'url("' + img.replace(/"/g, '\\"') + '")' : 'none');
    root.style.setProperty('--aw-bg-opacity', settings.bgOpacity != null ? settings.bgOpacity : 0.55);
    root.style.setProperty('--aw-bg-blur', settings.bgBlur != null ? settings.bgBlur : 18);
  }

  /* ---------- dsh-pet 动画播放 ---------- */
  function stopPetAnimation() {
    if (!animVideo) return;
    try {
      animVideo.pause();
      animVideo.removeAttribute('src');
      animVideo.load();
    } catch (e) { }
    animVideo.style.display = 'none';
    whaleImg.style.visibility = 'visible';
    clearTimeout(playPetAnimation._t);
  }
  function playPetAnimation(name, loop) {
    if (!animVideo || settings.avatar !== 'whale1') { stopPetAnimation(); return; }
    if (!name || !petAnimNames.length) return;
    var src = PET_ANIM_ROOT + encodeURIComponent(name) + '.webm';
    animVideo.loop = !!loop;
    animVideo.src = src;
    animVideo.style.display = 'block';
    whaleImg.style.visibility = 'hidden';
    animVideo.play().catch(function () { stopPetAnimation(); });
    function resumeIdle() {
      stopPetAnimation();
      if (settings.avatar === 'whale1') playPetAnimation('待机呼吸休闲', true);
    }
    if (!loop) {
      animVideo.onended = resumeIdle;
      clearTimeout(playPetAnimation._t);
      playPetAnimation._t = setTimeout(resumeIdle, 12000);
    } else {
      animVideo.onended = null;
      clearTimeout(playPetAnimation._t);
    }
  }

  /* ---------- 智能睡眠（无交互自动入睡，点击唤醒） ---------- */
  var SLEEP_KEY = 'aimaster_avatar_last_interact';
  var sleeping = false;
  var lastInteractAt = (function () {
    try { var v = parseInt(localStorage.getItem(SLEEP_KEY), 10); return v || Date.now(); }
    catch (e) { return Date.now(); }
  })();
  var wokeJustNow = false;
  function touchInteract() {
    lastInteractAt = Date.now();
    try { localStorage.setItem(SLEEP_KEY, String(lastInteractAt)); } catch (e) { }
    if (sleeping) wakeUp();
  }
  function maybeSleep() {
    if (!settings.sleepOn || sleeping || menuOpen || dragging) return;
    if (focus.active) return; // 专注期间不入睡
    if (settings.avatar !== 'whale1') return;
    if (document.visibilityState !== 'visible') return;
    if (bubbleEl.querySelector('#aw-qa-input')) return;
    if (bubbleEl.querySelector('#aw-quiz-input')) return;
    var interval = Math.max(1, (settings.sleepMin || 3)) * 60000;
    if (Date.now() - lastInteractAt < interval) return;
    sleeping = true;
    stage.classList.add('aw-sleeping');
    playPetAnimation('原地小憩沉眠', true);
    showBubble('💤 我困得不行了，先眯一会儿… 点我叫我起床', true);
  }
  function wakeUp() {
    if (!sleeping) return;
    sleeping = false;
    wokeJustNow = true;
    stage.classList.remove('aw-sleeping');
    hideBubble();
    playPetAnimation('打瞌睡被惊醒', false);
  }

  /* ---------- TTS 语音播报 ---------- */
  function awSpeak(text) {
    if (!settings.voiceOn) return;
    try { if (!('speechSynthesis' in window)) return; } catch (e) { return; }
    var t = String(text || '')
      .replace(/<[^>]*>/g, '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{FE0F}\u{200D}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}]/gu, '')
      .replace(/\s+/g, ' ').trim();
    if (!t) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(t);
      u.lang = 'zh-CN';
      u.rate = settings.voiceRate || 1;
      var voices = speechSynthesis.getVoices();
      var v = null;
      for (var i = 0; i < voices.length; i++) { if (/^zh/i.test(voices[i].lang)) { v = voices[i]; break; } }
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) { }
  }

  /* ---------- 番茄钟专注模式 ---------- */
  var focus = { active: false, remain: 0, total: 0, timer: null, paused: false };
  function fmtClock(ms) {
    var sec = Math.max(0, Math.ceil(ms / 1000));
    var mm = Math.floor(sec / 60), ss = sec % 60;
    return String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }
  function renderFocusBadge() {
    if (!focus.active) { focusBadge.style.display = 'none'; focusBadge.innerHTML = ''; return; }
    focusBadge.style.display = 'flex';
    focusBadge.innerHTML =
      '<span>🍅</span><b>' + fmtClock(focus.remain) + '</b>' +
      '<button data-fp="pause" title="继续/暂停">' + (focus.paused ? '▶' : '⏸') + '</button>' +
      '<button data-fp="cancel" title="结束">✕</button>';
  }
  function startFocus(min) {
    if (focus.active) return;
    var m = Math.max(1, Math.min(120, parseInt(min, 10) || 25));
    focus.active = true; focus.paused = false;
    focus.total = m * 60000; focus.remain = focus.total;
    stage.classList.add('aw-focus');
    if (settings.avatar === 'whale1') playPetAnimation('写代码', false);
    showBubble('<div class="aw-bb-row"><span class="aw-bb-tag">🍅 专注开始</span><span>静心奋斗 ' + m + ' 分钟，鲸鱼娘为你守时~</span></div>', true);
    awSpeak('专注开始，' + m + ' 分钟，加油！');
    renderFocusBadge();
    if (focus.timer) clearInterval(focus.timer);
    focus.timer = setInterval(function () {
      if (!focus.active || focus.paused) return;
      focus.remain -= 1000;
      if (focus.remain <= 0) { focus.remain = 0; completeFocus(); return; }
      renderFocusBadge();
    }, 1000);
    if (menuOpen) renderMenu();
  }
  function pauseFocus(toggle) {
    if (!focus.active) return;
    if (toggle) focus.paused = !focus.paused;
    else focus.paused = true;
    renderFocusBadge();
  }
  function completeFocus() {
    focus.active = false;
    if (focus.timer) clearInterval(focus.timer);
    stage.classList.remove('aw-focus');
    renderFocusBadge();
    var mins = Math.max(1, Math.round(focus.total / 60000));
    var s = stats();
    s.focusCount = (s.focusCount || 0) + 1;
    s.focusMs = (s.focusMs || 0) + focus.total;
    saveStats();
    if (settings.avatar === 'whale1') playPetAnimation('放烟花', false);
    showBubble('<div class="aw-bb-row"><span class="aw-bb-tag">🎉 专注完成</span><span>完成 ' + mins + ' 分钟专注，去喝口水放松一下吧~</span></div>', true);
    awSpeak('专注完成，' + mins + ' 分钟，太棒了！');
    var newly = unlockAchievements(s);
    if (newly && newly.length) showAchievementBubble(newly);
    if (menuOpen) renderMenu();
  }
  function cancelFocus() {
    if (!focus.active) return;
    focus.active = false;
    if (focus.timer) clearInterval(focus.timer);
    stage.classList.remove('aw-focus');
    renderFocusBadge();
    showBubble('🍅 本次专注已结束', true);
  }
  focusBadge.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-fp]');
    if (!btn) return;
    touchInteract();
    if (btn.getAttribute('data-fp') === 'pause') pauseFocus(true);
    else cancelFocus();
  });

  /* ---------- 点击命中检测（只允许点击到人物实体才触发声音/拖拽） ---------- */
  function mediaContentRect(el) {
    var box = el.getBoundingClientRect();
    var iw = el.naturalWidth || el.videoWidth || 1;
    var ih = el.naturalHeight || el.videoHeight || 1;
    var scale = Math.min(box.width / iw, box.height / ih);
    var w = iw * scale, h = ih * scale;
    return { x: box.left + (box.width - w) / 2, y: box.top + (box.height - h) / 2, w: w, h: h };
  }
  function isPixelHit(e) {
    try {
      var media = (animVideo && animVideo.style.display === 'block') ? animVideo : whaleImg;
      var rect = mediaContentRect(media);
      var px = e.clientX - rect.x;
      var py = e.clientY - rect.y;
      if (px < 0 || py < 0 || px > rect.w || py > rect.h) return false;
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(rect.w));
      canvas.height = Math.max(1, Math.round(rect.h));
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
      var d = ctx.getImageData(Math.round(px), Math.round(py), 1, 1).data;
      return d[3] > 20;
    } catch (e) {
      return true;
    }
  }

  /* ---------- 拖拽与吸附 ---------- */
  var dragging = false, moved = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
  var dragAnimOn = false; // 拖拽中是否已播放悬空反馈动画
  function stageRect() { return { w: stage.offsetWidth, h: stage.offsetHeight }; }
  function setPos(x, y) {
    var r = stageRect();
    x = Math.max(0, Math.min(x, Math.max(0, window.innerWidth - r.w)));
    y = Math.max(0, Math.min(y, Math.max(0, window.innerHeight - r.h)));
    stage.style.left = x + 'px';
    stage.style.top = y + 'px';
    settings.x = x; settings.y = y;
    updateFlip();
  }
  function updateFlip() {
    // 菜单打开时不翻转，避免菜单/滑块被镜像导致抖动
    if (menuOpen) {
      stage.classList.remove('aw-flipped');
      return;
    }
    var r = stageRect();
    var x = parseInt(stage.style.left, 10) || 0;
    var flipped = x < (window.innerWidth - r.w) / 2;
    stage.classList.toggle('aw-flipped', flipped);
  }
  stage.addEventListener('pointerdown', function (e) {
    if (e.target === gearBtn || menuEl.contains(e.target) || bubbleEl.contains(e.target)) return;
    if (!isPixelHit(e)) return; // 只允许点击到人物实体才触发拖拽/声音
    if (sleeping) { touchInteract(); return; } // 睡梦中：第一次点击仅唤醒，不拖拽
    if (e.button !== 0) return; // 仅左键拖拽/声音，右键留给菜单
    dragging = true; moved = false;
    stage.classList.add('aw-pressed');
    playPress();
    var r = stageRect();
    startX = e.clientX; startY = e.clientY;
    startLeft = parseInt(stage.style.left, 10) || (window.innerWidth - r.w - 16);
    startTop = parseInt(stage.style.top, 10) || (window.innerHeight - r.h - 16);
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 合成事件等场景无活跃指针，忽略 */ }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) {
      moved = true;
      // 拖拽悬空反馈动画（循环播到松手）
      if (!dragAnimOn && settings.avatar === 'whale1' && petAnimNames.indexOf('被鼠标拖拽悬空反馈') !== -1) {
        dragAnimOn = true;
        playPetAnimation('被鼠标拖拽悬空反馈', true);
      }
    }
    setPos(startLeft + dx, startTop + dy);
  });
  function release() {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('aw-pressed');
    if (dragAnimOn) {
      dragAnimOn = false;
      if (settings.avatar === 'whale1') playPetAnimation('待机呼吸休闲', true);
    }
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

  // 右键打开功能菜单（替代齿轮按钮）
  stage.addEventListener('contextmenu', function (e) {
    if (menuEl.contains(e.target) || bubbleEl.contains(e.target) || e.target === gearBtn) return;
    if (!isPixelHit(e)) return;
    e.preventDefault();
    touchInteract();
    if (!menuOpen) toggleMenu();
  });

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
           '<div class="aw-bb-row"><span class="aw-bb-tag">本页访问</span><span>' + v.count + ' 次</span></div>' +
           '<div class="aw-bb-row"><span class="aw-bb-tag">建议</span><span>' + nextStepText() + '</span></div>';
  }
  function cycleBubble() {
    if (!settings.bubbleOn) return;
    if (focus.active) return; // 专注期间不弹随机台词
    var r = Math.random();
    if (r < 0.06) {
      showBubble('<img class="aw-gif" src="' + BASE + 'assets/rua.gif" alt="rua" />', true);
    } else if (r < 0.30) {
      showBubble(statusBubbleHtml(), true);
    } else {
      showBubble('<div class="aw-bb-row"><span class="aw-bb-tag">🐋</span><span>' + randomLine() + '</span></div>', true);
    }
  }
  whaleImg.addEventListener('click', function (e) {
    touchInteract(); // 记录最近交互（防止入睡）
    if (moved) return;
    if (!isPixelHit(e)) return; // 点击到透明区域不触发问答/声音
    if (wokeJustNow) { wokeJustNow = false; return; } // 刚被唤醒的这次点击只算“起床”
    // 播放一个“点击回应”动画
    if (settings.avatar === 'whale1') {
      var clickAnims = petAnimNames.filter(function (n) { return n.indexOf('点击回应') === 0; });
      if (clickAnims.length) {
        playPetAnimation(clickAnims[Math.floor(Math.random() * clickAnims.length)], false);
      }
    }
    // 直接弹出快速提问
    showQuickQuiz();
  });
  bubbleEl.addEventListener('click', function (e) {
    // 桌宠问答/快速提问打开时，点击内部控件不关闭气泡
    if (bubbleEl.querySelector('#aw-qa-input')) return;
    if (bubbleEl.querySelector('#aw-quiz-input')) return;
    hideBubble();
  });

  // 接收刷题页等页面发来的桌宠状态事件
  window.addEventListener('aimaster-pet-state', function (e) {
    if (bubbleEl.querySelector('#aw-qa-input')) return; // 问答打开时不打扰
    if (bubbleEl.querySelector('#aw-quiz-input')) return; // 快速提问打开时不打扰
    var st = e.detail && e.detail.state;
    if (st === 'correct') {
      if (settings.avatar === 'whale1') playPetAnimation('点击回应-开心跃动', false);
      recordQuizResult(true);
      showBubble('✅ 答对啦！鲸鱼娘为你开心~', true);
    } else if (st === 'wrong') {
      if (settings.avatar === 'whale1') playPetAnimation('点击回应-傲娇生气', false);
      recordQuizResult(false);
      showBubble('❌ 没关系，看看解析，下次一定对！', true);
    } else if (st === 'celebrate') {
      if (settings.avatar === 'whale1') playPetAnimation('放烟花', false);
      showBubble('🎉 本轮完成！太棒啦！', true);
    } else if (st === 'thinking') {
      showBubble('💭 让我想想…', false);
    }
  });

  /* ---------- 桌宠问答 ---------- */
  function showMemoryQA() {
    // 关闭设置菜单，避免菜单面板遮住问答气泡
    menuOpen = false;
    stage.classList.remove('aw-menu-open');
    bubbleEl.innerHTML =
      '<div style="min-width:220px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
          '<b style="color:#72f6e4;">🐋 桌宠问答</b>' +
          '<span id="aw-qa-mode" style="font-size:10px;color:#8d9cbd;margin-left:6px;"></span>' +
          '<span id="aw-qa-close" style="cursor:pointer;color:#8d9cbd;font-size:14px;">✕</span>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">' +
          '<button class="aw-qa-q" data-q="我哪些地方比较薄弱？" style="padding:4px 8px;border:1px solid rgba(114,246,228,.3);background:rgba(114,246,228,.08);color:#72f6e4;border-radius:999px;cursor:pointer;font-size:11px;">薄弱点</button>' +
          '<button class="aw-qa-q" data-q="我该复习什么？" style="padding:4px 8px;border:1px solid rgba(114,246,228,.3);background:rgba(114,246,228,.08);color:#72f6e4;border-radius:999px;cursor:pointer;font-size:11px;">复习建议</button>' +
          '<button class="aw-qa-q" data-q="我最近的成绩怎么样？" style="padding:4px 8px;border:1px solid rgba(114,246,228,.3);background:rgba(114,246,228,.08);color:#72f6e4;border-radius:999px;cursor:pointer;font-size:11px;">最近成绩</button>' +
        '</div>' +
        '<div style="display:flex;gap:6px;">' +
          '<input id="aw-qa-input" style="flex:1;min-width:0;padding:6px 10px;background:#0b1322;border:1px solid rgba(114,246,228,.25);border-radius:8px;color:#dbe6f5;font-size:12px;outline:none;" placeholder="问鲸鱼娘…" />' +
          '<button id="aw-qa-ask" style="padding:6px 12px;border:none;background:linear-gradient(120deg,#72f6e4,#4f8cff);color:#04121a;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">提问</button>' +
        '</div>' +
        '<div id="aw-qa-answer" style="margin-top:8px;padding:8px;background:rgba(255,255,255,.04);border-radius:8px;font-size:12px;line-height:1.6;white-space:pre-wrap;max-height:160px;overflow:auto;"></div>' +
      '</div>';
    bubbleEl.classList.add('aw-show');
    if (bubbleTimer) clearTimeout(bubbleTimer);
    var input = bubbleEl.querySelector('#aw-qa-input');
    var askBtn = bubbleEl.querySelector('#aw-qa-ask');
    var ans = bubbleEl.querySelector('#aw-qa-answer');
    var close = bubbleEl.querySelector('#aw-qa-close');
    var modeEl = bubbleEl.querySelector('#aw-qa-mode');
    if (modeEl) {
      if (!window.aimasterDesktop || !window.aimasterDesktop.chatLlm) {
        modeEl.textContent = '本地模式';
      } else if (window.aimasterDesktop.getLlmConfig) {
        window.aimasterDesktop.getLlmConfig().then(function (cfg) {
          modeEl.textContent = cfg && cfg.hasKey ? '🤖 大模型' : '📚 本地';
        }).catch(function () {
          modeEl.textContent = '📚 本地';
        });
      } else {
        modeEl.textContent = '📚 本地';
      }
    }
    function useMemoryAsk(q, reason) {
      if (!window.aimasterDesktop || !window.aimasterDesktop.askMemory) {
        ans.textContent = '记忆问答需要在桌面应用中运行';
        return;
      }
      ans.textContent = (reason || '') + '思考中...';
      window.aimasterDesktop.askMemory(q).then(function (res) {
        ans.textContent = (reason || '') + (res.ok ? res.answer : ('出错了：' + (res.error || '')));
      }).catch(function (e) {
        ans.textContent = (reason || '') + '出错了：' + e.message;
      });
    }
    // 多轮上下文：保留最近 12 条消息，让鲸鱼娘能接住“上文”
    var qaHistory = [];
    function ask() {
      var text = input.value.trim();
      if (!text) { ans.textContent = '请输入问题'; return; }
      if (!window.aimasterDesktop) {
        ans.textContent = '需要在桌面应用中运行';
        return;
      }
      // 如果配置了真实大模型，优先使用大模型自由问答
      if (window.aimasterDesktop.chatLlm && window.aimasterDesktop.getLlmConfig) {
        window.aimasterDesktop.getLlmConfig().then(function (cfg) {
          if (cfg && cfg.hasKey) {
            ans.textContent = '思考中...';
            var msgs = [{ role: 'system', content: '你是 AIMaster 的鲸鱼娘桌宠，负责解答 AI、编程、学习等问题，语气亲切、简洁、专业。可以结合用户之前的问题连续对话。' }];
            msgs = msgs.concat(qaHistory).concat([{ role: 'user', content: text }]);
            window.aimasterDesktop.chatLlm(msgs).then(function (res) {
              if (res.ok) {
                qaHistory.push({ role: 'user', content: text }, { role: 'assistant', content: res.content });
                if (qaHistory.length > 12) qaHistory = qaHistory.slice(-12);
                ans.textContent = res.content;
              } else {
                ans.textContent = 'LLM 错误：' + (res.error || '');
              }
            }).catch(function (e) {
              ans.textContent = 'LLM 错误：' + e.message;
            });
          } else {
            useMemoryAsk(text, '⚠️ 未读取到 API Key，已使用本地问答：\n');
          }
        }).catch(function (e) {
            useMemoryAsk(text, '⚠️ 读取大模型配置失败：' + ((e && e.message) || e) + '，已使用本地问答：\n');
        });
      } else {
            useMemoryAsk(text, '⚠️ 大模型接口不可用，已使用本地问答：\n');
      }
    }
    askBtn.addEventListener('click', ask);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(); });
    bubbleEl.querySelectorAll('.aw-qa-q').forEach(function (btn) {
      btn.addEventListener('click', function () { input.value = btn.getAttribute('data-q'); ask(); });
    });
    close.addEventListener('click', hideBubble);
  }

  /* ---------- 快速提问（仿 dsh-pet 白色气泡） ---------- */
  function showQuickQuiz() {
    menuOpen = false;
    stage.classList.remove('aw-menu-open');
    bubbleEl.classList.remove('aw-qa-panel');
    bubbleEl.classList.add('aw-quiz-panel');
    bubbleEl.innerHTML =
      '<div style="min-width:230px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
          '<b>🎯 随机提问</b>' +
          '<span id="aw-quiz-close" style="cursor:pointer;color:#888;font-size:14px;">✕</span>' +
        '</div>' +
        '<div id="aw-quiz-question" style="font-size:13px;line-height:1.6;margin-bottom:8px;white-space:pre-wrap;">正在根据你的学习情况出题...</div>' +
        '<div style="display:flex;gap:6px;">' +
          '<input id="aw-quiz-answer" style="flex:1;min-width:0;padding:6px 10px;border-radius:8px;font-size:12px;outline:none;" placeholder="输入你的答案..." />' +
          '<button id="aw-quiz-submit" class="ask-btn" style="padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;">提交</button>' +
        '</div>' +
        '<div id="aw-quiz-result" class="answer" style="margin-top:8px;padding:8px;border-radius:8px;font-size:12px;line-height:1.6;white-space:pre-wrap;display:none;"></div>' +
      '</div>';
    bubbleEl.classList.add('aw-show');
    if (bubbleTimer) clearTimeout(bubbleTimer);
    var questionEl = bubbleEl.querySelector('#aw-quiz-question');
    var answerInput = bubbleEl.querySelector('#aw-quiz-answer');
    var submitBtn = bubbleEl.querySelector('#aw-quiz-submit');
    var resultEl = bubbleEl.querySelector('#aw-quiz-result');
    var close = bubbleEl.querySelector('#aw-quiz-close');
    var currentQuestion = '';
    var bankQuestion = null; // 若题目来自本地题库，记录原题便于离线判题
    var judging = false;

    function callChat(messages) {
      if (!window.aimasterDesktop || !window.aimasterDesktop.chatLlm) return Promise.reject(new Error('大模型接口不可用'));
      return window.aimasterDesktop.chatLlm(messages).then(function (res) {
        if (!res.ok) throw new Error(res.error || 'LLM error');
        return res.content;
      });
    }

    // 对/错反应动画（只有鲸鱼娘形象支持）
    function playQuizFeedback(correct) {
      if (settings.avatar !== 'whale1') return;
      playPetAnimation(correct ? '点击回应-开心跃动' : '点击回应-傲娇生气', false);
    }

    // 本地判题：支持 “A”/“1”/选项文字
    function judgeLocal(answer) {
      var a = String(answer || '').trim().toLowerCase();
      var opts = bankQuestion.options || [];
      for (var i = 0; i < opts.length; i++) {
        if (a === String.fromCharCode(65 + i).toLowerCase() || a === String(i + 1) || a === String(opts[i]).trim().toLowerCase()) {
          return i;
        }
      }
      return -1;
    }

    function generateQuestion() {
      questionEl.textContent = '正在根据你的学习情况出题...';
      resultEl.style.display = 'none';
      answerInput.value = '';
      var overviewPromise = (window.aimasterDesktop && window.aimasterDesktop.getMemoryOverview) ? window.aimasterDesktop.getMemoryOverview() : Promise.resolve(null);
      overviewPromise.then(function (ovRes) {
        var info = '暂无刷题记录';
        if (ovRes && ovRes.ok && ovRes.overview) {
          var o = ovRes.overview;
          info = '刷题次数:' + (o.totalQuiz || 0) + '; 平均分:' + (o.avgScore || 0);
          if (o.weakestCategories && o.weakestCategories.length) {
            info += '; 薄弱:' + o.weakestCategories.slice(0, 3).map(function (x) { return x.name + '(' + x.rate + '%)'; }).join(',');
          }
        }
        return callChat([
          { role: 'system', content: '你是 AIMaster 的鲸鱼娘老师。根据用户学习情况出一道AI知识题。只输出题目本身，不要输出答案和解释。' },
          { role: 'user', content: '用户学习情况：' + info + '\n请出一道题。' }
        ]);
      }).then(function (q) {
        currentQuestion = q || '';
        bankQuestion = null; // 大模型出题，不参与本地判题
        questionEl.textContent = currentQuestion || '（出题失败）';
      }).catch(function (e) {
        if (window.aimasterDesktop && window.aimasterDesktop.getQuizBank) {
          window.aimasterDesktop.getQuizBank().then(function (res) {
            if (res && res.ok && res.bank && res.bank.questions && res.bank.questions.length) {
              var qs = res.bank.questions;
              var q = qs[Math.floor(Math.random() * qs.length)];
              bankQuestion = q; // 记下原题 → 离线也能判对错
              currentQuestion = q.question + '\n选项：\n' + q.options.map(function (op, i) { return String.fromCharCode(65 + i) + '. ' + op; }).join('\n');
              questionEl.textContent = currentQuestion;
              return;
            }
            questionEl.textContent = '出题失败：' + ((e && e.message) || e);
          });
        } else {
          questionEl.textContent = '出题失败：' + ((e && e.message) || e);
        }
      });
    }

    function submitAnswer() {
      if (judging) return;
      var answer = answerInput.value.trim();
      if (!answer) { resultEl.style.display = 'block'; resultEl.textContent = '请输入答案'; return; }
      if (!currentQuestion) { resultEl.style.display = 'block'; resultEl.textContent = '还没有题目'; return; }
      judging = true;
      submitBtn.disabled = true;
      resultEl.style.display = 'block';

      // 本地题库题目：无需大模型即可判对错
      if (bankQuestion) {
        var idx = judgeLocal(answer);
        if (idx < 0) {
          resultEl.textContent = '🤔 没看懂你的答案，试试回答 A / B / C / D（或选项文字）';
          judging = false;
          submitBtn.disabled = false;
          return;
        }
        var correct = idx === bankQuestion.answer;
        playQuizFeedback(correct);
        recordQuizResult(correct);
        var letter = String.fromCharCode(65 + bankQuestion.answer);
        resultEl.textContent = correct
          ? '✅ 回答正确，太棒了！\n解析：' + (bankQuestion.explanation || '')
          : '❌ 再想想。正确答案是 ' + letter + '. ' + (bankQuestion.options[bankQuestion.answer] || '') + '\n解析：' + (bankQuestion.explanation || '');
        judging = false;
        submitBtn.disabled = false;
        return;
      }

      resultEl.textContent = '批改中...';
      callChat([
        { role: 'system', content: '你是 AIMaster 的鲸鱼娘老师。请判断学生的回答是否正确，并给出解析。回答必须严格以 "✅"（答对）或 "❌"（答错）开头，再接解析。' },
        { role: 'user', content: '题目：\n' + currentQuestion + '\n\n学生答案：\n' + answer + '\n\n请判断对错并给出解析。' }
      ]).then(function (res) {
        resultEl.textContent = res;
        if (res.indexOf('✅') === 0) { playQuizFeedback(true); recordQuizResult(true); }
        else if (res.indexOf('❌') === 0) { playQuizFeedback(false); recordQuizResult(false); }
      }).catch(function (e) {
        resultEl.textContent = '批改失败：' + ((e && e.message) || e);
      }).finally(function () {
        judging = false;
        submitBtn.disabled = false;
      });
    }

    submitBtn.addEventListener('click', submitAnswer);
    answerInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitAnswer(); });
    close.addEventListener('click', hideBubble);
    generateQuestion();
  }

  /* ---------- 菜单 ---------- */
  var menuOpen = false;
  function avatarGridHtml() {
    var html = '';
    var all = PRESET_AVATARS.concat(customs);
    for (var i = 0; i < all.length; i++) {
      var a = all[i];
      var on = a.id === settings.avatar ? ' aw-on' : '';
      var del = (a.id.indexOf('custom_') === 0 || a.id.indexOf('diy_') === 0)
        ? '<span class="aw-del" data-del="' + a.id + '">×</span>' : '';
      html += '<div class="aw-av' + on + '" data-avid="' + a.id + '">' +
              del +
              '<img src="' + a.src + '" alt="' + a.name + '" />' +
              '<span>' + a.name + '</span></div>';
    }
    return html;
  }
  function deleteAvatar(id) {
    var removed = null;
    for (var i = 0; i < customs.length; i++) {
      if (customs[i].id === id) {
        removed = customs.splice(i, 1)[0];
        break;
      }
    }
    if (!removed) return;
    saveCustoms();
    if (settings.avatar === id) {
      settings.avatar = customs.length ? customs[0].id : 'whale1';
      saveSettings();
      renderAvatar();
    }
    renderMenu();
    showBubble('🗑️ 已删除形象「' + removed.name + '」', true);
  }
  function achievementsGridHtml() {
    var html = '';
    for (var i = 0; i < ACHIEVEMENT_DEFS.length; i++) {
      var def = ACHIEVEMENT_DEFS[i];
      var unlocked = !!achievements[def.id];
      html += '<div class="aw-ach' + (unlocked ? ' aw-unlocked' : '') + '" title="' + def.desc + '">' +
              '<span class="aw-ach-icon">' + (unlocked ? def.icon : '🔒') + '</span>' +
              '<span class="aw-ach-name">' + def.name + '</span>' +
              '<span class="aw-ach-desc">' + def.desc + '</span></div>';
    }
    return html;
  }

  /* ---------- 动画剧场 ---------- */
  var currentAnimName = '';
  function renderAnimList(filterText) {
    var list = menuEl.querySelector('#aw-anim-list');
    if (!list) return;
    var kw = String(filterText || '').trim();
    var names = kw ? petAnimNames.filter(function (n) { return n.indexOf(kw) !== -1; }) : petAnimNames;
    var html = '';
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      var on = n === currentAnimName ? ' aw-on' : '';
      html += '<span class="aw-anim-chip' + on + '" data-anim="' + n + '">' + n + '</span>';
    }
    list.innerHTML = html || '<span style="font-size:11px;color:#8d9cbd;">没有匹配的动画~</span>';
    var chips = list.querySelectorAll('.aw-anim-chip');
    for (var j = 0; j < chips.length; j++) {
      chips[j].addEventListener('click', function () {
        var name = this.getAttribute('data-anim');
        if (settings.avatar !== 'whale1') {
          showBubble('⚠️ 当前形象不支持动画，先切回鲸鱼娘吧', true);
          return;
        }
        playPetAnimation(name, false);
        currentAnimName = name;
        var cur = menuEl.querySelector('#aw-anim-current');
        if (cur) cur.textContent = '播放中 · ' + name;
        for (var k = 0; k < chips.length; k++) chips[k].classList.remove('aw-on');
        this.classList.add('aw-on');
      });
    }
  }

  function renderMenu() {
    if (builderOpen) { renderBuilder(); return; }
    currentAnimName = ''; // 菜单重开时回到“待机”状态显示
    var s = stats();
    var achievedCount = 0, i;
    for (i = 0; i < ACHIEVEMENT_DEFS.length; i++) if (achievements[ACHIEVEMENT_DEFS[i].id]) achievedCount++;
    var minSize = 0.6, maxSize = 2.5;
    var goalMin = settings.dailyGoalMin || 30;
    var goalPct = Math.min(100, Math.round((s.studyMs / (goalMin * 60000)) * 100));
    menuEl.innerHTML =
      '<h4>🐋 虚拟形象</h4>' +
      '<div class="aw-sec">' +
        '<div class="aw-avatars">' + avatarGridHtml() + '</div>' +
        '<button class="aw-btn" id="aw-upload">📤 上传自定义形象</button>' +
        '<button class="aw-btn" id="aw-diy-open">🎨 生成形象</button>' +
      '</div>' +
      '<h4>🎬 动画剧场</h4>' +
      '<div class="aw-sec">' +
        '<input type="text" id="aw-anim-search" class="aw-anim-search" placeholder="🔍 搜索动画，如：吃 / 舞 / 点头..." />' +
        '<div class="aw-anim-current" id="aw-anim-current">待机 · 待机呼吸休闲</div>' +
        '<div class="aw-anim-list" id="aw-anim-list"></div>' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="aw-btn" id="aw-anim-random" style="flex:1;">🎲 随机播一个</button>' +
          '<button class="aw-btn" id="aw-anim-stop" style="flex:1;">💤 回到待机</button>' +
        '</div>' +
      '</div>' +
      '<h4>📋 学习助手</h4>' +
      '<div class="aw-sec">' +
        '<button class="aw-btn" id="aw-summary">📊 今日总结与下一步建议</button>' +
        '<button class="aw-btn" id="aw-qa">💬 桌宠问答</button>' +
        '<button class="aw-btn" id="aw-quiz">🎯 随机提问</button>' +
        '<div class="aw-focus-ctl">' +
          '<input type="number" id="aw-focus-min" min="1" max="120" step="5" value="25" title="专注时长（分钟）" />' +
          '<button class="aw-btn" id="aw-focus-start">' + (focus.active ? '⏱ 专注进行中…' : '🍅 开始专注') + '</button>' +
        '</div>' +
      '</div>' +
      '<h4>🎨 背景美化</h4>' +
      '<div class="aw-sec">' +
        '<label class="aw-row">背景图 URL <input type="text" id="aw-bg-url" value="' + (settings.bgImage || '') + '" placeholder="https://... 或留空" /></label>' +
        '<label class="aw-row">上传背景 <input type="file" id="aw-bg-file" accept="image/*" /></label>' +
        '<label class="aw-row">面板不透明度 <input type="range" id="aw-bg-opacity" min="0.2" max="1" step="0.01" value="' + (settings.bgOpacity != null ? settings.bgOpacity : 0.55) + '" /><span class="aw-val">' + Math.round((settings.bgOpacity != null ? settings.bgOpacity : 0.55) * 100) + '%</span></label>' +
        '<label class="aw-row">背景模糊 <input type="range" id="aw-bg-blur" min="0" max="20" step="1" value="' + (settings.bgBlur != null ? settings.bgBlur : 18) + '" /><span class="aw-val">' + (settings.bgBlur != null ? settings.bgBlur : 18) + 'px</span></label>' +
        '<button class="aw-btn" id="aw-bg-reset">🔄 恢复默认</button>' +
      '</div>' +
      '<h4>⚙️ 设置</h4>' +
      '<div class="aw-sec">' +
        '<label class="aw-row">大小 <input type="range" id="aw-size" min="' + minSize + '" max="' + maxSize + '" step="0.05" value="' + settings.size + '" /><span class="aw-val">' + settings.size.toFixed(2) + '</span></label>' +
        '<label class="aw-row">音效 <input type="checkbox" id="aw-sound" ' + (settings.sound ? 'checked' : '') + ' /></label>' +
        '<label class="aw-row">音量 <input type="range" id="aw-vol" min="0" max="1" step="0.05" value="' + settings.volume + '" /><span class="aw-val">' + Math.round(settings.volume * 100) + '%</span></label>' +
        '<label class="aw-row">语音播报 <input type="checkbox" id="aw-voice" ' + (settings.voiceOn ? 'checked' : '') + ' /></label>' +
        '<label class="aw-row">语速 <input type="range" id="aw-voice-rate" min="0.6" max="1.5" step="0.1" value="' + settings.voiceRate + '" /><span class="aw-val">' + settings.voiceRate.toFixed(1) + 'x</span></label>' +
        '<label class="aw-row">气泡台词 <input type="checkbox" id="aw-bubble" ' + (settings.bubbleOn ? 'checked' : '') + ' /></label>' +
        '<label class="aw-row">休息提醒 <input type="checkbox" id="aw-rest" ' + (settings.remindRest ? 'checked' : '') + ' /></label>' +
        '<label class="aw-row">提醒间隔 <input type="number" id="aw-rest-min" min="20" max="120" step="5" value="' + settings.restIntervalMin + '" /><span class="aw-val">分钟</span></label>' +
        '<label class="aw-row">智能睡眠 <input type="checkbox" id="aw-sleep" ' + (settings.sleepOn ? 'checked' : '') + ' /></label>' +
        '<label class="aw-row">入睡间隔 <input type="number" id="aw-sleep-min" min="1" max="30" step="1" value="' + (settings.sleepMin || 3) + '" /><span class="aw-val">分钟</span></label>' +
        '<label class="aw-row">每日目标 <input type="number" id="aw-goal-min" min="10" max="300" step="5" value="' + goalMin + '" /><span class="aw-val">分钟</span></label>' +
      '</div>' +
      '<h4>🏆 成就 (' + achievedCount + '/' + ACHIEVEMENT_DEFS.length + ')</h4>' +
      '<div class="aw-sec"><div class="aw-achievements">' + achievementsGridHtml() + '</div></div>' +
      '<h4>📊 今日数据</h4>' +
      '<div class="aw-sec">' +
        '<div class="aw-stats">' +
          '<div class="aw-stat"><b>' + fmtMin(s.studyMs) + '</b><span>学习分钟</span></div>' +
          '<div class="aw-stat"><b>' + fmtMin(s.screenMs) + '</b><span>屏幕分钟</span></div>' +
          '<div class="aw-stat"><b>' + (s.quizCount || 0) + '</b><span>答题次数</span></div>' +
          '<div class="aw-stat"><b>' + (s.focusCount || 0) + '</b><span>专注完成</span></div>' +
        '</div>' +
        '<div class="aw-goal"><div class="aw-goal-bar"><i style="width:' + goalPct + '%"></i></div><span>目标 ' + goalMin + ' 分钟 · ' + goalPct + '%</span></div>' +
        '<div class="aw-goal" style="margin-top:2px;"><span>答题正确率 ' + (s.quizCount ? Math.round(100 * (s.quizCorrect || 0) / s.quizCount) : 0) + '%（' + (s.quizCorrect || 0) + '/' + (s.quizCount || 0) + '）</span></div>' +
        '<button class="aw-btn" id="aw-reset-pos">📍 重置位置</button>' +
        '<button class="aw-btn" id="aw-reset-stats">🧹 清零今日统计</button>' +
      '</div>';
    bindMenu();
  }
  function renderBuilder() {
    var colorSwatches = '';
    for (var i = 0; i < DIY_COLORS.length; i++) {
      var c = DIY_COLORS[i];
      colorSwatches += '<span class="aw-color-swatch' + (builderState.color === c ? ' aw-on' : '') + '" data-color="' + c + '" style="background:' + c + '"></span>';
    }
    var shapeOpts = '';
    for (i = 0; i < DIY_SHAPES.length; i++) {
      shapeOpts += '<option value="' + DIY_SHAPES[i].id + '"' + (builderState.shape === DIY_SHAPES[i].id ? ' selected' : '') + '>' + DIY_SHAPES[i].name + '</option>';
    }
    function selectHtml(id, options) {
      return '<select id="' + id + '">' + options + '</select>';
    }
    var eyeOpts = '<option value="round">圆眼</option><option value="happy"' + (builderState.eye === 'happy' ? ' selected' : '') + '>笑眼</option><option value="star"' + (builderState.eye === 'star' ? ' selected' : '') + '>星星眼</option>';
    var mouthOpts = '<option value="smile"' + (builderState.mouth === 'smile' ? ' selected' : '') + '>微笑</option><option value="open"' + (builderState.mouth === 'open' ? ' selected' : '') + '>张嘴</option><option value="cat"' + (builderState.mouth === 'cat' ? ' selected' : '') + '>猫嘴</option>';
    var accOpts = '<option value="none">无装饰</option><option value="bow"' + (builderState.accessory === 'bow' ? ' selected' : '') + '>蝴蝶结</option><option value="glasses"' + (builderState.accessory === 'glasses' ? ' selected' : '') + '>眼镜</option><option value="crown"' + (builderState.accessory === 'crown' ? ' selected' : '') + '>皇冠</option><option value="halo"' + (builderState.accessory === 'halo' ? ' selected' : '') + '>光环</option>';

    menuEl.innerHTML =
      '<h4>🎨 生成我的形象</h4>' +
      '<div class="aw-sec">' +
        '<div class="aw-diy-preview"><img id="aw-diy-preview" src="' + buildAvatarSrc(builderState) + '" alt="预览" /></div>' +
        '<label class="aw-row">形状 <span class="aw-diy-control">' + selectHtml('aw-diy-shape', shapeOpts) + '</span></label>' +
        '<label class="aw-row">颜色 <span class="aw-colors">' + colorSwatches + '</span></label>' +
        '<label class="aw-row">眼睛 <span class="aw-diy-control">' + selectHtml('aw-diy-eye', eyeOpts) + '</span></label>' +
        '<label class="aw-row">嘴巴 <span class="aw-diy-control">' + selectHtml('aw-diy-mouth', mouthOpts) + '</span></label>' +
        '<label class="aw-row">装饰 <span class="aw-diy-control">' + selectHtml('aw-diy-accessory', accOpts) + '</span></label>' +
        '<div class="aw-diy-actions">' +
          '<button class="aw-btn" id="aw-diy-random">🎲 随机生成</button>' +
          '<button class="aw-btn" id="aw-diy-save">💾 保存并使用</button>' +
          '<button class="aw-btn" id="aw-diy-back">← 返回</button>' +
        '</div>' +
      '</div>';
    bindBuilder();
  }

  function bindMenu() {
    var sizeInput = menuEl.querySelector('#aw-size');
    var sizeVal = menuEl.querySelector('#aw-size + .aw-val');
    var sizeDragStart = null;
    if (sizeInput) sizeInput.addEventListener('input', function () {
      // 拖动过程中不移动 stage/menu，避免滑块在鼠标下抖动
      if (!sizeDragStart) {
        sizeDragStart = {
          centerX: (parseInt(stage.style.left, 10) || 0) + stage.offsetWidth / 2,
          bottomY: (parseInt(stage.style.top, 10) || 0) + stage.offsetHeight
        };
      }
      settings.size = parseFloat(sizeInput.value);
      applyScaleWithoutMove();
      sizeVal.textContent = settings.size.toFixed(2);
      saveSettings();
    });
    if (sizeInput) sizeInput.addEventListener('change', function () {
      // 松手后一次性把桌宠移回拖动前“中心底部”不变的位置
      if (sizeDragStart) {
        updateStageSize(sizeDragStart.centerX, sizeDragStart.bottomY);
        sizeDragStart = null;
      }
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
    var restBox = menuEl.querySelector('#aw-rest');
    if (restBox) restBox.addEventListener('change', function () {
      settings.remindRest = restBox.checked;
      saveSettings();
    });
    var restMin = menuEl.querySelector('#aw-rest-min');
    if (restMin) restMin.addEventListener('change', function () {
      var v = parseInt(restMin.value, 10);
      if (isNaN(v) || v < 20 || v > 120) v = 45;
      settings.restIntervalMin = v;
      restMin.value = v;
      saveSettings();
    });
    var sleepBox = menuEl.querySelector('#aw-sleep');
    if (sleepBox) sleepBox.addEventListener('change', function () {
      settings.sleepOn = sleepBox.checked;
      if (!settings.sleepOn && sleeping) wakeUp(); // 关闭智能睡眠时立即唤醒
      saveSettings();
    });
    var sleepMin = menuEl.querySelector('#aw-sleep-min');
    if (sleepMin) sleepMin.addEventListener('change', function () {
      var v = parseInt(sleepMin.value, 10);
      if (isNaN(v) || v < 1 || v > 30) v = 3;
      settings.sleepMin = v;
      sleepMin.value = v;
      saveSettings();
    });
    var goalMin = menuEl.querySelector('#aw-goal-min');
    if (goalMin) goalMin.addEventListener('change', function () {
      var v = parseInt(goalMin.value, 10);
      if (isNaN(v) || v < 10 || v > 300) v = 30;
      settings.dailyGoalMin = v;
      goalMin.value = v;
      saveSettings();
      renderMenu();
      var newly = unlockAchievements(stats());
      if (newly && newly.length) showAchievementBubble(newly);
    });
    var uploadBtn = menuEl.querySelector('#aw-upload');
    if (uploadBtn) uploadBtn.addEventListener('click', function () {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.addEventListener('change', function () { if (input.files && input.files[0]) uploadAvatar(input.files[0]); });
      input.click();
    });
    var diyBtn = menuEl.querySelector('#aw-diy-open');
    if (diyBtn) diyBtn.addEventListener('click', function () {
      builderOpen = true;
      renderMenu();
    });
    var summaryBtn = menuEl.querySelector('#aw-summary');
    if (summaryBtn) summaryBtn.addEventListener('click', function () {
      showBubble(learningSummaryHtml(), true);
    });
    var qaBtn = menuEl.querySelector('#aw-qa');
    if (qaBtn) qaBtn.addEventListener('click', function () {
      showMemoryQA();
    });
    var quizBtn = menuEl.querySelector('#aw-quiz');
    if (quizBtn) quizBtn.addEventListener('click', function () {
      showQuickQuiz();
    });
    var animSearch = menuEl.querySelector('#aw-anim-search');
    if (animSearch) {
      renderAnimList('');
      animSearch.addEventListener('input', function () { renderAnimList(animSearch.value); });
    }
    var animRandom = menuEl.querySelector('#aw-anim-random');
    if (animRandom) animRandom.addEventListener('click', function () {
      if (settings.avatar !== 'whale1') { showBubble('⚠️ 当前形象不支持动画，先切回鲸鱼娘吧', true); return; }
      var n = petAnimNames[Math.floor(Math.random() * petAnimNames.length)];
      playPetAnimation(n, false);
      currentAnimName = n;
      var cur = menuEl.querySelector('#aw-anim-current');
      if (cur) cur.textContent = '播放中 · ' + n;
      renderAnimList(animSearch ? animSearch.value : '');
    });
    var animStop = menuEl.querySelector('#aw-anim-stop');
    if (animStop) animStop.addEventListener('click', function () {
      if (settings.avatar !== 'whale1') return;
      playPetAnimation('待机呼吸休闲', true);
      currentAnimName = '';
      var cur = menuEl.querySelector('#aw-anim-current');
      if (cur) cur.textContent = '待机 · 待机呼吸休闲';
      renderAnimList(animSearch ? animSearch.value : '');
    });
    var focusStart = menuEl.querySelector('#aw-focus-start');
    if (focusStart) focusStart.addEventListener('click', function () {
      if (focus.active) {
        showBubble('🍅 已有番茄钟在跑啦，点击鲸鱼旁的徽章可暂停/结束', true);
        return;
      }
      var fm = menuEl.querySelector('#aw-focus-min');
      startFocus(fm ? fm.value : 25);
    });
    var voiceBox = menuEl.querySelector('#aw-voice');
    if (voiceBox) voiceBox.addEventListener('change', function () {
      settings.voiceOn = voiceBox.checked;
      if (!settings.voiceOn) { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { } }
      saveSettings();
    });
    var voiceRate = menuEl.querySelector('#aw-voice-rate');
    var voiceRateVal = voiceRate ? voiceRate.nextElementSibling : null;
    if (voiceRate) voiceRate.addEventListener('input', function () {
      settings.voiceRate = parseFloat(voiceRate.value);
      if (voiceRateVal) voiceRateVal.textContent = settings.voiceRate.toFixed(1) + 'x';
      saveSettings();
    });
    var bgUrl = menuEl.querySelector('#aw-bg-url');
    if (bgUrl) bgUrl.addEventListener('change', function () {
      settings.bgImage = bgUrl.value.trim();
      saveSettings();
      applyBgSettings();
    });
    var bgFile = menuEl.querySelector('#aw-bg-file');
    if (bgFile) bgFile.addEventListener('change', function () {
      if (!bgFile.files || !bgFile.files[0]) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        settings.bgImage = ev.target.result;
        saveSettings();
        applyBgSettings();
        if (bgUrl) bgUrl.value = settings.bgImage;
      };
      reader.readAsDataURL(bgFile.files[0]);
    });
    var bgOpacity = menuEl.querySelector('#aw-bg-opacity');
    var bgOpacityVal = bgOpacity ? bgOpacity.nextElementSibling : null;
    if (bgOpacity) bgOpacity.addEventListener('input', function () {
      settings.bgOpacity = parseFloat(bgOpacity.value);
      if (bgOpacityVal) bgOpacityVal.textContent = Math.round(settings.bgOpacity * 100) + '%';
      saveSettings();
      applyBgSettings();
    });
    var bgBlur = menuEl.querySelector('#aw-bg-blur');
    var bgBlurVal = bgBlur ? bgBlur.nextElementSibling : null;
    if (bgBlur) bgBlur.addEventListener('input', function () {
      settings.bgBlur = parseFloat(bgBlur.value);
      if (bgBlurVal) bgBlurVal.textContent = settings.bgBlur + 'px';
      saveSettings();
      applyBgSettings();
    });
    var bgReset = menuEl.querySelector('#aw-bg-reset');
    if (bgReset) bgReset.addEventListener('click', function () {
      settings.bgImage = '';
      settings.bgOpacity = 0.55;
      settings.bgBlur = 18;
      saveSettings();
      applyBgSettings();
      renderMenu();
    });
    var resetPos = menuEl.querySelector('#aw-reset-pos');
    if (resetPos) resetPos.addEventListener('click', function () {
      var r = stageRect();
      setPos(window.innerWidth - r.w - 16, window.innerHeight - r.h - 16);
      saveSettings();
    });
    var resetStats = menuEl.querySelector('#aw-reset-stats');
    if (resetStats) resetStats.addEventListener('click', function () {
      _statsCache.screenMs = 0; _statsCache.studyMs = 0; _statsCache.visits = {}; _statsCache.chapters = {};
      _statsCache.continuousMs = 0; _statsCache.lastRestAt = 0; _statsCache.restCount = 0;
      _statsCache.quizCount = 0; _statsCache.quizCorrect = 0;
      _statsCache.focusCount = 0; _statsCache.focusMs = 0;
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
        var newly = unlockAchievements(stats());
        if (newly && newly.length) showAchievementBubble(newly);
      });
    }
    var delBtns = menuEl.querySelectorAll('.aw-del');
    for (i = 0; i < delBtns.length; i++) {
      delBtns[i].addEventListener('click', function (e) {
        e.stopPropagation();
        deleteAvatar(this.getAttribute('data-del'));
      });
    }
  }

  function bindBuilder() {
    var preview = menuEl.querySelector('#aw-diy-preview');
    function refreshPreview() {
      if (preview) preview.src = buildAvatarSrc(builderState);
    }
    var shapeSel = menuEl.querySelector('#aw-diy-shape');
    if (shapeSel) shapeSel.addEventListener('change', function () {
      builderState.shape = shapeSel.value;
      refreshPreview();
    });
    var eyeSel = menuEl.querySelector('#aw-diy-eye');
    if (eyeSel) eyeSel.addEventListener('change', function () {
      builderState.eye = eyeSel.value;
      refreshPreview();
    });
    var mouthSel = menuEl.querySelector('#aw-diy-mouth');
    if (mouthSel) mouthSel.addEventListener('change', function () {
      builderState.mouth = mouthSel.value;
      refreshPreview();
    });
    var accSel = menuEl.querySelector('#aw-diy-accessory');
    if (accSel) accSel.addEventListener('change', function () {
      builderState.accessory = accSel.value;
      refreshPreview();
    });
    var swatches = menuEl.querySelectorAll('.aw-color-swatch');
    for (var i = 0; i < swatches.length; i++) {
      swatches[i].addEventListener('click', function () {
        builderState.color = this.getAttribute('data-color');
        for (var j = 0; j < swatches.length; j++) swatches[j].classList.remove('aw-on');
        this.classList.add('aw-on');
        refreshPreview();
      });
    }
    var randomBtn = menuEl.querySelector('#aw-diy-random');
    if (randomBtn) randomBtn.addEventListener('click', function () {
      builderState.shape = DIY_SHAPES[Math.floor(Math.random() * DIY_SHAPES.length)].id;
      builderState.color = DIY_COLORS[Math.floor(Math.random() * DIY_COLORS.length)];
      var eyes = ['round', 'happy', 'star'];
      var mouths = ['smile', 'open', 'cat'];
      var accs = ['none', 'bow', 'glasses', 'crown', 'halo'];
      builderState.eye = eyes[Math.floor(Math.random() * eyes.length)];
      builderState.mouth = mouths[Math.floor(Math.random() * mouths.length)];
      builderState.accessory = accs[Math.floor(Math.random() * accs.length)];
      renderBuilder();
    });
    var saveBtn = menuEl.querySelector('#aw-diy-save');
    if (saveBtn) saveBtn.addEventListener('click', function () {
      var src = buildAvatarSrc(builderState);
      var diyCount = 0, i;
      for (i = 0; i < customs.length; i++) if (customs[i].id.indexOf('diy_') === 0) diyCount++;
      var id = 'diy_' + Date.now();
      addCustom({ id: id, name: '我的形象' + (diyCount + 1), src: src, kind: 'diy' });
      settings.avatar = id;
      saveSettings();
      builderOpen = false;
      renderAvatar();
      renderMenu();
      showBubble('🎨 已生成并启用你的专属形象！', true);
      var newly = unlockAchievements(stats());
      if (newly && newly.length) showAchievementBubble(newly);
    });
    var backBtn = menuEl.querySelector('#aw-diy-back');
    if (backBtn) backBtn.addEventListener('click', function () {
      builderOpen = false;
      renderMenu();
    });
  }
  function uploadAvatar(file) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      // GIF 尽量保留动画；超过 2MB 则退化为静态压缩
      if (file.type === 'image/gif' && file.size <= 2 * 1024 * 1024) {
        var gifId = 'custom_' + Date.now();
        addCustom({ id: gifId, name: file.name.replace(/\.[^.]+$/, '').slice(0, 12), src: ev.target.result, kind: 'custom' });
        settings.avatar = gifId;
        saveSettings();
        renderAvatar();
        renderMenu();
        showBubble('📤 GIF 自定义形象已上传并启用！', true);
        var newly = unlockAchievements(stats());
        if (newly && newly.length) showAchievementBubble(newly);
        return;
      }
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
        addCustom({ id: id, name: file.name.replace(/\.[^.]+$/, '').slice(0, 12), src: src, kind: 'custom' });
        settings.avatar = id;
        saveSettings();
        renderAvatar();
        renderMenu();
        showBubble('📤 自定义形象已上传并启用！', true);
        var newly = unlockAchievements(stats());
        if (newly && newly.length) showAchievementBubble(newly);
      };
      img.onerror = function () { showBubble('😢 图片加载失败，换个格式试试', true); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
    stage.classList.toggle('aw-menu-open', menuOpen);
    if (menuOpen) {
      stage.classList.remove('aw-flipped');
      builderOpen = false;
      renderMenu();
    } else {
      updateFlip();
    }
  }
  gearBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleMenu();
  });
  stage.addEventListener('pointerdown', function (e) {
    if (menuOpen && !menuEl.contains(e.target) && e.target !== gearBtn) {
      menuOpen = false;
      stage.classList.remove('aw-menu-open');
      updateFlip();
    }
  });

  /* ---------- 统计 tick ---------- */
  var lastTick = Date.now();
  function maybeRestRemind(s, now) {
    if (!settings.remindRest) return;
    if (focus.active) return; // 专注期间不打断
    var interval = (settings.restIntervalMin || 45) * 60000;
    if (s.continuousMs >= interval && (!s.lastRestAt || now - s.lastRestAt >= interval)) {
      s.lastRestAt = now;
      s.restCount = (s.restCount || 0) + 1;
      var mins = Math.floor(s.continuousMs / 60000);
      showBubble('<div class="aw-bb-row"><span class="aw-bb-tag">💤 休息提醒</span><span>已经连续学习 ' + mins + ' 分钟，站起来看看远处、喝口水吧~</span></div>', true);
    }
  }
  function tick() {
    var now = Date.now();
    var dt = now - lastTick;
    lastTick = now;
    if (document.visibilityState !== 'visible' || dt >= 60000) return;
    var s = stats();
    s.screenMs += dt;
    var studying = isStudyPage();
    if (studying) {
      s.studyMs += dt;
      if (s.continuousMs === undefined) s.continuousMs = 0;
      var gap = now - (s.lastStudyTick || now);
      // 如果离开学习状态超过 10 分钟，连续学习重新计时
      if (gap > 10 * 60 * 1000) s.continuousMs = 0;
      s.continuousMs += dt;
      s.lastStudyTick = now;
      maybeRestRemind(s, now);
    } else {
      s.continuousMs = 0;
      s.lastStudyTick = now;
    }
    var key = currentPage();
    if (!s.visits[key]) s.visits[key] = { count: 0, ms: 0 };
    s.visits[key].ms += dt;
    var m = key.match(/chapter\/(\d+)/);
    if (m) {
      if (!s.chapters) s.chapters = {};
      s.chapters[m[1]] = true;
    }
    saveStats();
    var newly = unlockAchievements(s);
    if (newly && newly.length) showAchievementBubble(newly);
    maybeSleep();
  }
  // 页面访问计数（每次加载 +1）
  (function () {
    var s = stats();
    var key = currentPage();
    if (!s.visits[key]) s.visits[key] = { count: 0, ms: 0 };
    s.visits[key].count += 1;
    var m = key.match(/chapter\/(\d+)/);
    if (m) {
      if (!s.chapters) s.chapters = {};
      s.chapters[m[1]] = true;
    }
    saveStats();
  })();

  /* ---------- 动态随机动作 ---------- */
  // 随机动作收敛为轻量动作池：只挑短小、不打断学习的日常动作
  var RANDOM_ACTION_POOL = ['东张西望', '原地漂浮踏步', '原地左转奔跑', '摇扇纳凉', '轻快摇摆舞', '悠闲哼歌'];
  var actionTimer = null;
  function playRandomAction() {
    if (dragging || menuOpen || sleeping || focus.active || document.visibilityState !== 'visible') return;
    if (bubbleEl.querySelector('#aw-qa-input')) return;
    if (settings.avatar !== 'whale1' || !petAnimNames.length) return;
    var name = RANDOM_ACTION_POOL[Math.floor(Math.random() * RANDOM_ACTION_POOL.length)];
    if (petAnimNames.indexOf(name) === -1) return;
    playPetAnimation(name, false);
  }

  /* ---------- 初始化 ---------- */
  applyBgSettings();
  renderAvatar();
  if (animVideo) animVideo.addEventListener('loadedmetadata', function () { updateStageSize(); });
  whaleImg.addEventListener('load', function () { updateStageSize(); });
  // 初始位置：右下角
  var r = stageRect();
  if (settings.x === null || settings.y === null) {
    setPos(window.innerWidth - r.w - 16, window.innerHeight - r.h - 16);
  } else {
    setPos(settings.x, settings.y);
  }
  setTimeout(function () { updateFlip(); }, 50);
  setInterval(tick, 5000);
  setInterval(playRandomAction, 6000);
  // 3 秒后打个招呼
  setTimeout(function () {
    if (settings.bubbleOn) {
      var g = greetingText();
      showBubble('<div class="aw-bb-row"><span class="aw-bb-tag">🐋 ' + g.hi + '</span><span>我是你的虚拟学习助手，点我随机提问、右键打开菜单，还有 100+ 动画可以点播哦~</span></div>', true);
      awSpeak(g.hi + '我是你的虚拟学习助手，祝你学习顺利');
    }
  }, 3000);
})();
