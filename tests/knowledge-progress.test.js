const test = require('node:test');
const assert = require('node:assert/strict');
const universe = require('../frontend/data/knowledge-universe.json');
const curriculum = require('../frontend/data/learning-curriculum.json');
const { mergeProgress } = require('../frontend/static/js/knowledge-progress.js');

const completedAt = '2026-09-05T10:00:00.000Z';

test('real module completion lights only linked course nodes', () => {
  const before = JSON.stringify(universe);
  const result = mergeProgress(universe, curriculum, { progress: { 'llm-basics': { completedAt } } });
  assert.equal(result.summary.completed, 3);
  assert.equal(result.galaxies[0].progress, 50);
  assert.deepEqual(result.galaxies[0].stars.filter((star) => star.status === 'completed').map((star) => star.index), [0, 1, 2]);
  assert.equal(result.galaxies[0].stars[0].completedModules[0].id, 'llm-basics');
  assert.equal(JSON.stringify(universe), before);
});

test('quiz pass without a real completion timestamp does not light nodes', () => {
  for (const completedAt of [null, false, '', 'invalid', 123]) {
    const result = mergeProgress(universe, curriculum, { progress: { 'llm-basics': { quiz: { passed: true }, completedAt } } });
    assert.equal(result.summary.completed, 0);
  }
});

test('shared links count a node once and unknown links do not invent progress', () => {
  const catalog = { modules: [
    { id: 'a', title: 'A', nodeIds: ['chapter-1-kp-1', 'chapter-1-kp-1'] },
    { id: 'b', title: 'B', nodeIds: ['chapter-1-kp-1', 'chapter-999-kp-1'] },
  ] };
  const result = mergeProgress(universe, catalog, { progress: { a: { completedAt }, b: { completedAt } } });
  assert.equal(result.summary.completed, 1);
  assert.equal(result.galaxies[0].stars[0].completedModules.length, 2);
  assert.equal(result.summary.stars, universe.summary.stars);
});

test('cleared progress removes stale completed flags without locking course content', () => {
  const completed = mergeProgress(universe, curriculum, { progress: { 'llm-basics': { completedAt } } });
  const reset = mergeProgress(completed, curriculum, { progress: {} });
  assert.equal(reset.summary.completed, 0);
  assert.equal(reset.galaxies[0].stars[0].status, 'available');
});

test('every catalog link points to a real course node', () => {
  const nodes = new Set(universe.galaxies.flatMap((galaxy) => galaxy.stars.map((star) => `chapter-${star.chapter}-kp-${star.index + 1}`)));
  for (const module of curriculum.modules) {
    for (const node of module.nodeIds) assert.ok(nodes.has(node), `${module.id}: ${node}`);
  }
});
