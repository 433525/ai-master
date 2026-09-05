# AI Master 学习闭环验收记录

**验收日期：** 2026-09-05  
**验收入口：** `http://127.0.0.1:8787/`  
**验收环境：** Windows 本机、Node.js 24、本地 HTTP/SQLite 服务、Microsoft Edge 无头浏览器。移动端项目使用 1440、900、390、320 宽度的视口模拟；这不等于实体 Android/iOS 真机验收。

## 验收结果

| 检查项 | 命令 | 结果 |
| --- | --- | --- |
| 学习核心逻辑与评分规则 | `npm run test:learning` | 第二轮整改后最新结果：31 项通过，0 项失败；细节见 [第二轮整改补充证据](round-two-addendum-2026-09-06.md) |
| 原有静态前端与资源 | `C:/Python314/python.exe scripts/verify_frontend_demo.py` | 28 页面、7 资源、332 内部链接、10 个星系、57 个知识节点通过 |
| 鲸鱼娘动作、设置与响应式 | `node scripts/verify-learning-browser.cjs` | 通过，原有动作 100 个均可枚举 |
| 星海进度与画布联动 | `node scripts/verify-knowledge-progress.cjs` | 通过，桌面/手机宽度、刷新同步、离线课程回退均通过 |
| 完整学习工作流 | `node scripts/verify-learning-workflow.cjs` | 通过，诊断、计划、讲解、测验、通关、错题、导出、登录恢复、隔离档案均通过 |

详细机器可读报告见：

- [browser-report.json](evidence/browser-report.json)
- [knowledge-progress-report.json](evidence/knowledge-progress-report.json)
- [workflow-report.json](evidence/workflow-report.json)

## 演示证据

- [桌面鲸鱼娘设置菜单](evidence/desktop-whale-settings.png)
- [390px 鲸鱼娘设置菜单](evidence/whale-settings-390.png)
- [桌面星海进度联动](evidence/knowledge-progress-1440.png)
- [390px 星海进度联动](evidence/knowledge-progress-390.png)
- [学习模块通关](evidence/workflow-desktop-complete.png)
- [讲解反馈](evidence/workflow-explanation-feedback.png)
- [学习记录导出入口](evidence/workflow-learning-records.png)

## 证据边界

- 工作流测试使用隔离内存服务、合成账号和合成作答，证明流程与数据契约可运行，不构成真实学生用户研究，也不能推出学习效果、准确率、留存率或营收数据。
- 未配置远程模型时，讲解反馈使用本地规则；配置模型后才会调用所配置服务商，调用失败会明确降级，不伪装为模型通过。
- 客观题使用仓库内预设标答，讲解条件与客观测验至少 75% 两个门槛同时满足才记录模块通关。
- Edge 视口模拟只验证布局与交互在指定尺寸下不溢出，不代替低端真机、触控、系统音频策略或不同浏览器的实测。
- 鲸鱼娘形象与动作沿用 `third_party/dsh-pet/dsh-pet`；上游区分代码 MIT 与素材禁止商用。当前仓库保留原形象、100 个原有动作和署名，商业化前仍需取得适用素材授权。
- 本记录是 2026-09-05 的本机原型验收，不代表公开部署、云同步、私有完整版或商用资质。
