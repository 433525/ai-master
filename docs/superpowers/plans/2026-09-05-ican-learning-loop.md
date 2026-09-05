# AI Master Learning Loop Implementation Plan

> 使用 subagent-driven-development 分工实施，主代理负责后端、整合和最终浏览器验收。用户已授权自主实施，不设置等待确认环节。

**Goal:** 两小时内交付保留鲸鱼娘的可运行学习闭环和可追溯证据。

**Architecture:** 原生前端 + 共享纯函数评分模块 + Node 24 HTTP/SQLite 本地后端。课程与动画沿用仓库资源。

**Tech Stack:** HTML/CSS/JS, Node.js 24, node:sqlite, node:test, Playwright。

**Spec:** ../specs/2026-09-05-ican-learning-loop-design.md

## 工作项

- [x] 1. 课程与评分：`frontend/data/learning-curriculum.json`、`frontend/static/js/learning-core.js`、`tests/learning-core.test.js`。内容有来源、反刷分、路径与客观题纯函数测试。
- [x] 2. 学习工作台：`frontend/learning-center/index.html`、`frontend/static/css/learning-workspace.css`、`frontend/static/js/learning-workspace.js`。适配桌面与手机，诊断/计划/学习/讲解/测验/错题/报告，保留鲸鱼娘。
- [x] 3. 本地服务：`server/`、`scripts/start-learning.*`、`tests/learning-server.test.js`。SQLite 档案、同源接口、模型结构化复评、闸门与记录导出。
- [x] 4. 证据与答辩：`docs/ican/`、README 与项目说明校正、素材许可说明、57 节点教学标注。外部事实查证，禁止虚构实验。
- [x] 5. 集成与验收：浏览器完整流程、手机布局、刷新/重新登录、评分故障、资源与鲸鱼娘动作，保存截图与测试报告。

## API 合同

所有 API 在 `/api/`，JSON 包装 `{ok:true,...}`，失败 `{ok:false,error}`，浏览器同源 Cookie。`GET status` 返回 `{mode:'server',ai:{configured,model}}`。`GET catalog` 返回 `{version,modules}`，模块不含题目答案。`GET state` 返回 `{state,user}`。

`state={profile,plan,progress,attempts,wrongAnswers,diagnostic}`；`plan={title,track,modules:[moduleId],dailyMinutes,level,reason}`；`progress[id]={explanation,quiz,completedAt,dueAt,reviewCount}`。`user={id,name,isGuest}`。

`POST plan` 接收 `{goal,level:'beginner'|'basic'|'experienced',dailyMinutes:30|45|60|90,deadline?}`，返回 `{state}`。

`POST explanation` 接收 `{moduleId,text}`，返回 `{result,state}`；结果 `{eligible,score,checks:[{label,pass,detail}],feedback,followUp,flags,mode:'local'|'ai'|'fallback',accepted}`。

`GET quiz?module=ID` 或 `GET quiz?mode=diagnostic` 返回 `{quiz:{id,moduleId,mode,questions:[{id,prompt,options,source}]}}`。`POST quiz` 接收 `{attemptId,answers:{questionId:选项索引}}`，返回 `{result,state}`；结果 `{correct,total,score,passed,items:[{id,correct,selected,answer,explanation}]}`。

`POST complete {moduleId}` 返回 `{state}`，服务端检查讲解 accepted 和 quiz passed。

`GET review` 返回 `{items}`；`POST review {questionId,answer}` 返回 `{result,state}`。`GET export` 下载当前档案 JSON；`GET export?format=csv` 下载测验记录 CSV。

`POST auth/register {name,password}`、`POST auth/login {name,password}`、`POST auth/logout {}` 均返回 `{user,state}`。`POST ai/config {baseUrl,model,apiKey}` 返回公开配置，无密钥回显。设置只供本机原型使用。

## 共享模块合同

UMD 暴露 `window.AIMasterLearningCore` / `module.exports`。
`createPlan(profile,catalog)` 返回上述 plan；`screenExplanation(text,module)` 返回本地讲解结果；`gradeQuiz(questions,answers)` 返回上述判题结果。
课程 `{version,modules:[{id,title,chapter,nodeIds,objective,bloom,prerequisites,learnUrl,summary,prompt,concepts:[{id,label,terms}],questions:[{id,prompt,options,answer,explanation,source:{title,url}}]}]}`。`learnUrl` 相对于 `/frontend/learning-center/`，模块 ID 使用 `llm-basics,prompt-design,transformer,rag-retrieval,rag-evaluation,agent-tools,agent-safety`；可增加必要模块。

## 进度记录

2026-09-05: 已核查仓库，保护既有 `electron/_e2e-history.js`。在当前目录新建功能分支，方便用户直接查看成果。

2026-09-05 验收记录：

- `npm run test:learning`：28 项测试通过。
- `C:/Python314/python.exe scripts/verify_frontend_demo.py`：28 个页面、7 个资源、332 个内部链接、10 个星系、57 个知识节点通过。
- `node scripts/verify-learning-browser.cjs`：鲸鱼娘原有 100 个动作可用，桌面/移动视口与设置交互通过。
- `node scripts/verify-knowledge-progress.cjs`：桌面/移动画布联动、刷新同步、离线课程回退通过。
- `node scripts/verify-learning-workflow.cjs`：诊断、计划、讲解、双门槛测验、错题复习、导出、注册/登录恢复、隔离档案和响应式流程通过。
- 证据归档于 `docs/ican/evidence/`，汇总见 [验收报告](../../ican/acceptance-report-2026-09-05.md)。

验收边界：流程证据使用隔离本机服务、合成账号和合成作答，不代表真实用户研究或学习效果；移动端为 Edge 视口模拟；未配置远程模型时使用本地规则；鲸鱼娘素材当前保留原形象与动作，但素材禁止商用，商业化前需另行取得授权。
