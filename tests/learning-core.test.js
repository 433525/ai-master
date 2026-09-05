const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../frontend/static/js/learning-core.js');
const catalog = require('../frontend/data/learning-curriculum.json');

const validExplanation = '大模型先把输入文本转成 token，再根据上下文预测后续片段，通过反复预测组成回答。这样的训练让它学习语言模式，但不能保证内容符合真实世界。比如我请它查询学校今年的奖学金截止日期，它可能根据旧资料生成流畅的回答，甚至编造一个日期。因此我会找到学校官方网站的最新通知，核验日期和适用年级；如果没有可靠证据，就说明目前无法确定，避免把幻觉当成已经证实的事实。';

test('seven modules have unique question IDs, valid anchors and complete sourced questions', () => {
  assert.equal(catalog.modules.length, 7);
  const ids = new Set();
  for (const module of catalog.modules) {
    assert.ok(module.questions.length >= 4);
    const [url, anchor] = module.learnUrl.split('#');
    const page = path.resolve(__dirname, '../frontend/learning-center', url);
    assert.ok(fs.readFileSync(page, 'utf8').includes(`id="${anchor}"`), module.id);
    for (const q of module.questions) {
      assert.ok(!ids.has(q.id)); ids.add(q.id);
      assert.ok(q.options.length >= 3 && q.answer >= 0 && q.answer < q.options.length);
      assert.match(q.source.url, /^https:\/\//);
      assert.ok(q.explanation.length > 15);
    }
  }
});

test('goal changes path, foundations precede dependants and experience changes route', () => {
  const beginner = core.createPlan({ goal: 'RAG 知识库', level: 'beginner', dailyMinutes: 30 }, catalog);
  const experienced = core.createPlan({ goal: 'RAG 知识库', level: 'experienced', dailyMinutes: 90 }, catalog);
  const agent = core.createPlan({ goal: 'Agent 工具调用', level: 'basic', dailyMinutes: 45 }, catalog);
  assert.equal(beginner.track, 'rag');
  assert.ok(beginner.modules.includes('transformer'));
  assert.ok(!experienced.modules.includes('transformer'));
  assert.ok(agent.modules.includes('agent-safety'));
  assert.ok(!agent.modules.includes('rag-evaluation'));
  assert.ok(beginner.estimatedDays > experienced.estimatedDays);
  for (const plan of [beginner, experienced, agent]) {
    for (const [i, id] of plan.modules.entries()) {
      for (const prerequisite of catalog.modules.find(m => m.id === id).prerequisites) assert.ok(plan.modules.indexOf(prerequisite) < i);
    }
  }
});

test('daily budget changes actual session schedule without removing prerequisites', () => {
  const slow = core.createPlan({ goal: 'RAG', level: 'basic', dailyMinutes: 30 }, catalog);
  const fast = core.createPlan({ goal: 'RAG', level: 'basic', dailyMinutes: 90 }, catalog);
  assert.deepEqual(slow.modules, fast.modules);
  assert.ok(slow.estimatedDays > fast.estimatedDays);
  assert.notDeepEqual(slow.schedule, fast.schedule);
  assert.equal(core.createPlan({ level: 'invalid', dailyMinutes: -1 }, catalog).dailyMinutes, 45);
});

test('submitted diagnostic weaknesses add foundation bridging and targeted practice time', () => {
  const profile = { goal: 'RAG', level: 'experienced', dailyMinutes: 45 };
  const noDiagnostic = core.createPlan(profile, catalog);
  const weak = core.createPlan({ ...profile, diagnostic: { score: 57, items: [
    { id: 'llm-01', correct: false }, { id: 'rag-01', correct: false }, { id: 'agent-01', correct: false }, { id: 'prompt-01', correct: true }
  ] } }, catalog);
  assert.ok(!noDiagnostic.modules.includes('transformer'));
  assert.ok(weak.modules.includes('transformer'));
  assert.ok(weak.modules.indexOf('llm-basics') < weak.modules.indexOf('transformer'));
  assert.ok(!weak.modules.includes('agent-tools'), 'unrelated weaknesses must not expand the selected goal');
  for (const id of ['llm-basics', 'rag-retrieval']) {
    const task = weak.schedule.find(s => s.moduleId === id);
    assert.equal(task.reinforcementMinutes, 20);
    assert.equal(task.minutes, noDiagnostic.schedule.find(s => s.moduleId === id).minutes + 20);
  }
  assert.equal(weak.schedule.find(s => s.moduleId === 'prompt-design').reinforcementMinutes, 0);
  assert.ok(weak.estimatedDays > noDiagnostic.estimatedDays);
  assert.match(weak.reason, /不是完整能力测量/);
});

test('diagnostic score alone or unknown questions cannot claim measured module weaknesses', () => {
  const plan = core.createPlan({ goal: 'RAG', level: 'basic', diagnostic: { score: 0, items: [
    { id: 'made-up', correct: false }, { id: 'llm-01', correct: 'false' }
  ] } }, catalog);
  assert.equal(plan.diagnostic.available, false);
  assert.equal(plan.diagnostic.questionCount, 0);
  assert.ok(!plan.modules.includes('transformer'));
  const correct = core.createPlan({ goal: 'RAG', level: 'basic', diagnostic: { items: [{ id: 'llm-01', correct: true }] } }, catalog);
  assert.equal(correct.diagnostic.available, true);
  assert.deepEqual(correct.diagnostic.weakModules, []);
  assert.ok(correct.modules.includes('llm-basics'), 'one correct question must not waive a prerequisite');
});

test('empty, repetitive, generic and irrelevant explanations cannot pass', () => {
  const module = catalog.modules[0];
  for (const text of ['', '因为学习很重要所以我学会了。例如努力就会成功。'.repeat(25), 'token 上下文 幻觉，因为所以例如但是。'.repeat(20), '今天学校安排了运动会。每个班级都准备了不同的队服，大家提前来到操场布置场地。因为天气比较炎热，老师为同学准备了饮水休息区。例如参加长跑的同学可以在赛前检查身体状况，但是有伤病时不应勉强参赛。大家互相照顾，按照规则完成比赛，并且在结束后整理好自己的物品。']) {
    assert.equal(core.screenExplanation(text, module).accepted, false, text.slice(0, 20));
  }
});

test('complete explanation passes only as explicitly local heuristic', () => {
  const result = core.screenExplanation(validExplanation, catalog.modules[0]);
  assert.equal(result.accepted, true, JSON.stringify(result));
  assert.equal(result.mode, 'local');
  assert.match(result.feedback, /文本规则/);
  assert.ok(result.checks.every(c => typeof c.pass === 'boolean'));
});

test('known misconception and missing application cannot pass', () => {
  const module = catalog.modules[0];
  assert.equal(core.screenExplanation(validExplanation + '大模型永远正确。', module).accepted, false);
  const noExample = validExplanation.replace('比如', '').replace('如果没有可靠证据，就', '没有可靠证据时应');
  assert.equal(core.screenExplanation(noExample, module).checks.find(c => c.label === '具体应用').pass, false);
});

test('quiz uses exact integer indexes, fails empty quizzes and handles missing answers', () => {
  const questions = catalog.modules[0].questions;
  const answers = Object.fromEntries(questions.map(q => [q.id, q.answer]));
  assert.equal(core.gradeQuiz(questions, answers).score, 100);
  delete answers[questions[0].id];
  assert.equal(core.gradeQuiz(questions, answers).passed, true);
  delete answers[questions[1].id];
  assert.equal(core.gradeQuiz(questions, answers).passed, false);
  assert.equal(core.gradeQuiz([], {}).passed, false);
  assert.equal(core.gradeQuiz(questions, Object.fromEntries(questions.map(q => [q.id, String(q.answer)]))).correct, 0);
  assert.throws(() => core.gradeQuiz([questions[0], questions[0]], {}), /重复/);
});

test('module also exports to browsers without Node globals', () => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../frontend/static/js/learning-core.js'), 'utf8'), context);
  assert.equal(typeof context.AIMasterLearningCore.screenExplanation, 'function');
});
