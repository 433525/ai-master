(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AIMasterKnowledgeProgress = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function mergeProgress(universe, catalog, state) {
    const linked = new Map();
    for (const module of catalog.modules || []) {
      const completedAt = state.progress?.[module.id]?.completedAt;
      const completed = typeof completedAt === 'string' && Number.isFinite(Date.parse(completedAt));
      for (const nodeId of new Set(module.nodeIds || [])) {
        if (!linked.has(nodeId)) linked.set(nodeId, []);
        linked.get(nodeId).push({ id: module.id, title: module.title, completed });
      }
    }
    let completedCount = 0;
    let starCount = 0;
    const galaxies = universe.galaxies.map((galaxy) => {
      let galaxyCompleted = 0;
      const stars = galaxy.stars.map((star) => {
        const nodeId = `chapter-${star.chapter}-kp-${star.index + 1}`;
        const linkedModules = linked.get(nodeId) || [];
        const completedModules = linkedModules.filter((module) => module.completed);
        const completed = completedModules.length > 0;
        if (completed) galaxyCompleted += 1;
        return {
          ...star, linkedModules, completedModules,
          status: completed ? 'completed' : star.status === 'completed' ? 'available' : star.status,
        };
      });
      completedCount += galaxyCompleted;
      starCount += stars.length;
      return { ...galaxy, stars, progress: stars.length ? Math.round(galaxyCompleted / stars.length * 100) : 0 };
    });
    return {
      ...universe, galaxies, progressSource: 'local-profile',
      summary: { ...universe.summary, galaxies: galaxies.length, stars: starCount, completed: completedCount },
    };
  }

  return { mergeProgress };
});
