# 项目开发日志（Development Log）

本目录用于**按时间线完整、真实记录 AIMaster 项目开发全流程**，包括：

- 方案设计
- 实验测试
- 问题排查与解决
- 版本迭代
- 团队分工

## 目录结构

```
devlog/
├── README.md                # 本说明
├── team.json                # 团队成员信息（用于识别美国成员并提醒）
├── timeline.md              # 自动生成的时间线摘要
├── entries/                 # 每个成员/每次提交自动生成的开发日志
├── reminders/               # 自动生成的“请补充开发日志”提醒
├── templates/               # 会议纪要/实验数据模板
└── evidence/                # 佐证材料
    ├── screenshots/         # 截图
    ├── experiments/         # 实验数据 / 测试结果
    └── meetings/            # 会议纪要
```

## 自动生成机制

每次提交后，Git hook 会自动执行：

```bash
python scripts/auto_dev_log.py
```

它会：

1. 读取本次提交的作者、时间、说明、涉及文件；
2. 在 `devlog/entries/` 下按日期生成/追加开发日志；
3. 更新 `devlog/timeline.md` 时间线；
4. 如果是 `team.json` 中标记为 `US` 的成员提交，且还没有补充详细日志，会自动在 `devlog/reminders/` 生成提醒。

## 安装 Git Hook（每个成员 clone 后执行一次）

```bash
python scripts/install_devlog_hooks.py
```

或手动执行：

```bash
git config core.hooksPath .githooks
```

## 生成 PDF 时间线报告

```bash
python scripts/build_project_timeline_pdf.py
```

输出文件：

```text
devlog/AIMaster_开发全流程时间线.pdf
```

要求：PDF 格式、大小不超过 50MB。

## 自动收录佐证材料（GitHub Actions）

每次 push 到远程仓库时，GitHub Actions 会自动：

1. 启动本地预览服务
2. 使用 Playwright 自动捕获界面截图（首页 / 沉浸刷题 / 历史对话 / 学习中心）
3. 扫描仓库中的 `artifacts/`、`test-results/`、`screenshots/` 等目录
4. 将截图、实验数据、压测结果、性能数据、CSV/JSON 等复制到 `devlog/evidence/`
5. 更新 `devlog/evidence/manifest.json` 和 `devlog/timeline.md`
6. 自动提交并推送回仓库

也可以手动运行：

```bash
python scripts/capture_screenshots.py --base-url http://127.0.0.1:8765 --out devlog/evidence/screenshots/auto
python scripts/collect_evidence.py
```

## 成员操作规范

- 每次改进/提交后，如自动日志不够详细，请手动补充到对应 `entries/` 文件；
- 手动补充完成后，在日志文件末尾加上 `<!-- 已人工补充 -->`，系统将不再重复提醒；
- 截图放入 `evidence/screenshots/`；
- 实验数据放入 `evidence/experiments/`；
- 会议纪要放入 `evidence/meetings/`；
- 美国成员收到提醒后，请及时补充日志与佐证材料。
