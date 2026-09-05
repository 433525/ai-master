(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AIMasterLearningCore = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function createPlan(profile, catalog) {
    profile = profile || {};
    var modules = Array.isArray(catalog) ? catalog : (catalog && catalog.modules) || [];
    var available = new Map(modules.map(function (item) { return [item.id, item]; }));
    var level = ['beginner', 'basic', 'experienced'].includes(profile.level) ? profile.level : 'beginner';
    var dailyMinutes = [30, 45, 60, 90].includes(Number(profile.dailyMinutes)) ? Number(profile.dailyMinutes) : 45;
    var goal = String(profile.goal || '').trim().slice(0, 300);
    var track = /agent|智能体|工具调用/i.test(goal) ? 'agent' : /rag|检索|知识库/i.test(goal) ? 'rag' : 'general';
    var diagnosticItems = profile.diagnostic && Array.isArray(profile.diagnostic.items) ? profile.diagnostic.items : [];
    var questionModules = new Map();
    modules.forEach(function (item) { (item.questions || []).forEach(function (question) { questionModules.set(question.id, item.id); }); });
    var diagnosticSeen = new Set(), weakModules = new Set();
    diagnosticItems.forEach(function (item) {
      if (!item || !questionModules.has(item.id) || typeof item.correct !== 'boolean' || diagnosticSeen.has(item.id)) return;
      diagnosticSeen.add(item.id);
      if (!item.correct) weakModules.add(questionModules.get(item.id));
    });
    var ids = ['llm-basics', 'prompt-design'];
    var needsFoundationBridge = weakModules.has('llm-basics') || weakModules.has('transformer');
    if (level === 'beginner' || track === 'general' || needsFoundationBridge) ids.push('transformer');
    if (track !== 'agent') ids.push('rag-retrieval', 'rag-evaluation');
    if (track !== 'rag') ids.push('agent-tools', 'agent-safety');
    // Resolve prerequisites before assigning sessions so a shorter route keeps its foundations.
    var route = [], visiting = new Set(), visited = new Set();
    function add(id) {
      if (visited.has(id) || !available.has(id)) return;
      if (visiting.has(id)) throw new Error('课程先修关系存在循环：' + id);
      visiting.add(id);
      (available.get(id).prerequisites || []).forEach(add);
      visiting.delete(id);
      visited.add(id);
      route.push(id);
    }
    ids.forEach(add);
    var multiplier = { beginner: 1.25, basic: 1, experienced: 0.75 }[level];
    var elapsed = 0;
    var schedule = route.map(function (id) {
      var reinforcementMinutes = weakModules.has(id) ? 20 : 0;
      var minutes = Math.ceil((available.get(id).estimatedMinutes || 45) * multiplier / 5) * 5 + reinforcementMinutes;
      var startDay = Math.floor(elapsed / dailyMinutes) + 1;
      elapsed += minutes;
      return { moduleId: id, minutes: minutes, startDay: startDay, endDay: Math.ceil(elapsed / dailyMinutes), reinforcementMinutes: reinforcementMinutes };
    });
    var days = Math.ceil(elapsed / dailyMinutes);
    var title = { rag: 'RAG 知识库入门', agent: 'Agent 工具调用入门', general: 'AI 核心能力入门' }[track];
    var reason = '根据' + { beginner: '零基础', basic: '有基础', experienced: '有实践经验' }[level] + '、' + title + '目标安排 ' + route.length + ' 个模块；每天 ' + dailyMinutes + ' 分钟，预计 ' + days + ' 天。';
    if (level === 'beginner') reason += '增加 Transformer 基础桥接，并留出更多练习时间。';
    else if (needsFoundationBridge && track !== 'general') reason += '基础诊断出现错误，加入 Transformer 桥接补习。';
    else if (track !== 'general') reason += '保留必需基础，省略与本次目标关系较弱的架构拓展。';
    if (diagnosticSeen.size) {
      var reinforced = route.filter(function (id) { return weakModules.has(id); });
      reason += reinforced.length ? '根据已提交诊断，为路线内 ' + reinforced.length + ' 个薄弱模块各增加 20 分钟练习。' : '已参考诊断结果，当前路线未发现需要加时的错题模块。';
      reason += '少量诊断题只能提供补习线索，不是完整能力测量。';
    }
    reason += '这是教学规则生成的建议，实际进度以通关记录为准。';
    return { title: title, track: track, modules: route, dailyMinutes: dailyMinutes, level: level, reason: reason, schedule: schedule, estimatedDays: days, estimatedMinutes: elapsed,
      diagnostic: { available: diagnosticSeen.size > 0, questionCount: diagnosticSeen.size, weakModules: Array.from(weakModules) } };
  }

  function screenExplanation(text, module) {
    if (!module || !Array.isArray(module.concepts) || !module.concepts.length) throw new Error('缺少模块讲解标准');
    text = typeof text === 'string' ? text.trim() : '';
    var normalized = text.toLowerCase().replace(/\s+/g, '');
    var plain = normalized.replace(/[^a-z0-9\u3400-\u9fff]/g, '');
    var sentences = text.split(/[。！？.!?\n；;]/).map(function (item) { return item.trim().replace(/\s+/g, '').toLowerCase(); }).filter(function (item) { return item.length > 5; });
    var uniqueSentences = new Set(sentences);
    var grams = [];
    for (var i = 0; i <= plain.length - 8; i += 2) grams.push(plain.slice(i, i + 8));
    var uniqueRatio = grams.length ? new Set(grams).size / grams.length : 0;
    var repetitive = (sentences.length >= 3 && uniqueSentences.size / sentences.length < 0.65) || (grams.length >= 30 && uniqueRatio < 0.55) || /(.)\1{11,}/.test(plain);
    var coverage = module.concepts.map(function (concept) {
      var hit = concept.terms.some(function (term) {
        term = String(term).toLowerCase().replace(/\s+/g, '');
        // Latin abbreviations must be words, so "rag" does not match "fragment".
        if (/^[a-z]+$/.test(term)) return new RegExp('(^|[^a-z])' + term + '([^a-z]|$)', 'i').test(normalized);
        return normalized.includes(term);
      });
      return { label: concept.label, hit: hit };
    });
    var covered = coverage.filter(function (item) { return item.hit; }).length;
    var required = Math.min(3, module.concepts.length);
    var mechanism = /因为|因此|所以|通过|先.{2,80}(再|然后)|使得|导致|从而|依赖|根据/.test(text);
    var example = /例如|比如|举例|假设|场景|以.{2,30}为例|如果.{3,80}(就|则|会)/.test(text);
    var boundary = /但是|然而|不过|不能|不保证|并不|不等于|局限|风险|失败|不足|需要.{1,30}(核验|验证|确认|检查)|不应/.test(text);
    var contradictions = (module.misconceptions || []).filter(function (item) { return new RegExp(item.pattern, 'i').test(normalized); });
    var flags = [];
    if (!plain.length) flags.push('empty');
    if (text.length > 6000) flags.push('too_long');
    if (repetitive) flags.push('repetition');
    if (covered < required) flags.push('missing_concepts');
    if (contradictions.length) flags.push('known_misconception');
    var checks = [
      { label: '有效内容', pass: plain.length >= 100 && text.length <= 6000, detail: plain.length >= 100 ? (text.length <= 6000 ? '已提供足够展开的内容。' : '请将讲解缩短至 6000 字以内。') : '请用自己的话展开到至少 100 个有效字符，覆盖机制、例子与限制。' },
      { label: '非重复表达', pass: !repetitive, detail: repetitive ? '检测到较多重复句子或重复片段，请删除凑字数的内容。' : '未检测到明显重复填充；本项不检测抄袭。' },
      { label: '关键概念', pass: covered >= required, detail: coverage.map(function (item) { return (item.hit ? '已提及：' : '待补充：') + item.label; }).join('；') },
      { label: '机制与因果', pass: mechanism, detail: mechanism ? '包含机制或因果表达，仍需检查解释是否正确。' : '补充它如何工作，以及前后步骤为什么相连。' },
      { label: '具体应用', pass: example, detail: example ? '包含举例或场景表达，仍需检查例子是否恰当。' : '用一个具体任务说明输入、处理和预期结果。' },
      { label: '适用边界', pass: boundary, detail: boundary ? '包含限制或风险表达。' : '说明一个不能保证的结果、失败情形或核验要求。' },
      { label: '常见误区', pass: contradictions.length === 0, detail: contradictions.length ? contradictions.map(function (item) { return item.feedback; }).join('；') : '未命中已列出的常见错误表述；不代表不存在事实错误。' }
    ];
    var eligible = checks.every(function (check) { return check.pass; });
    var missing = checks.filter(function (check) { return !check.pass; });
    return {
      eligible: eligible, accepted: eligible, checks: checks, flags: flags, mode: 'local',
      feedback: eligible ? '讲解通过本地完整性筛查，请继续客观题验收。该结果基于文本规则，不代表 AI 语义评估或已证明掌握。' : missing.map(function (check) { return check.detail; }).join('\n'),
      followUp: eligible ? (module.followUp || '改变例子中的一个条件，这个方法何时会失效？') : (missing[0] ? missing[0].detail : module.prompt)
    };
  }

  function gradeQuiz(questions, answers) {
    if (!Array.isArray(questions)) throw new Error('题目必须为数组');
    answers = answers && typeof answers === 'object' ? answers : {};
    var seen = new Set();
    var items = questions.map(function (question) {
      if (!question || typeof question.id !== 'string' || seen.has(question.id) || !Array.isArray(question.options) || !Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length) throw new Error('无效题目或重复题目 ID');
      seen.add(question.id);
      var submitted = Object.prototype.hasOwnProperty.call(answers, question.id) ? answers[question.id] : null;
      var selected = Number.isInteger(submitted) && submitted >= 0 && submitted < question.options.length ? submitted : null;
      return { id: question.id, correct: selected === question.answer, selected: selected, answer: question.answer, explanation: question.explanation || '' };
    });
    var correct = items.filter(function (item) { return item.correct; }).length;
    var total = items.length;
    return { correct: correct, total: total, score: total ? Math.round(correct / total * 100) : 0, passed: total > 0 && correct / total >= 0.75, items: items };
  }

  return { createPlan: createPlan, screenExplanation: screenExplanation, gradeQuiz: gradeQuiz };
}));
