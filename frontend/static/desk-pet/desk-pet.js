/* AIMaster 浮空桌宠（参考 dsh-live2d-pet / dsh-desk-pet 的交互思路）
 * 轻量实现：拖拽、状态表情、记忆问答气泡、本地持久化。
 * 由 Electron 主进程注入到每个页面。
 */
(function () {
  if (window.__aimasterDeskPetInjected) return;
  window.__aimasterDeskPetInjected = true;

  var STORAGE_KEY = 'aimaster_desk_pet_state';
  var state = { x: null, y: null, visible: true };

  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.x != null) state.x = saved.x;
    if (saved.y != null) state.y = saved.y;
    if (saved.visible != null) state.visible = saved.visible;
  } catch (e) {}

  var style = document.createElement('style');
  style.textContent = [
    '.aimaster-desk-pet{position:fixed;right:24px;bottom:24px;z-index:2147482998;width:72px;height:72px;cursor:grab;user-select:none;filter:drop-shadow(0 4px 12px rgba(0,0,0,.45));transition:transform .15s ease;}',
    '.aimaster-desk-pet:active{cursor:grabbing;transform:scale(.96);}',
    '.aimaster-desk-pet .pet-body{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:46px;background:radial-gradient(circle at 30% 30%, rgba(114,246,228,.25), rgba(20,32,55,.85));border:1px solid rgba(114,246,228,.35);border-radius:50%;box-shadow:0 8px 30px rgba(0,0,0,.5);}',
    '.aimaster-desk-pet.state-thinking .pet-body{animation:ap-think 1s ease-in-out infinite;}',
    '.aimaster-desk-pet.state-correct .pet-body{animation:ap-pop .4s ease;}',
    '.aimaster-desk-pet.state-wrong .pet-body{animation:ap-shake .4s ease;}',
    '.aimaster-desk-pet.state-celebrate .pet-body{animation:ap-celebrate .7s ease;}',
    '.aimaster-desk-pet.state-sleep .pet-body{opacity:.75;}',
    '@keyframes ap-think{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}',
    '@keyframes ap-pop{0%{transform:scale(1)}40%{transform:scale(1.25)}100%{transform:scale(1)}}',
    '@keyframes ap-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}',
    '@keyframes ap-celebrate{0%{transform:scale(1) rotate(0)}25%{transform:scale(1.2) rotate(-10deg)}50%{transform:scale(1.2) rotate(10deg)}100%{transform:scale(1) rotate(0)}}',
    '.aimaster-desk-pet-bubble{position:fixed;right:104px;bottom:24px;width:280px;max-width:calc(100vw - 140px);background:rgba(13,22,40,.96);border:1px solid rgba(114,246,228,.3);border-radius:16px;padding:14px;color:#dbe6f5;font-size:13px;z-index:2147482999;box-shadow:0 10px 40px rgba(0,0,0,.55);display:none;}',
    '.aimaster-desk-pet-bubble h4{margin:0 0 8px;color:#72f6e4;font-size:15px;}',
    '.aimaster-desk-pet-bubble .quick{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}',
    '.aimaster-desk-pet-bubble .quick button{padding:5px 9px;border:1px solid rgba(114,246,228,.3);background:rgba(114,246,228,.08);color:#72f6e4;border-radius:999px;cursor:pointer;font-size:12px;}',
    '.aimaster-desk-pet-bubble .ask-row{display:flex;gap:6px;}',
    '.aimaster-desk-pet-bubble input{flex:1;min-width:0;padding:7px 10px;background:#0b1322;border:1px solid rgba(114,246,228,.25);border-radius:10px;color:#dbe6f5;font-size:12px;outline:none;}',
    '.aimaster-desk-pet-bubble button.ask-btn{padding:7px 12px;border:none;background:linear-gradient(120deg,#72f6e4,#4f8cff);color:#04121a;border-radius:10px;cursor:pointer;font-size:12px;font-weight:700;}',
    '.aimaster-desk-pet-bubble .answer{margin-top:10px;padding:10px;background:rgba(255,255,255,.04);border-radius:10px;line-height:1.6;white-space:pre-wrap;font-size:12px;max-height:180px;overflow:auto;}',
    '@media (max-width:640px){.aimaster-desk-pet{width:56px;height:56px}.aimaster-desk-pet .pet-body{font-size:34px}.aimaster-desk-pet-bubble{right:70px;bottom:14px;width:230px;}}'
  ].join('');
  document.head.appendChild(style);

  var pet = document.createElement('div');
  pet.className = 'aimaster-desk-pet';
  pet.id = 'aimasterDeskPet';
  pet.innerHTML = '<div class="pet-body">🐋</div>';
  if (state.x != null) pet.style.left = state.x + 'px';
  if (state.y != null) pet.style.top = state.y + 'px';
  pet.style.right = 'auto';
  pet.style.bottom = 'auto';

  var bubble = document.createElement('div');
  bubble.className = 'aimaster-desk-pet-bubble';
  bubble.innerHTML =
    '<h4>🐋 桌宠问答</h4>' +
    '<div class="quick">' +
    '<button data-q="我哪些地方比较薄弱？">薄弱点</button>' +
    '<button data-q="我该复习什么？">复习建议</button>' +
    '<button data-q="我最近的成绩怎么样？">最近成绩</button>' +
    '</div>' +
    '<div class="ask-row"><input placeholder="问桌宠问题…"><button class="ask-btn">提问</button></div>' +
    '<div class="answer"></div>';
  document.body.appendChild(pet);
  document.body.appendChild(bubble);

  var emojis = {
    idle: '🐋', thinking: '💭', correct: '😊', wrong: '😢', celebrate: '🎉', sleep: '😴'
  };
  var currentState = 'idle';
  function setState(s) {
    currentState = s;
    pet.className = 'aimaster-desk-pet state-' + s;
    pet.querySelector('.pet-body').textContent = emojis[s] || emojis.idle;
    clearTimeout(setState._t);
    if (s !== 'idle' && s !== 'sleep') {
      setState._t = setTimeout(function () { setState('idle'); }, 2600);
    }
  }

  var dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
  pet.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.pet-body')) {
      dragging = true;
      pet.setPointerCapture(e.pointerId);
      var rect = pet.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      origX = rect.left; origY = rect.top;
      e.preventDefault();
    }
  });
  pet.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var x = origX + (e.clientX - startX);
    var y = origY + (e.clientY - startY);
    x = Math.max(0, Math.min(window.innerWidth - pet.offsetWidth, x));
    y = Math.max(40, Math.min(window.innerHeight - pet.offsetHeight, y));
    pet.style.left = x + 'px';
    pet.style.top = y + 'px';
  });
  pet.addEventListener('pointerup', function () {
    if (!dragging) return;
    dragging = false;
    state.x = parseInt(pet.style.left, 10);
    state.y = parseInt(pet.style.top, 10);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  });

  pet.addEventListener('click', function (e) {
    if (dragging) return;
    bubble.style.display = bubble.style.display === 'block' ? 'none' : 'block';
  });

  var input = bubble.querySelector('input');
  var askBtn = bubble.querySelector('.ask-btn');
  var answerEl = bubble.querySelector('.answer');
  function ask(q) {
    var text = (q || input.value || '').trim();
    if (!text) { answerEl.textContent = '请输入问题'; return; }
    if (!window.aimasterDesktop || !window.aimasterDesktop.askMemory) {
      answerEl.textContent = '记忆问答需要在桌面应用中运行';
      return;
    }
    answerEl.textContent = '思考中...';
    setState('thinking');
    window.aimasterDesktop.askMemory(text).then(function (res) {
      answerEl.textContent = res.ok ? res.answer : ('出错了：' + (res.error || ''));
      setState('idle');
    }).catch(function (e) {
      answerEl.textContent = '出错了：' + e.message;
      setState('idle');
    });
  }
  askBtn.addEventListener('click', function () { ask(); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') ask(); });
  bubble.querySelectorAll('.quick button').forEach(function (btn) {
    btn.addEventListener('click', function () { ask(btn.getAttribute('data-q')); });
  });

  window.addEventListener('aimaster-pet-state', function (e) {
    if (e.detail && e.detail.state) setState(e.detail.state);
  });

  var idleTimer = null;
  function resetIdle() {
    clearTimeout(idleTimer);
    if (currentState === 'sleep') setState('idle');
    idleTimer = setTimeout(function () {
      if (currentState === 'idle') setState('sleep');
    }, 120000);
  }
  ['pointermove', 'pointerdown', 'keydown', 'click'].forEach(function (ev) {
    window.addEventListener(ev, resetIdle, { passive: true });
  });
  resetIdle();

  window.__aimasterDeskPet = { setState: setState, ask: ask, open: function () { bubble.style.display = 'block'; } };
})();
