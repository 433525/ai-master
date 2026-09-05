(function () {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const icon = name => '<i data-lucide="' + name + '" aria-hidden="true"></i>';
  const renderIcons = () => {
    document.querySelectorAll('a[download]').forEach(link => {
      if (link.querySelector('[data-lucide],svg')) return;
      const label = link.textContent.trim();
      link.innerHTML = icon('download') + esc(label.startsWith('↓ ') ? label.slice(2) : label);
    });
    document.querySelectorAll('.icon-button[data-action="refresh-review"]').forEach(button => {
      if (!button.querySelector('[data-lucide],svg')) button.innerHTML = icon('refresh-cw');
    });
    if (window.lucide) window.lucide.createIcons({attrs:{'stroke-width':1.8}});
  };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const app = {state:{},user:{},catalog:[],status:{},view:'learn',moduleId:null,stage:'study',quiz:null,quizResult:null,diagnosticQuiz:null,diagnosticResult:null,reviews:[],reviewResults:{},busy:false,authMode:'login'};
  const main = $('#main-content');
  const dialog = $('#workspace-dialog');
  let toastTimer;

  async function api(path, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),95000);
    try {
      const response = await fetch('/api/' + path,{method:body === undefined ? 'GET' : 'POST',credentials:'same-origin',headers:body === undefined ? {} : {'Content-Type':'application/json'},body:body === undefined ? undefined : JSON.stringify(body),signal:controller.signal});
      const data = await response.json().catch(() => { throw new Error('学习服务尚未启动，请从项目的本地学习服务入口打开。'); });
      if (!response.ok || !data.ok) throw new Error(typeof data.error === 'string' ? data.error : '请求未完成，请稍后重试。');
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('请求超时，内容已保留，可以再次提交。');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  function toast(message, isError = false) {
    const element = $('#toast'); element.textContent = message; element.classList.toggle('error',isError); element.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { element.hidden = true; },isError ? 7500 : 4200);
  }
  function pet(state,message) {
    window.dispatchEvent(new CustomEvent('aimaster-pet-state',{detail:{state}}));
    if (message) $('#companion-message').textContent = message;
  }
  async function task(button,action) {
    if (app.busy) return;
    app.busy = true;
    const label = button && button.innerHTML;
    const replaceLabel = button && !button.dataset.view && !button.classList.contains('icon-button');
    if (button) { button.disabled = true; button.setAttribute('aria-busy','true'); if (replaceLabel) button.textContent = '处理中…'; }
    try { await action(); }
    catch (error) {
      toast(error.message || '暂时未能完成，请重试。',true);
      const target = dialog.open ? $('.dialog-error',dialog) : null;
      if (target) target.textContent = error.message;
    } finally {
      app.busy = false;
      if (button && button.isConnected) { button.disabled = false; button.removeAttribute('aria-busy'); if (replaceLabel) button.innerHTML = label; }
    }
  }
  const modules = () => app.state.plan && Array.isArray(app.state.plan.modules) ? app.state.plan.modules : [];
  const moduleById = id => app.catalog.find(item => item.id === id);
  const progress = id => (app.state.progress || {})[id] || {};
  const current = () => moduleById(app.moduleId);
  const date = value => value ? new Date(value).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}) : '—';
  const modeLabel = mode => mode === 'ai' ? 'AI 复评' : mode === 'fallback' ? '本地反馈 · AI 暂不可用' : '本地练习';
  const draftKey = id => 'aimaster-learning-draft:' + (app.user.id || 'guest') + ':' + id;
  function readDraft(id) { try { return localStorage.getItem(draftKey(id)) || ''; } catch (_) { return ''; } }
  function saveDraft(id,value) { try { localStorage.setItem(draftKey(id),value); } catch (_) {} }
  function applyState(data) {
    if (data.state) app.state = data.state;
    if (data.user) app.user = data.user;
    if (!modules().includes(app.moduleId) && !progress(app.moduleId).completedAt) app.moduleId = modules().find(id => !progress(id).completedAt) || modules()[0] || null;
  }
  function safeUrl(value,fallback = '#') {
    try { const url = new URL(value,location.href); return ['http:','https:'].includes(url.protocol) ? url.href : fallback; } catch (_) { return fallback; }
  }
  function renderChrome() {
    const ai = app.status.ai || {};
    $('#ai-status').innerHTML = '<span class="status-dot"></span><span>' + (ai.configured ? 'AI 复评已配置' : '本地练习') + '</span>';
    $('#ai-status').classList.toggle('ai',!!ai.configured);
    $('#ai-status').title = ai.configured ? '模型：' + (ai.model || '已配置') : '配置模型复评';
    $('#account-button').textContent = app.user.isGuest !== false ? '访客档案' : app.user.name || '我的档案';
    $('#storage-status').textContent = app.user.isGuest !== false ? '访客 · 保存在本机' : (app.user.name || '账号') + ' · 保存在本机';
    const done = modules().filter(id => progress(id).completedAt).length;
    $('#route-progress').textContent = done + ' / ' + modules().length;
    $('#route-progress-bar').max = modules().length || 1; $('#route-progress-bar').value = done;
    const wrong = app.state.wrongAnswers || [];
    $('#review-count').textContent = Array.isArray(wrong) ? wrong.filter(item => !item.resolved && !item.resolvedAt).length : Object.keys(wrong).length;
    document.querySelectorAll('[data-view]').forEach(button => { button.classList.toggle('selected',button.dataset.view === app.view); button.setAttribute('aria-current',button.dataset.view === app.view ? 'page' : 'false'); });
    $('#route-list').innerHTML = modules().length ? modules().map((id,index) => {
      const item = moduleById(id); if (!item) return '';
      const p = progress(id);
      const locked = !p.completedAt && modules().slice(0,index).some(key => !progress(key).completedAt);
      return '<button type="button" class="route-item' + (app.moduleId === id ? ' active' : '') + (p.completedAt ? ' done' : '') + '" data-module="' + esc(id) + '"' + (locked ? ' disabled title="完成前一节后解锁"' : '') + '><span class="route-index">' + (p.completedAt ? '✓' : String(index+1).padStart(2,'0')) + '</span><span>' + esc(item.title) + '<small>' + (p.completedAt ? '已通关' : locked ? '待解锁' : p.explanation ? '继续练习' : '待学习') + '</small></span></button>';
    }).join('') : '<p class="muted small">尚未建立学习计划</p>';
  }
  function planForm(inDialog = false) {
    const p = app.state.profile || {};
    const option = (value,label,selected) => '<option value="' + esc(value) + '"' + (String(value) === String(selected) ? ' selected' : '') + '>' + esc(label) + '</option>';
    return '<form id="' + (inDialog ? 'plan-dialog-form' : 'plan-form') + '"><div class="form-grid"><label class="field full">学习目标<input name="goal" maxlength="180" required value="' + esc(p.goal || '掌握 RAG，做一个有依据的知识问答助手') + '" placeholder="例如：理解大模型，完成一个 RAG 知识助手"></label><label class="field">当前基础<select name="level">' + option('beginner','刚开始学习 AI',p.level || 'beginner') + option('basic','了解基础概念',p.level) + option('experienced','有开发或项目经验',p.level) + '</select></label><label class="field">每天投入<select name="dailyMinutes">' + [30,45,60,90].map(n => option(n,n + ' 分钟',p.dailyMinutes || 30)).join('') + '</select></label><label class="field full">目标日期（选填）<input type="date" name="deadline" value="' + esc(p.deadline || '') + '"></label></div><div class="form-footer"><span class="muted">' + (inDialog ? '已完成的学习记录将保留。' : '档案保存在当前电脑。') + '</span><button type="submit" class="primary">' + (app.state.plan ? '更新学习计划' : '建立学习计划') + ' →</button></div><p class="dialog-error" role="alert"></p></form>';
  }
  function renderSetup() {
    main.innerHTML = '<div class="setup-intro"><p class="eyebrow">你的第一条学习航线</p><h1>开始讲解通关</h1><p>学习目标：能用自己的话解释 AI 概念，并完成实际情境中的判断。</p></div><div class="setup-diagnostic"><div><h3>基础诊断</h3><p>' + (app.state.diagnostic ? '已完成诊断，结果将用于安排学习航线。' : '先确认起点，找到当前需要补齐的概念。') + '</p></div><button type="button" data-action="diagnostic">' + (app.state.diagnostic ? '重新诊断' : '开始诊断') + '</button></div>' + planForm();
  }
  function render() {
    renderChrome();
    try {
    if (app.view === 'review') return renderReviews();
    if (app.view === 'records') return renderRecords();
    if (!app.state.plan || !current()) return renderSetup();
    renderLesson();
    } finally { renderIcons(); }
  }
  function renderLesson() {
    const item = current(); if (!item) return renderSetup();
    const p = progress(item.id);
    const lessonLabel = modules().includes(item.id) ? '今日学习 / ' + String(modules().indexOf(item.id)+1).padStart(2,'0') + ' · ' + String(modules().length).padStart(2,'0') : '历史课程复习';
    main.innerHTML = '<header class="page-heading"><div><p class="eyebrow">' + lessonLabel + '</p><h1>' + esc(item.title) + '</h1><p>' + esc(app.state.plan.title || '我的学习航线') + ' · 每天 ' + esc(app.state.plan.dailyMinutes) + ' 分钟</p></div><div class="heading-actions"><button type="button" data-action="plan" title="调整学习计划">调整计划</button><button type="button" data-action="diagnostic">基础诊断</button></div></header><div class="module-meta"><span class="badge">' + esc(Array.isArray(item.bloom) ? item.bloom.join(' · ') : item.bloom || '理解与应用') + '</span>' + (p.completedAt ? '<span class="badge green">已通关</span>' : '<span class="badge amber">学习中</span>') + '</div><p class="objective">' + esc(item.objective) + '</p><div class="stage-tabs" role="tablist" aria-label="学习步骤">' + [['study','阅读学习'],['explain','自己讲解'],['quiz','测验通关']].map(([id,label],n) => '<button type="button" role="tab" aria-selected="' + (app.stage === id) + '" class="' + (app.stage === id ? 'selected' : '') + '" data-stage="' + id + '"><span class="step-circle">' + (id === 'explain' && p.explanation && p.explanation.accepted || id === 'quiz' && p.quiz && p.quiz.passed ? '✓' : n+1) + '</span>' + label + '</button>').join('') + '</div><section class="stage-panel" id="stage-panel" role="tabpanel">' + (app.stage === 'study' ? studyPanel(item) : app.stage === 'explain' ? explainPanel(item,p) : quizPanel(item,p)) + '</section>';
  }
  function planSummary(item) {
    const plan = app.state.plan || {};
    const session = (plan.schedule || []).find(entry => entry.moduleId === item.id);
    return '<div class="plan-summary"><span>预计 ' + esc(plan.estimatedDays || '—') + ' 天完成</span>' + (session ? '<span>本节约 ' + esc(session.minutes) + ' 分钟</span><span>第 ' + esc(session.startDay) + (session.endDay !== session.startDay ? '–' + esc(session.endDay) : '') + ' 天</span>' + (session.reinforcementMinutes ? '<span class="reinforcement">诊断补习 +' + esc(session.reinforcementMinutes) + ' 分钟</span>' : '') : '') + '</div><details class="plan-reason"><summary>本次航线安排</summary><p>' + esc(plan.reason || '') + '</p></details>';
  }
  function studyPanel(item) {
    const summary = Array.isArray(item.summary) ? item.summary.join('\n\n') : item.summary || '';
    return planSummary(item) + '<h2>本节要点</h2><div class="summary">' + esc(summary) + '</div><ul class="concepts">' + (item.concepts || []).map(c => '<li>' + esc(c.label) + '</li>').join('') + '</ul><a class="study-link" href="' + esc(safeUrl(item.learnUrl)) + '" target="_blank" rel="noopener">进入完整课程 ↗</a><div class="section-band" style="margin-top:24px"><h3>讲解任务</h3><p class="explanation-prompt">' + esc(item.prompt) + '</p><button type="button" class="primary" data-stage="explain">开始自己的讲解 →</button></div>';
  }
  function explainPanel(item,p) {
    const saved = readDraft(item.id) || (p.explanation && p.explanation.text) || '';
    return '<h2>换成自己的话，说清楚</h2><p class="explanation-prompt">' + esc(item.prompt) + '</p><form id="explanation-form"><label class="field" for="explanation-text">我的讲解<textarea id="explanation-text" name="text" required minlength="20" maxlength="6000" placeholder="从概念开始，说明它为什么这样工作，再给出一个具体例子和它的局限。">' + esc(saved) + '</textarea></label><div class="form-footer"><span class="muted" id="draft-status">' + saved.length + ' / 6000 字 · 草稿保存在此浏览器</span><button type="submit" class="primary">提交讲解</button></div></form>' + (!(app.status.ai || {}).configured ? '<p class="notice">当前为本地练习，检查表达覆盖与基础规则，不代表模型已理解你的讲解。通关还需通过客观测验。</p>' : '') + (p.quiz ? '<p class="small muted" style="margin-top:12px">重新提交讲解后，需要重新测验。</p>' : '') + (p.explanation ? feedbackPanel(p.explanation) : '');
  }
  function feedbackPanel(result) {
    const feedback = Array.isArray(result.feedback) ? result.feedback.join('；') : result.feedback;
    return '<div class="feedback"><div class="feedback-title"><strong>' + (result.accepted ? '讲解练习已通过' : result.mode === 'fallback' ? 'AI 复评暂未完成' : '再完善一下讲解') + '</strong><span class="badge ' + (result.accepted ? 'green' : 'amber') + '">' + esc(modeLabel(result.mode)) + '</span></div><p class="small">' + esc(feedback || (result.accepted ? '继续完成测验。' : '请依据下方反馈修订。')) + '</p><ul class="checks">' + (result.checks || []).map(c => '<li class="check' + (c.pass ? ' pass' : '') + '"><strong>' + (c.pass ? '✓ ' : '○ ') + esc(c.label) + '</strong><span>' + esc(c.detail) + '</span></li>').join('') + '</ul>' + (result.followUp ? '<div class="follow-up"><strong>再想一层</strong><br>' + esc(Array.isArray(result.followUp) ? result.followUp.join('；') : result.followUp) + '</div>' : '') + (result.accepted ? '<div class="button-row" style="margin-top:18px"><button type="button" class="primary" data-stage="quiz">进入测验 →</button></div>' : '') + '</div>';
  }
  function questionsHtml(quiz,result) {
    return quiz.questions.map((q,index) => {
      const answer = result && (result.items || []).find(item => item.id === q.id);
      return '<fieldset class="quiz-question"><legend>' + (index+1) + '. ' + esc(q.prompt || q.question) + '</legend><div class="quiz-options">' + (q.options || []).map((option,i) => '<label class="quiz-option"><input type="radio" name="q:' + esc(q.id) + '" value="' + i + '" required' + (answer && answer.selected === i ? ' checked' : '') + (result ? ' disabled' : '') + '><span>' + String.fromCharCode(65+i) + '. ' + esc(option) + '</span></label>').join('') + '</div>' + (answer ? '<div class="answer-detail' + (answer.correct ? ' correct' : '') + '"><strong>' + (answer.correct ? '✓ 回答正确' : '正确答案：' + String.fromCharCode(65+Number(answer.answer))) + '</strong>' + esc(answer.explanation) + '</div>' : '') + (q.source && q.source.url ? '<a class="quiz-source" href="' + esc(safeUrl(q.source.url)) + '" target="_blank" rel="noopener">参考：' + esc(q.source.title || '课程资料') + ' ↗</a>' : '') + '</fieldset>';
    }).join('');
  }
  function quizPanel(item,p) {
    const accepted = p.explanation && p.explanation.accepted;
    const passed = p.quiz && p.quiz.passed;
    let html = '<div class="section-header"><h2>情境测验</h2><span class="badge">通过线 75%</span></div>';
    if (!accepted && !p.completedAt) return html + '<p class="muted small">先完成本节讲解，再开始通关测验。</p><button type="button" class="primary" data-stage="explain">返回讲解 →</button>';
    if (app.quiz && app.quiz.moduleId === item.id) {
      html += '<form id="quiz-form">' + questionsHtml(app.quiz,app.quizResult) + '<div class="form-footer">' + (app.quizResult ? '<div><span class="result-score">' + esc(app.quizResult.score) + '%</span><span class="muted small"> · ' + esc(app.quizResult.correct) + ' / ' + esc(app.quizResult.total) + ' 题正确</span></div><button type="button" data-action="start-quiz">重新测验</button>' : '<span class="muted">所有题目作答后提交。</span><button type="submit" class="primary">提交测验</button>') + '</div></form>';
    } else html += '<p class="small muted">' + (p.quiz ? '上次测验：' + esc(p.quiz.score) + '%。' : '用具体情境检验刚刚学到的概念。') + '</p><button type="button" class="primary" data-action="start-quiz">' + (p.quiz ? '重新测验' : '开始测验') + '</button>';
    html += '<section class="section-band" style="margin-top:26px"><h2>本节通关</h2><ul class="requirements"><li><span>讲解练习</span><span>' + (accepted ? '✓ 已通过' : '待通过') + '</span></li><li><span>客观测验 ≥ 75%</span><span>' + (passed ? '✓ 已通过' : '待通过') + '</span></li></ul>';
    if (p.completedAt) html += '<div class="completion-summary"><span class="completion-icon" aria-hidden="true">✓</span><div><h3>这一个概念，已留下你的理解</h3><p>通关于 ' + date(p.completedAt) + (p.dueAt ? ' · 复习时间 ' + date(p.dueAt) : '') + '</p></div></div><button type="button" class="primary" data-action="next-module">继续下一节 →</button>';
    else html += '<button type="button" class="success" data-action="complete"' + (!(accepted && passed) ? ' disabled' : '') + '>完成本节通关 ✓</button>';
    return html + '</section>';
  }
  function renderRecords() {
    const attempts = Array.isArray(app.state.attempts) ? app.state.attempts : [];
    const done = Object.values(app.state.progress || {}).filter(item => item.completedAt).length;
    const quizzes = attempts.filter(item => item.type === 'quiz' || item.kind === 'quiz' || item.result && item.result.total);
    main.innerHTML = '<header class="page-heading"><div><p class="eyebrow">留下真实的学习过程</p><h1>学习记录</h1><p>' + esc(app.user.isGuest !== false ? '访客档案' : app.user.name) + ' · 本机保存</p></div></header><div class="metric-grid"><div class="metric"><strong>' + done + '</strong><span>已通关模块</span></div><div class="metric"><strong>' + attempts.length + '</strong><span>累计练习记录</span></div><div class="metric"><strong>' + quizzes.length + '</strong><span>客观测验记录</span></div></div><h2>记录导出</h2><div class="export-links"><a class="button-link" href="/api/export" download>↓ 学习档案 JSON</a><a class="button-link" href="/api/export?format=csv" download>↓ 测验记录 CSV</a></div><p class="small muted" style="margin-top:10px">只包含当前档案的实际作答与反馈。</p><section class="section-band"><h2>最近练习</h2>' + (attempts.length ? '<div class="table-wrap"><table class="record-table"><thead><tr><th>学习内容</th><th>练习</th><th>结果</th><th>时间</th></tr></thead><tbody>' + attempts.slice().reverse().slice(0,40).map(a => {
      const r = a.result || a; const kind = a.type || a.kind || (r.total ? 'quiz' : 'explanation'); const item = moduleById(a.moduleId); const isQuiz = kind === 'quiz' || kind === 'diagnostic' || r.total;
      return '<tr><td>' + esc(item ? item.title : kind === 'diagnostic' || a.mode === 'diagnostic' ? '基础诊断' : kind === 'plan' ? a.goal || '学习航线' : '学习练习') + '</td><td>' + (kind === 'plan' ? '计划调整' : kind === 'complete' ? '通关' : kind === 'review' ? '错题复习' : isQuiz ? '客观测验' : '讲解') + '</td><td>' + (kind === 'plan' ? '已保存' : kind === 'complete' ? '✓ 已完成' : isQuiz ? esc(r.score == null ? '—' : r.score + '%') : esc(modeLabel(r.mode))) + '</td><td>' + date(a.createdAt || a.at || a.timestamp) + '</td></tr>';
    }).join('') + '</tbody></table></div>' : '<div class="empty-state"><p>还没有练习记录。</p><button type="button" data-view="learn">开始学习</button></div>') + '</section>';
  }
  function renderReviews() {
    const due = Object.entries(app.state.progress || {}).filter(([,p]) => p.completedAt && p.dueAt && new Date(p.dueAt).getTime() <= Date.now());
    main.innerHTML = '<header class="page-heading"><div><p class="eyebrow">把薄弱处，变成下一次的把握</p><h1>错题与复习</h1><p>' + app.reviews.length + ' 道待巩固题目 · ' + due.length + ' 节到期复习</p></div><button type="button" class="icon-button" title="刷新复习列表" aria-label="刷新复习列表" data-action="refresh-review">↻</button></header>' + (due.length ? '<section class="section-band"><h2>到期复习</h2>' + due.map(([id]) => '<div class="section-header"><span>' + esc((moduleById(id) || {}).title || id) + '</span><button type="button" data-module="' + esc(id) + '">重温与测验</button></div>').join('') + '</section>' : '') + '<section class="section-band"><h2>错题巩固</h2>' + (app.reviews.length ? app.reviews.map((entry,index) => {
      const q = entry.question && typeof entry.question === 'object' ? entry.question : entry; const id = q.id || entry.questionId; const r = app.reviewResults[id];
      return '<form class="review-item" data-review-form="' + esc(id) + '"><h3>' + (index+1) + '. ' + esc(q.prompt || q.question || entry.prompt) + '</h3><div class="quiz-options">' + (q.options || entry.options || []).map((option,i) => '<label class="quiz-option"><input type="radio" name="answer" value="' + i + '" required' + (r ? ' disabled' : '') + '><span>' + esc(option) + '</span></label>').join('') + '</div>' + (r ? '<p class="notice ' + (r.correct ? 'success' : '') + '">' + (r.correct ? '✓ 回答正确。' : '再巩固一次。') + esc(r.explanation || r.feedback || '') + '</p><button type="button" data-action="refresh-review">继续复习</button>' : '<button type="submit">提交复习</button>') + '</form>';
    }).join('') : '<div class="empty-state"><h3>暂时没有待巩固错题</h3><p>完成测验后，答错的题目会出现在这里。</p><button type="button" data-view="learn">返回学习</button></div>') + '</section>';
  }
  function showDialog(title,html) {
    $('#dialog-content').innerHTML = '<div class="dialog-heading"><h2 id="dialog-title">' + esc(title) + '</h2><button type="button" class="icon-button" aria-label="关闭" title="关闭" data-action="close-dialog">' + icon('x') + '</button></div>' + html;
    renderIcons();
    if (!dialog.open) dialog.showModal();
  }
  function settingsDialog() {
    const ai = app.status.ai || {};
    showDialog('模型复评设置','<p class="dialog-subtitle">讲解内容将发送给你配置的模型服务。未配置时使用本地练习规则。</p><form id="settings-form"><label class="field">接口地址<input type="url" name="baseUrl" required value="' + esc(ai.baseUrl || 'https://api.deepseek.com/v1') + '"></label><label class="field">模型名称<input name="model" required value="' + esc(ai.model || 'deepseek-chat') + '" maxlength="120"></label><label class="field">API Key<input type="password" name="apiKey" autocomplete="off" placeholder="' + (ai.configured ? '留空保留当前密钥' : '输入模型服务密钥') + '"><small>保存在本机，不在学习记录中导出。</small></label><div class="form-footer">' + (ai.configured ? '<button type="button" data-action="clear-ai">关闭 AI 复评</button>' : '<span class="muted">当前：未配置</span>') + '<button type="submit" class="primary">保存设置</button></div><p class="dialog-error" role="alert"></p></form>');
  }
  function accountDialog() {
    if (app.user.isGuest === false) return showDialog('我的学习档案','<h3>' + esc(app.user.name) + '</h3><p class="dialog-subtitle">当前账号的学习记录保存在这台电脑。</p><div class="button-row"><a class="button-link" href="/api/export" download>↓ 导出档案</a><button type="button" data-action="logout">退出账号</button></div><p class="dialog-error" role="alert"></p>');
    showDialog('本机学习档案','<div class="dialog-tabs"><button type="button" data-auth-mode="login" class="' + (app.authMode === 'login' ? 'selected' : '') + '">登录</button><button type="button" data-auth-mode="register" class="' + (app.authMode === 'register' ? 'selected' : '') + '">创建账号</button></div><p class="dialog-subtitle">' + (app.authMode === 'register' ? '为这台电脑上的学习档案设置账号。' : '登录这台电脑上已有的学习账号。') + '</p><form id="account-form"><label class="field">名称<input name="name" autocomplete="username" required minlength="2" maxlength="40"></label><label class="field">密码<input type="password" name="password" autocomplete="' + (app.authMode === 'register' ? 'new-password' : 'current-password') + '" required minlength="8" maxlength="128"><small>至少 8 位</small></label><div class="form-footer"><button type="button" data-action="close-dialog">继续使用访客档案</button><button type="submit" class="primary">' + (app.authMode === 'register' ? '创建账号' : '登录') + '</button></div><p class="dialog-error" role="alert"></p></form>');
  }
  function diagnosticDialog() {
    const r = app.diagnosticResult;
    showDialog('基础诊断','<p class="dialog-subtitle">依据当前理解作答，诊断结果用于安排起点。</p><form id="diagnostic-form">' + questionsHtml(app.diagnosticQuiz,r) + '<div class="form-footer">' + (r ? '<div><strong class="result-score">' + esc(r.score) + '%</strong><span class="small muted"> · ' + esc(r.correct) + ' / ' + esc(r.total) + ' 题正确</span></div><button type="button" class="primary" data-action="diagnostic-done">' + (app.state.plan ? '更新学习航线' : '设置学习计划') + '</button>' : '<span class="muted">按真实理解作答</span><button type="submit" class="primary">完成诊断</button>') + '</div><p class="dialog-error" role="alert"></p></form>');
  }
  async function loadReviews() { const data = await api('review'); app.reviews = (data.items || []).filter(item => !item.resolved || item.due); app.reviewResults = {}; }
  function readAnswers(form,quiz) { const values = new FormData(form); return Object.fromEntries(quiz.questions.map(q => [q.id,Number(values.get('q:' + q.id))])); }
  function selectModule(id) {
    if (!moduleById(id)) return;
    app.moduleId = id; app.view = 'learn'; app.stage = 'study'; app.quiz = null; app.quizResult = null; render(); main.focus({preventScroll:true});
  }
  async function startQuiz() {
    if (!current()) { toast('先建立学习计划。'); return; }
    app.view = 'learn'; app.stage = 'quiz';
    if (!progress(app.moduleId).completedAt && !(progress(app.moduleId).explanation || {}).accepted) { render(); return; }
    const data = await api('quiz?module=' + encodeURIComponent(app.moduleId)); app.quiz = data.quiz; app.quizResult = null; render();
  }
  document.addEventListener('input',event => {
    if (event.target.id === 'explanation-text') { saveDraft(app.moduleId,event.target.value); $('#draft-status').textContent = event.target.value.length + ' / 6000 字 · 草稿已保存'; }
  });
  document.addEventListener('click',event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.companion) { window.dispatchEvent(new CustomEvent('aimaster-companion-action',{detail:{action:button.dataset.companion}})); return; }
    if (button.dataset.stage) { if (app.busy) return; app.stage = button.dataset.stage; render(); return; }
    if (button.dataset.module) { if (!app.busy) selectModule(button.dataset.module); return; }
    if (button.dataset.authMode) { if (!app.busy) { app.authMode = button.dataset.authMode; accountDialog(); } return; }
    if (button.dataset.view) return void task(button,async () => { app.view = button.dataset.view; if (app.view === 'review') await loadReviews(); render(); });
    const action = button.dataset.action;
    if (action === 'close-dialog') return dialog.close();
    if (app.busy) return;
    if (action === 'settings') return settingsDialog();
    if (action === 'account') return accountDialog();
    if (action === 'plan') return showDialog('调整学习计划',planForm(true));
    if (action === 'diagnostic-done') return showDialog('设置学习计划',planForm(true));
    if (action === 'next-module') { const next = modules().find(id => !progress(id).completedAt); if (next) selectModule(next); else { app.view = 'records'; render(); toast('当前学习航线已完成，记得按期复习。'); } return; }
    task(button,async () => {
      if (action === 'diagnostic') { const data = await api('quiz?mode=diagnostic'); app.diagnosticQuiz = data.quiz; app.diagnosticResult = null; diagnosticDialog(); }
      if (action === 'start-quiz') await startQuiz();
      if (action === 'complete') { applyState(await api('complete',{moduleId:app.moduleId})); pet('celebrate','这一节已通关，继续下一段航线。'); render(); toast('通关记录已保存，复习已安排。'); }
      if (action === 'refresh-review') { await loadReviews(); render(); }
      if (action === 'clear-ai') { const data = await api('ai/config',{clear:true}); app.status.ai = data.ai; dialog.close(); render(); toast('已切换为本地练习。'); }
      if (action === 'logout') { applyState(await api('auth/logout',{})); app.quiz = null; app.quizResult = null; app.view = 'learn'; dialog.close(); render(); toast('已退出账号。'); }
      if (action === 'retry-connect') await initialize();
    });
  });
  document.addEventListener('submit',event => {
    const form = event.target;
    if (!['plan-form','plan-dialog-form','explanation-form','quiz-form','diagnostic-form','settings-form','account-form'].includes(form.id) && !form.dataset.reviewForm) return;
    event.preventDefault();
    task($('button[type="submit"]',form),async () => {
      const values = new FormData(form);
      if (form.id === 'plan-form' || form.id === 'plan-dialog-form') {
        applyState(await api('plan',{goal:String(values.get('goal')).trim(),level:values.get('level'),dailyMinutes:Number(values.get('dailyMinutes')),deadline:values.get('deadline') || undefined}));
        app.view = 'learn'; app.stage = 'study'; app.quiz = null; app.quizResult = null; dialog.close(); render(); toast('学习计划已保存。');
      }
      if (form.id === 'explanation-form') {
        const id = app.moduleId; const text = String(values.get('text')).trim(); saveDraft(id,text); pet('thinking','我在看你的讲解，稍等一下。');
        const data = await api('explanation',{moduleId:id,text}); applyState(data); app.quiz = null; app.quizResult = null;
        if (data.result && !progress(id).explanation) { app.state.progress = app.state.progress || {}; app.state.progress[id] = {...progress(id),explanation:data.result}; }
        pet(data.result.accepted ? 'correct' : 'wrong',data.result.accepted ? '讲解已通过，再用测验检验一次。' : '看一看反馈，再补上缺少的部分。'); render();
      }
      if (form.id === 'quiz-form' || form.id === 'diagnostic-form') {
        const diagnostic = form.id === 'diagnostic-form'; const quiz = diagnostic ? app.diagnosticQuiz : app.quiz;
        const data = await api('quiz',{attemptId:quiz.id,answers:readAnswers(form,quiz)}); applyState(data);
        pet(data.result.passed ? 'correct' : 'wrong',data.result.passed ? '测验通过了，继续保持。' : '错题已经记下，再理解一次。');
        if (diagnostic) { app.diagnosticResult = data.result; render(); diagnosticDialog(); } else { app.quizResult = data.result; render(); }
      }
      if (form.id === 'settings-form') {
        const data = await api('ai/config',{baseUrl:String(values.get('baseUrl')).trim(),model:String(values.get('model')).trim(),apiKey:String(values.get('apiKey')).trim()});
        app.status.ai = data.ai || (await api('status')).ai; dialog.close(); render(); toast('模型设置已保存。');
      }
      if (form.id === 'account-form') {
        applyState(await api('auth/' + app.authMode,{name:String(values.get('name')).trim(),password:values.get('password')})); app.quiz = null; app.quizResult = null; app.view = 'learn'; app.stage = 'study'; dialog.close(); render(); toast('已进入你的学习档案。');
      }
      if (form.dataset.reviewForm) {
        const id = form.dataset.reviewForm; const data = await api('review',{questionId:id,answer:Number(values.get('answer'))}); applyState(data);
        const itemResult = data.result.items && data.result.items[0];
        app.reviewResults[id] = {...data.result,correct:!!data.result.correct,explanation:itemResult ? itemResult.explanation : data.result.explanation}; pet(data.result.correct ? 'correct' : 'wrong'); render();
      }
    });
  });
  window.addEventListener('aimaster-companion-quiz',() => task(null,startQuiz));
  dialog.addEventListener('click',event => {
    if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); }
  });
  async function initialize() {
    try {
      // Establish the session before independent reads so first-visit cookies cannot race.
      const data = await api('state');
      const [status,catalog] = await Promise.all([api('status'),api('catalog')]); app.status = status; app.catalog = catalog.modules || []; applyState(data); render();
    } catch (error) {
      main.innerHTML = '<div class="empty-state"><p class="eyebrow">学习服务未连接</p><h1>当前无法读取学习档案</h1><p>' + esc(error.message) + '</p><div class="button-row"><button type="button" class="primary" data-action="retry-connect">重新连接</button><a class="button-link" href="../dashboard/">先浏览课程</a></div></div>';
      $('#ai-status').innerHTML = '<span class="status-dot"></span><span>服务未连接</span>';
    }
  }
  initialize();
})();
