// AIMaster 本地记忆与问答存储（参考 dsh-memory 的长期记忆思路，轻量 JSON 实现）
const fs = require('fs');
const path = require('path');

function createMemoryStore(filePath) {
  const store = {
    filePath,
    data: null,
    load() {
      try {
        if (fs.existsSync(this.filePath)) {
          this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        }
      } catch (e) {
        console.error('[memory] 读取失败，使用空记忆', e.message);
      }
      if (!this.data || typeof this.data !== 'object') {
        this.data = { version: 1, quizResults: [], wrongCounts: {}, createdAt: new Date().toISOString() };
      }
      if (!this.data.quizResults) this.data.quizResults = [];
      if (!this.data.wrongCounts) this.data.wrongCounts = {};
      return this.data;
    },
    save() {
      this.data.updatedAt = new Date().toISOString();
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = this.filePath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmp, this.filePath);
    },
    recordQuizResult(result) {
      if (!result || typeof result !== 'object') return { ok: false, error: '参数无效' };
      this.load();
      const record = {
        timestamp: new Date().toISOString(),
        category: result.category || '全部',
        total: Number(result.total) || 0,
        correct: Number(result.correct) || 0,
        score: Number(result.score) || 0,
        wrongIds: Array.isArray(result.wrongIds) ? result.wrongIds : []
      };
      this.data.quizResults.push(record);
      // 限制只保留最近 500 次，避免文件无限膨胀
      if (this.data.quizResults.length > 500) {
        this.data.quizResults = this.data.quizResults.slice(-500);
      }
      (record.wrongIds || []).forEach((id) => {
        if (id) this.data.wrongCounts[id] = (this.data.wrongCounts[id] || 0) + 1;
      });
      this.save();
      return { ok: true, record };
    },
    getOverview() {
      this.load();
      const results = this.data.quizResults || [];
      const total = results.length;
      const avgScore = total ? Math.round(results.reduce((s, r) => s + (r.score || 0), 0) / total) : 0;
      // 按分类统计错误率
      const catStats = {};
      results.forEach((r) => {
        if (!catStats[r.category]) catStats[r.category] = { total: 0, wrong: 0 };
        catStats[r.category].total += r.total || 0;
        catStats[r.category].wrong += ((r.total || 0) - (r.correct || 0));
      });
      const weakestCategories = Object.entries(catStats)
        .map(([name, v]) => ({ name, total: v.total, wrong: v.wrong, rate: v.total ? Math.round((v.wrong / v.total) * 100) : 0 }))
        .filter((x) => x.total > 0)
        .sort((a, b) => b.rate - a.rate);
      const wrongIds = Object.entries(this.data.wrongCounts || {})
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      const recentResults = results.slice(-5).reverse();
      return {
        ok: true,
        overview: {
          totalQuiz: total,
          avgScore,
          weakestCategories,
          topWrongQuestions: wrongIds,
          recentResults
        }
      };
    },
    answerQuestion(question) {
      this.load();
      const text = String(question || '').trim();
      const overview = this.getOverview().overview;
      if (!text) {
        return { ok: true, answer: '你可以问我：\n- 我最近刷题统计怎么样？\n- 我哪些知识点比较薄弱？\n- 我该复习什么？\n- 我最近的错题有哪些？' };
      }
      const has = (kw) => text.includes(kw);
      let answer = '';
      if (has('统计') || has('成绩') || has('数据') || has('多少')) {
        answer = `你一共刷了 ${overview.totalQuiz} 次题，平均得分 ${overview.avgScore} 分。`;
        if (overview.recentResults.length) {
          const last = overview.recentResults[0];
          answer += ` 最近一次是「${last.category}」，得分 ${last.score} 分（${last.correct}/${last.total}）。`;
        }
      } else if (has('薄弱') || has('错题') || has('弱项') || has('不会')) {
        if (overview.weakestCategories.length) {
          const weak = overview.weakestCategories.slice(0, 3).map((x) => `${x.name}（错误率 ${x.rate}%）`).join('、');
          answer = `根据你的刷题记录，比较薄弱的知识点是：${weak}。`;
        } else {
          answer = '你还没有足够的刷题记录，先刷几轮题我就能帮你分析薄弱点。';
        }
        if (overview.topWrongQuestions.length) {
          answer += ` 重复出错的题目有 ${overview.topWrongQuestions.length} 道，建议优先复习。`;
        }
      } else if (has('复习') || has('建议') || has('推荐')) {
        if (overview.weakestCategories.length) {
          answer = `建议优先复习：${overview.weakestCategories.slice(0, 3).map((x) => x.name).join('、')}。`;
        } else {
          answer = '建议先从“大模型基础原理”或“提示词工程”开始刷题。';
        }
      } else if (has('最近') || has('历史')) {
        if (overview.recentResults.length) {
          answer = '最近的刷题记录：\n' + overview.recentResults.map((r) => `- ${r.timestamp.slice(0, 16).replace('T', ' ')} ${r.category}：${r.score} 分（${r.correct}/${r.total}）`).join('\n');
        } else {
          answer = '还没有刷题记录。';
        }
      } else {
        answer = '我可以帮你分析刷题统计、薄弱知识点、复习建议和最近记录。试试问我：“我哪些地方比较薄弱？”';
      }
      return { ok: true, answer };
    }
  };
  store.load();
  return store;
}

module.exports = { createMemoryStore };
