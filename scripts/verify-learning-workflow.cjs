const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { chromium } = require('playwright');
const { createApp } = require('../server');
const catalog = require('../frontend/data/learning-curriculum.json');

const output = path.resolve('.local/browser-evidence');
const explanation = '大模型先把输入文本转成 token，再根据上下文预测后续片段，通过反复预测组成回答。这样的训练让它学习语言模式，但不能保证内容符合真实世界。比如我请它查询学校今年的奖学金截止日期，它可能根据旧资料生成流畅的回答，甚至编造一个日期。因此我会找到学校官方网站的最新通知，核验日期和适用年级；如果没有可靠证据，就说明目前无法确定，避免把幻觉当成已经证实的事实。';
fs.mkdirSync(output, { recursive: true });

async function submit(page, selector, route) {
  const response = page.waitForResponse(r => r.url().endsWith('/api/' + route) && r.request().method() === 'POST');
  await page.locator(selector).click();
  const result = await response;
  assert.equal(result.status(), 200, route);
  return result.json();
}

async function answerQuiz(page, form, quiz, wrongCount = 0) {
  for (const [i, question] of quiz.questions.entries()) {
    const original = catalog.modules.flatMap(m => m.questions).find(q => q.id === question.id);
    const correct = question.options.indexOf(original.options[original.answer]);
    const selected = i < wrongCount ? (correct + 1) % question.options.length : correct;
    await page.locator(form + ' input[name="q:' + question.id + '"][value="' + selected + '"]').check();
  }
}

(async () => {
  const app = createApp({ dbPath: ':memory:' });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const base = 'http://127.0.0.1:' + app.server.address().port;
  const browser = await chromium.launch({ executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const report = { date: new Date().toISOString(), environment: 'Windows Microsoft Edge; isolated in-memory service; synthetic test answers; no human study', checks: [], errors: [] };
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(base);
    await page.waitForSelector('#plan-form');
    const diagnosisResponse = page.waitForResponse(r => r.url().includes('/api/quiz?mode=diagnostic'));
    await page.locator('[data-action="diagnostic"]').click();
    const diagnostic = (await (await diagnosisResponse).json()).quiz;
    await answerQuiz(page, '#diagnostic-form', diagnostic, 2);
    const diagnosed = await submit(page, '#diagnostic-form button[type="submit"]', 'quiz');
    assert.equal(diagnosed.result.correct, 5);
    await page.locator('[data-action="diagnostic-done"]').click();
    await page.locator('#plan-dialog-form input[name="goal"]').fill('RAG 知识库');
    await page.locator('#plan-dialog-form select[name="level"]').selectOption('basic');
    await page.locator('#plan-dialog-form select[name="dailyMinutes"]').selectOption('45');
    const planned = await submit(page, '#plan-dialog-form button[type="submit"]', 'plan');
    assert.equal(planned.state.plan.track, 'rag');
    assert(planned.state.plan.schedule.some(s => s.reinforcementMinutes > 0));
    await page.waitForSelector('[data-stage="explain"]');
    await page.screenshot({ path: path.join(output, 'workflow-desktop-study.png'), fullPage: true });
    report.checks.push({ name: 'diagnostic-to-personal-plan', correct: diagnosed.result.correct, track: planned.state.plan.track, days: planned.state.plan.estimatedDays });

    await page.locator('button[role="tab"][data-stage="explain"]').click();
    await page.locator('#explanation-text').fill('因为'.repeat(180));
    const rejected = await submit(page, '#explanation-form button[type="submit"]', 'explanation');
    assert.equal(rejected.result.accepted, false);
    await page.locator('.feedback-title').waitFor();
    assert.match(await page.locator('.feedback-title').textContent(), /再完善/);
    await page.locator('#explanation-text').fill(explanation);
    const accepted = await submit(page, '#explanation-form button[type="submit"]', 'explanation');
    assert.equal(accepted.result.accepted, true);
    await page.waitForFunction(() => document.querySelector('.feedback-title')?.textContent.includes('已通过'));
    await page.screenshot({ path: path.join(output, 'workflow-explanation-feedback.png'), fullPage: true });
    report.checks.push({ name: 'repetition-rejected-and-own-explanation-accepted', mode: accepted.result.mode });

    await page.locator('button[role="tab"][data-stage="quiz"]').click();
    assert.equal(await page.locator('[data-action="complete"]').isDisabled(), true);
    const quizResponse = page.waitForResponse(r => r.url().includes('/api/quiz?module='));
    await page.locator('[data-action="start-quiz"]').click();
    const quiz = (await (await quizResponse).json()).quiz;
    await answerQuiz(page, '#quiz-form', quiz, 1);
    const tested = await submit(page, '#quiz-form button[type="submit"]', 'quiz');
    assert.equal(tested.result.score, 75);
    assert.equal(tested.result.passed, true);
    await page.waitForFunction(() => !document.querySelector('[data-action="complete"]')?.disabled);
    const completed = await submit(page, '[data-action="complete"]', 'complete');
    assert(completed.state.progress['llm-basics'].completedAt);
    await page.waitForSelector('.completion-summary');
    await page.screenshot({ path: path.join(output, 'workflow-desktop-complete.png'), fullPage: true });
    assert.equal(await page.locator('.route-item[data-module="prompt-design"]').isDisabled(), false);
    report.checks.push({ name: 'dual-gate-completion-and-next-module-unlock', score: tested.result.score });

    const stars = await context.newPage();
    stars.on('pageerror', error => report.errors.push(error.message));
    await stars.goto(base + '/frontend/knowledge-stars/');
    await stars.waitForFunction(() => document.querySelector('#completedCount')?.textContent === '3');
    await stars.screenshot({ path: path.join(output, 'workflow-real-linked-stars.png') });
    report.checks.push({ name: 'real-completion-linked-to-three-course-nodes', count: 3 });
    await stars.close();

    await page.locator('[data-view="review"]').click();
    await page.waitForSelector('[data-review-form]');
    const reviewForm = page.locator('[data-review-form]').first();
    const questionId = await reviewForm.getAttribute('data-review-form');
    const original = catalog.modules.flatMap(m => m.questions).find(q => q.id === questionId);
    await reviewForm.locator('input[value="' + original.answer + '"]').check();
    const reviewed = await submit(page, '[data-review-form="' + questionId + '"] button[type="submit"]', 'review');
    assert.equal(reviewed.result.correct, 1);
    await page.waitForFunction(() => document.querySelector('[data-review-form] .notice')?.textContent.includes('回答正确'));
    report.checks.push({ name: 'wrong-answer-review-and-explanation', questionId });

    await page.locator('[data-view="records"]').click();
    await page.waitForSelector('.record-table');
    const jsonDownload = page.waitForEvent('download');
    await page.locator('a[href="/api/export"]').click();
    const jsonPath = path.join(output, 'synthetic-learning-record.json');
    await (await jsonDownload).saveAs(jsonPath);
    const exported = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    assert(exported.state.progress['llm-basics'].completedAt);
    assert(exported.state.attempts.some(a => a.type === 'review'));
    const csvDownload = page.waitForEvent('download');
    await page.locator('a[href="/api/export?format=csv"]').click();
    const csvPath = path.join(output, 'synthetic-learning-record.csv');
    await (await csvDownload).saveAs(csvPath);
    assert.match(fs.readFileSync(csvPath, 'utf8'), /complete/);
    report.checks.push({ name: 'json-and-csv-downloads-contain-actual-test-attempts', attempts: exported.state.attempts.length });
    await page.screenshot({ path: path.join(output, 'workflow-learning-records.png'), fullPage: true });

    await page.reload();
    await page.waitForSelector('.route-item.done');
    await page.locator('[data-action="account"]').click();
    await page.locator('[data-auth-mode="register"]').click();
    await page.locator('#account-form input[name="name"]').fill('自动验收同学');
    await page.locator('#account-form input[name="password"]').fill('synthetic-test-only-123');
    const registered = await submit(page, '#account-form button[type="submit"]', 'auth/register');
    assert(registered.state.progress['llm-basics'].completedAt);
    await page.waitForFunction(() => !document.querySelector('dialog').open);
    await page.locator('[data-action="account"]').click();
    await submit(page, '[data-action="logout"]', 'auth/logout');
    await page.waitForSelector('#plan-form');
    await page.locator('[data-action="account"]').click();
    await page.locator('[data-auth-mode="login"]').click();
    await page.locator('#account-form input[name="name"]').fill('自动验收同学');
    await page.locator('#account-form input[name="password"]').fill('synthetic-test-only-123');
    const loggedIn = await submit(page, '#account-form button[type="submit"]', 'auth/login');
    assert(loggedIn.state.progress['llm-basics'].completedAt);
    await page.waitForSelector('.route-item.done');
    report.checks.push({ name: 'reload-registration-inherits-guest-logout-login-restores-records' });

    await page.locator('.route-item[data-module="llm-basics"]').click();
    for (const width of [900, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No overflow at ' + width);
      await page.screenshot({ path: path.join(output, 'workflow-study-' + width + '.png'), fullPage: true });
    }
    report.checks.push({ name: 'real-study-responsive-900-390-320' });
    const fresh = await browser.newContext();
    const other = await fresh.newPage();
    await other.goto(base);
    await other.waitForSelector('#plan-form');
    report.checks.push({ name: 'separate-browser-session-has-no-other-user-records' });
    await fresh.close();
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (error) {
    report.passed = false; report.failure = error.stack; process.exitCode = 1;
  } finally {
    await browser.close();
    await new Promise(resolve => app.server.close(resolve));
    fs.writeFileSync(path.join(output, 'workflow-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }
})();
