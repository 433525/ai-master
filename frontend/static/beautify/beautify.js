/* ============================================================
   AIMaster 星际美化层 - 交互动效
   - 滚动渐入动画（IntersectionObserver）
   - 卡片鼠标跟随光效
   - 导航栏平滑过渡
   ============================================================ */
(function () {
  'use strict';
  if (window.__aimasterBeautifyLoaded) return;
  window.__aimasterBeautifyLoaded = true;

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 滚动渐入 ---------- */
  function applyReveal() {
    // 选择主要内容块添加渐入
    var selectors = [
      '.hero', '.systems', '.route', '.chapter-hero', '.knowledge-route',
      '.knowledge', '.tool', '.sector', '.feature-card', '.scene-copy',
      '.portal', '.brand-lockup', '.feature-deck', 'section', 'article',
      '.demo-page > section', '.intro-shell > section'
    ];
    var els = [];
    selectors.forEach(function (sel) {
      try {
        var found = document.querySelectorAll(sel);
        for (var i = 0; i < found.length; i++) {
          var el = found[i];
          // 跳过已经处理过的和太小的元素
          if (el.classList.contains('am-reveal')) continue;
          if (el.offsetWidth < 40) continue;
          // 只处理一屏内可见性较高的：直接子元素或较明显区块
          els.push(el);
        }
      } catch (e) { }
    });

    // 去重
    var seen = {};
    els.forEach(function (el) {
      if (seen[el]) return;
      seen[el] = true;
      el.classList.add('am-reveal');
    });
  }

  var observer = null;
  function initObserver() {
    if (reduced) { return; }
    if (!('IntersectionObserver' in window)) {
      // 降级：直接显示
      document.querySelectorAll('.am-reveal').forEach(function (el) { el.classList.add('am-visible'); });
      return;
    }
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('am-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.am-reveal').forEach(function (el) { observer.observe(el); });
  }

  /* ---------- 卡片鼠标跟随光效 ---------- */
  function initCardGlow() {
    if (reduced) return;
    var cards = document.querySelectorAll('.tool, .sector, .knowledge-card, .feature-card, .aw-av');
    cards.forEach(function (card) {
      if (card.getAttribute('data-am-glow')) return;
      card.setAttribute('data-am-glow', '1');
      card.style.position = card.style.position || 'relative';
      // 创建跟随光点
      var glow = document.createElement('span');
      glow.className = 'am-card-glow';
      glow.style.cssText = 'position:absolute;pointer-events:none;width:120px;height:120px;border-radius:50%;' +
        'background:radial-gradient(circle,rgba(114,246,228,.14),rgba(169,155,255,.10) 40%,transparent 70%);' +
        'top:-60px;left:-60px;opacity:0;transition:opacity .3s ease;z-index:0;';
      card.appendChild(glow);
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        glow.style.left = (e.clientX - r.left - 60) + 'px';
        glow.style.top = (e.clientY - r.top - 60) + 'px';
        glow.style.opacity = '1';
      });
      card.addEventListener('pointerleave', function () { glow.style.opacity = '0'; });
    });
  }

  /* ---------- 导航栏毛玻璃增强 ---------- */
  function enhanceNav() {
    var nav = document.getElementById('aimaster-app-nav');
    if (nav) {
      nav.style.background = 'rgba(10,14,22,0.85)';
      nav.style.backdropFilter = 'blur(16px)';
      nav.style.webkitBackdropFilter = 'blur(16px)';
    }
  }

  /* ---------- 初始化 ---------- */
  function init() {
    if (!document.body) { setTimeout(init, 100); return; }
    applyReveal();
    initObserver();
    initCardGlow();
    enhanceNav();
    // 如果内容变化（章节展开等），重新检查
    document.addEventListener('click', function () {
      setTimeout(function () {
        initCardGlow();
        document.querySelectorAll('.am-reveal:not(.am-visible)').forEach(function (el) {
          if (observer) observer.observe(el);
        });
      }, 150);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
