// AIMaster 桌面版导航栏（由主进程注入）
(function () {
  if (window.__aimasterNavInjected) return;
  window.__aimasterNavInjected = true;

  var PAGES = [
    { key: 'home', label: '🏠 首页' },
    { key: 'dashboard', label: '📊 仪表盘' },
    { key: 'chapter', label: '📖 章节', children: [
      { key: 'chapter1', label: '第 1 章' }, { key: 'chapter2', label: '第 2 章' },
      { key: 'chapter3', label: '第 3 章' }, { key: 'chapter4', label: '第 4 章' },
      { key: 'chapter5', label: '第 5 章' }, { key: 'chapter6', label: '第 6 章' },
      { key: 'chapter7', label: '第 7 章' }, { key: 'chapter8', label: '第 8 章' },
      { key: 'chapter9', label: '第 9 章' }, { key: 'chapter10', label: '第 10 章' }
    ]},
    { key: 'learning', label: '🎓 学习中心' },
    { key: 'stars', label: '⭐ 知识星图' },
    { key: 'playground', label: '🔬 实验场' },
    { key: 'tools', label: '🧰 更多', children: [
      { key: 'canvas', label: '画布演示' }, { key: 'transition', label: '转场演示' },
      { key: 'odyssey', label: 'AI 奥德赛' }, { key: 'llm', label: 'LLM 入门' },
      { key: 'transformer', label: 'Transformer' }, { key: 'prompt', label: '提示词工坊' },
      { key: 'agentic', label: 'Agent 工程' }, { key: 'claude', label: 'Claude 工坊' },
      { key: 'rag', label: 'RAG 知识库' }, { key: 'interview', label: '面试演示' }
    ]}
  ];
  var FILES = 'NAV_FILES_JSON';
  var ROOT = 'NAV_ROOT_URL';

  function go(key) {
    var f = FILES[key];
    if (!f) return;
    // 直接用 URL 跳转（file:// 绝对路径）
    location.href = ROOT + '/' + f;
  }

  function build() {
    var nav = document.createElement('div');
    nav.id = 'aimaster-app-nav';
    nav.style.cssText = 'position:fixed;top:0;left:0;right:0;height:40px;z-index:2147482999;background:rgba(10,14,20,0.92);display:flex;align-items:center;gap:2px;padding:0 10px;font-family:system-ui,"Microsoft YaHei",sans-serif;border-bottom:1px solid rgba(79,140,255,0.25);box-shadow:0 2px 12px rgba(0,0,0,0.4);';
    nav.innerHTML = '<span style="color:#4f8cff;font-weight:700;font-size:13px;margin-right:10px;white-space:nowrap;">🐋 AIMaster</span>';
    PAGES.forEach(function (p) {
      if (p.children) {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;';
        var btn = document.createElement('button');
        btn.textContent = p.label;
        btn.style.cssText = NAV_BTN_CSS;
        var sub = document.createElement('div');
        sub.style.cssText = 'display:none;position:absolute;top:100%;left:0;background:rgba(15,22,32,0.97);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:4px;min-width:120px;box-shadow:0 8px 24px rgba(0,0,0,0.5);';
        p.children.forEach(function (c) {
          var cb = document.createElement('button');
          cb.textContent = c.label;
          cb.style.cssText = 'display:block;width:100%;text-align:left;padding:6px 10px;margin:2px 0;background:none;border:none;color:#dbe6f5;font-size:12px;border-radius:6px;cursor:pointer;';
          cb.onmouseenter = function () { cb.style.background = 'rgba(79,140,255,0.2)'; };
          cb.onmouseleave = function () { cb.style.background = 'none'; };
          cb.onclick = function () { sub.style.display = 'none'; go(c.key); };
          sub.appendChild(cb);
        });
        btn.onclick = function () { sub.style.display = sub.style.display === 'block' ? 'none' : 'block'; };
        btn.onmouseenter = function () { sub.style.display = 'block'; };
        wrap.onmouseleave = function () { sub.style.display = 'none'; };
        wrap.appendChild(btn);
        wrap.appendChild(sub);
        nav.appendChild(wrap);
      } else {
        var b = document.createElement('button');
        b.textContent = p.label;
        b.style.cssText = NAV_BTN_CSS;
        b.onclick = function () { go(p.key); };
        nav.appendChild(b);
      }
    });
    var spacer = document.createElement('div');
    spacer.style.cssText = 'height:40px;';
    document.body.insertBefore(spacer, document.body.firstChild);
    document.body.insertBefore(nav, document.body.firstChild);
    document.body.style.marginTop = '40px';
  }

  var NAV_BTN_CSS = 'padding:5px 10px;margin:0 1px;background:none;border:none;color:#c9d8ec;font-size:12.5px;border-radius:6px;cursor:pointer;white-space:nowrap;';
  function init() {
    if (!document.body) { setTimeout(init, 200); return; }
    build();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
