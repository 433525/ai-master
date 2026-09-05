'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomInt } = require('node:crypto');
const { openStore } = require('./store');
const { publicConfig, validateConfig, reviewExplanation } = require('./ai-review');

const ROOT = path.resolve(__dirname, '..');
const DAY = 86400000;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const stamp = () => new Date().toISOString();
function reviewDelayDays(correctStreak) {
  const schedule = [1, 3, 7, 14, 30];
  const index = Math.min(Math.max(Number(correctStreak || 1) - 1, 0), schedule.length - 1);
  return schedule[index];
}
const shuffled = input => {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
};
function shuffleQuestion(q) {
  const order = shuffled(q.options.map((_, i) => i));
  return { ...q, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer) };
}
const publicQuestion = ({ answer, explanation, ...q }) => q;
function publicCatalog(catalog) {
  return { ...catalog, modules: catalog.modules.map(({ questions, ...module }) => ({ ...module, questionCount: questions.length })) };
}
async function readBody(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) fail(415, '请求需要使用 JSON 格式。');
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 64000) fail(413, '提交内容过长。');
  }
  try {
    const data = JSON.parse(body || '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail(400, '请求格式不正确。');
    return data;
  } catch { fail(400, '请求格式不正确。'); }
}
function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

function createApp(options = {}) {
  const core = options.core || require('../frontend/static/js/learning-core');
  const catalog = options.catalog || JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend/data/learning-curriculum.json'), 'utf8'));
  const store = openStore(options.dbPath || path.join(ROOT, '.local/learning.sqlite'));
  const modules = new Map(catalog.modules.map(m => [m.id, m]));
  const questions = new Map(catalog.modules.flatMap(m => m.questions.map(q => [q.id, { ...q, moduleId: m.id }])));
  const rate = new Map();
  function limited(key, count, windowMs) {
    const now = Date.now();
    if (rate.size > 2000) for (const [k, v] of rate) if (v.until < now) rate.delete(k);
    const item = rate.get(key);
    if (!item || item.until < now) return rate.set(key, { count: 1, until: now + windowMs });
    if (item.count >= count) fail(429, '操作过于频繁，请稍后再试。');
    item.count++;
  }
  function moduleFor(state, id) {
    const module = modules.get(id);
    if (!module) fail(404, '未找到这个学习任务。');
    if (state.progress[id]?.completedAt) return module;
    if (!state.plan?.modules.includes(id)) fail(409, '请先生成包含这个任务的学习计划。');
    const earlier = state.plan.modules.slice(0, state.plan.modules.indexOf(id));
    if (earlier.some(key => !state.progress[key]?.completedAt)) fail(409, '请先完成路线中前面的任务。');
    return module;
  }
  function progressFor(state, id) {
    return state.progress[id] ||= { explanation: null, quiz: null, completedAt: null, dueAt: null, reviewCount: 0 };
  }
  function quizDay() {
    return new Date().toISOString().slice(0, 10);
  }
  function reserveQuizAttempt(state, moduleId) {
    const day = quizDay();
    state.quizAttempts ||= {};
    state.quizAttempts[day] ||= {};
    const used = Number(state.quizAttempts[day][moduleId] || 0);
    if (used >= 3) fail(429, '本模块今日正式测验最多 3 次，请明天再试。');
    state.quizAttempts[day][moduleId] = used + 1;
    for (const key of Object.keys(state.quizAttempts)) if (key !== day) delete state.quizAttempts[key];
    return 3 - used - 1;
  }
  function addAttempt(state, item) {
    state.attempts.push({ id: randomUUID(), at: stamp(), ...item });
    // A local prototype retains the most recent 2000 interactions per learner.
    state.attempts = state.attempts.slice(-2000);
  }
  function checkAnswers(list, answers) {
    if (!answers || typeof answers !== 'object' || Array.isArray(answers) || list.some(q => !Number.isInteger(answers[q.id]) || answers[q.id] < 0 || answers[q.id] >= q.options.length)) {
      fail(400, '请完成所有题目后提交。');
    }
  }
  function gradeWithContext(list, answers) {
    const result = core.gradeQuiz(list, answers);
    const presented = new Map(list.map(question => [question.id, question]));
    return { ...result, items: result.items.map(item => {
      const question = presented.get(item.id);
      return { ...item, prompt: question.prompt, options: [...question.options],
        selectedText: item.selected === null ? null : question.options[item.selected],
        answerText: question.options[item.answer], source: question.source };
    }) };
  }
  async function api(req, res, url) {
    const route = url.pathname.slice(5);
    if (!['GET', 'POST'].includes(req.method)) fail(405, '不支持此请求方式。');
    if (req.method === 'POST') {
      if (req.headers['sec-fetch-site'] === 'cross-site') fail(403, '不接受其他网站提交的请求。');
      if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) fail(403, '请求来源不匹配。');
    }
    let token = String(req.headers.cookie || '').match(/(?:^|;\s*)aimaster_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    let user = store.session(token);
    function setSession(next) {
      user = next.user; token = next.token;
      res.setHeader('Set-Cookie', `aimaster_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);
    }
    if (!user) setSession(store.guest());
    const body = req.method === 'POST' ? await readBody(req) : null;
    let state = store.state(user.id);
    const send = payload => json(res, 200, { ok: true, ...payload });
    const save = () => store.save(user.id, state);
    if (req.method === 'GET') {
      if (route === 'status') return send({ mode: 'server', ai: publicConfig(store.config()), version: 'ican-1.0' });
      if (route === 'catalog') return send(publicCatalog(catalog));
      if (route === 'state') return send({ state, user });
      if (route === 'quiz') {
        limited('quiz:' + user.id, 60, 60000);
        const diagnostic = url.searchParams.get('mode') === 'diagnostic';
        const module = diagnostic ? null : moduleFor(state, url.searchParams.get('module'));
        const attemptsRemaining = !diagnostic && !state.progress[module.id]?.completedAt ? reserveQuizAttempt(state, module.id) : null;
        const selected = diagnostic ? catalog.modules.map(m => m.questions[0]) : module.questions;
        const list = shuffled(selected).map(shuffleQuestion);
        const quiz = { id: randomUUID(), moduleId: module?.id || null, mode: diagnostic ? 'diagnostic' : 'module', questions: list,
          revision: module ? progressFor(state, module.id).revision || null : null, planRevision: state.planRevision || null };
        store.putQuiz(quiz.id, user.id, quiz);
        if (attemptsRemaining !== null) save();
        return send({ quiz: { id: quiz.id, moduleId: quiz.moduleId, mode: quiz.mode, attemptsRemaining, questions: list.map(publicQuestion) } });
      }
      if (route === 'review') {
        const items = state.wrongAnswers.map(item => ({ ...item, question: publicQuestion(questions.get(item.questionId)), due: Date.parse(item.dueAt) <= Date.now() }));
        const dueModules = Object.entries(state.progress).filter(([, p]) => p.completedAt && Date.parse(p.dueAt) <= Date.now()).map(([id, p]) => ({ moduleId: id, title: modules.get(id)?.title, dueAt: p.dueAt }));
        return send({ items, dueModules });
      }
      if (route === 'export') {
        const csv = url.searchParams.get('format') === 'csv';
        const filename = csv ? 'ai-master-learning.csv' : 'ai-master-learning.json';
        res.writeHead(200, { 'Content-Type': csv ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' });
        if (csv) {
          const rows = [['time', 'type', 'module', 'mode', 'score', 'passed', 'correct', 'total'], ...state.attempts.map(a => [a.at, a.type, a.moduleId, a.mode, a.score, a.passed ?? a.accepted, a.correct, a.total])];
          return res.end('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'));
        }
        return res.end(JSON.stringify({ schema: 'aimaster-learning/1', exportedAt: stamp(), user, state,
          notice: '本机实际操作记录；包含练习与测试操作，不代表真实用户研究或教育效果证明。', retention: '每个档案保留最近2000次交互。' }, null, 2));
      }
    } else {
      if (route.startsWith('auth/')) {
        limited('auth:' + req.socket.remoteAddress, 30, 60000);
        if (route === 'auth/logout') { store.endSession(token); setSession(store.guest()); return send({ user, state: store.state(user.id) }); }
        const name = String(body.name || '').trim();
        const password = String(body.password || '');
        if (name.length < 2 || name.length > 32 || /[\u0000-\u001f]/.test(name) || password.length < 8 || password.length > 128) fail(400, '昵称需 2–32 字，密码需 8–128 位。');
        if (route === 'auth/register') {
          user = store.register(user.id, name, password); store.endSession(token);
          setSession({ user, token: store.createSession(user.id) });
        } else if (route === 'auth/login') {
          const next = store.login(name, password); store.endSession(token); setSession(next);
        } else fail(404, '接口不存在。');
        return send({ user, state: store.state(user.id) });
      }
      if (route === 'plan') {
        const goal = String(body.goal || '').trim();
        if (goal.length < 2 || goal.length > 500 || !['beginner', 'basic', 'experienced'].includes(body.level) || ![30, 45, 60, 90].includes(body.dailyMinutes)) fail(400, '请填写学习目标、基础和每天可用时间。');
        state.profile = { goal, level: body.level, dailyMinutes: body.dailyMinutes, deadline: String(body.deadline || '').slice(0, 32) };
        state.plan = core.createPlan({ ...state.profile, diagnostic: state.diagnostic }, catalog);
        state.planRevision = randomUUID();
        // A new plan invalidates unfinished evidence; completed tasks remain available.
        for (const p of Object.values(state.progress)) if (!p.completedAt) { p.explanation = null; p.quiz = null; p.revision = null; }
        addAttempt(state, { type: 'plan', goal, level: body.level, dailyMinutes: body.dailyMinutes }); save();
        return send({ state });
      }
      if (route === 'explanation') {
        limited('explanation:' + user.id, 12, 60000);
        const module = moduleFor(state, body.moduleId);
        if (typeof body.text !== 'string' || body.text.length > 6000) fail(400, '讲解内容需为文本，最多 6000 字。');
        const revision = randomUUID();
        const p = progressFor(state, module.id);
        p.revision = revision; p.quiz = null; p.explanation = null;
        const planRevision = state.planRevision; save();
        const local = core.screenExplanation(body.text, module);
        const result = await reviewExplanation(body.text, module, local, store.config(), options.fetchImpl);
        state = store.state(user.id);
        if (state.planRevision !== planRevision || state.progress[module.id]?.revision !== revision) fail(409, '已有更新的讲解或计划，请查看最新结果。');
        state.progress[module.id].explanation = { ...result, text: body.text, at: stamp(), revision };
        addAttempt(state, { type: 'explanation', moduleId: module.id, revision, text: body.text, ...result }); save();
        return send({ result, state });
      }
      if (route === 'quiz') {
        const quiz = store.quiz(String(body.attemptId || ''), user.id);
        if (!quiz) fail(404, '测验已过期，请重新开始。');
        if (quiz.result) fail(409, '这次测验已提交，请开始新一轮练习。');
        if (quiz.mode !== 'diagnostic') {
          moduleFor(state, quiz.moduleId);
          if (quiz.planRevision !== state.planRevision || quiz.revision !== (progressFor(state, quiz.moduleId).revision || null)) fail(409, '讲解或计划已更新，请重新开始测验。');
        }
        checkAnswers(quiz.questions, body.answers);
        const graded = gradeWithContext(quiz.questions, body.answers);
        const result = { ...graded, passed: graded.score >= 75 };
        const at = stamp();
        if (quiz.mode === 'diagnostic') state.diagnostic = { ...result, at };
        else {
          const progress = progressFor(state, quiz.moduleId);
          progress.quiz = { ...result, at, revision: quiz.revision };
          if (progress.completedAt) {
            progress.reviewCount = (progress.reviewCount || 0) + 1;
            progress.correctStreak = result.passed ? (progress.correctStreak || 0) + 1 : 0;
            const days = reviewDelayDays(progress.correctStreak);
            progress.dueAt = new Date(Date.now() + days * DAY).toISOString();
          }
        }
        for (const item of result.items) {
          if (item.correct) continue;
          const q = questions.get(item.id);
          const old = state.wrongAnswers.find(w => w.questionId === item.id);
          if (old) { old.mistakes++; old.correctStreak = 0; old.resolved = false; old.dueAt = at; }
          else state.wrongAnswers.push({ questionId: item.id, moduleId: q.moduleId, mistakes: 1, reviewCount: 0, resolved: false, dueAt: at });
        }
        addAttempt(state, { type: 'quiz', moduleId: quiz.moduleId, mode: quiz.mode, ...result });
        store.db.exec('BEGIN');
        try { save(); store.putQuiz(quiz.id, user.id, { ...quiz, result }); store.db.exec('COMMIT'); } catch (error) { store.db.exec('ROLLBACK'); throw error; }
        return send({ result, state });
      }
      if (route === 'complete') {
        moduleFor(state, body.moduleId);
        const p = progressFor(state, body.moduleId);
        if (p.completedAt) return send({ state });
        if (!p.explanation?.accepted || !p.quiz?.passed || p.quiz.score < 75 || p.quiz.revision !== p.revision || p.explanation.revision !== p.revision) fail(409, '需要当前讲解通过且配套测验达到 75%，才能通关。');
        p.completedAt = stamp(); p.dueAt = new Date(Date.now() + DAY).toISOString();
        addAttempt(state, { type: 'complete', moduleId: body.moduleId, mode: p.explanation.mode, passed: true }); save();
        return send({ state });
      }
      if (route === 'review') {
        const wrong = state.wrongAnswers.find(w => w.questionId === body.questionId);
        const question = questions.get(body.questionId);
        if (!wrong || !question) fail(404, '错题记录不存在。');
        checkAnswers([question], { [question.id]: body.answer });
        const result = gradeWithContext([question], { [question.id]: body.answer });
        const correct = result.correct === 1;
        wrong.reviewCount++; wrong.resolved = correct;
        wrong.correctStreak = correct ? (wrong.correctStreak || 0) + 1 : 0;
        wrong.dueAt = new Date(Date.now() + reviewDelayDays(wrong.correctStreak) * DAY).toISOString();
        if (!correct) wrong.mistakes++;
        addAttempt(state, { type: 'review', moduleId: question.moduleId, ...result }); save();
        return send({ result, state });
      }
      if (route === 'ai/config') {
        limited('config:' + user.id, 20, 60000);
        let config;
        try { config = validateConfig(body, store.config()); } catch (error) { fail(400, error.message); }
        store.saveConfig(config); return send({ ai: publicConfig(config) });
      }
    }
    fail(404, '接口不存在。');
  }

  function staticFile(req, res, url) {
    if (!['GET', 'HEAD'].includes(req.method)) fail(405, '不支持此请求方式。');
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { fail(400, '地址编码不正确。'); }
    if (pathname === '/') { res.writeHead(302, { Location: '/frontend/learning-center/' }); return res.end(); }
    if (/^\/(learning-center|dashboard|chapter|knowledge-stars|canvas|playground|static|assets|data)(\/|$)/.test(pathname)) pathname = '/frontend' + pathname;
    const allowed = pathname.startsWith('/frontend/') || pathname.startsWith('/third_party/dsh-pet/dsh-pet/assets/') || pathname.startsWith('/docs/ican/');
    if (!allowed || pathname.toLowerCase() === '/frontend/data/learning-curriculum.json' || /[\\:]/.test(pathname) || pathname.split('/').some(part => part.startsWith('.') || /[. ]$/.test(part) || /^(users\.json|.*\.db|.*\.sqlite|.*token.*|.*secret.*)$/i.test(part))) fail(404, '文件不存在。');
    let filename = path.resolve(ROOT, '.' + pathname);
    if (!filename.startsWith(ROOT + path.sep)) fail(404, '文件不存在。');
    let stat;
    try {
      stat = fs.statSync(filename);
      if (stat.isDirectory()) {
        if (!url.pathname.endsWith('/')) { res.writeHead(302, { Location: url.pathname + '/' + url.search }); return res.end(); }
        filename = path.join(filename, 'index.html'); stat = fs.statSync(filename);
      }
      const realFilename = fs.realpathSync(filename);
      const answerFile = path.join(ROOT, 'frontend/data/learning-curriculum.json');
      if (!stat.isFile() || !realFilename.startsWith(ROOT + path.sep) || realFilename.toLowerCase() === answerFile.toLowerCase()) fail(404, '文件不存在。');
    } catch { fail(404, '文件不存在。'); }
    const headers = { 'Content-Type': MIME[path.extname(filename).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    let start = 0; let end = stat.size - 1; let status = 200;
    if (req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!match || (!match[1] && !match[2])) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); return res.end(); }
      if (!match[1]) start = Math.max(0, stat.size - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
      if (start > end || start >= stat.size) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); return res.end(); }
      headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`; status = 206;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || stat.size === 0) return res.end();
    const stream = fs.createReadStream(filename, { start, end });
    stream.on('error', () => res.destroy()); res.on('close', () => stream.destroy()); stream.pipe(res);
  }
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    try {
      const host = req.headers.host || '';
      if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) fail(403, '服务仅供本机使用。');
      const url = new URL(req.url, 'http://' + host);
      if (url.pathname.startsWith('/api/')) await api(req, res, url); else staticFile(req, res, url);
    } catch (error) {
      if (!res.headersSent) json(res, error.status || 500, { ok: false, error: error.status ? error.message : '服务暂时出错，请重试。' });
      else res.end();
      if (!error.status && options.onError) options.onError(error);
    }
  });
  server.on('close', () => store.close());
  return { server, store };
}

if (require.main === module) {
  const app = createApp({ onError: error => console.error('[learning-server]', error.message) });
  let port = Number(process.env.PORT) || 8787;
  app.server.on('error', error => {
    if (error.code === 'EADDRINUSE' && port < 8810) { port++; app.server.listen(port, '127.0.0.1'); }
    else { console.error(error.message); process.exitCode = 1; }
  });
  app.server.on('listening', () => console.log(`AI Master learning workspace: http://127.0.0.1:${port}/`));
  app.server.listen(port, '127.0.0.1');
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => app.server.close());
}

module.exports = { createApp, publicCatalog, shuffleQuestion };
