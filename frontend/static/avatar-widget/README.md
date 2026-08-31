# 🐋 AI Master 虚拟形象助手（Avatar Widget）

浮动在所有页面右下角的虚拟形象助手，参考 [MeteorNOX/DeepSeek-Balance-Whale-Widget](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget)（MIT License）的交互设计实现。

## 功能

- 🐋 **浮动形象**：默认小鲸鱼，可拖拽，四边四分之一吸附，按压 Q 弹；带待机浮动动画，并会随机跳跃/挥手/旋转/弹跳
- 🎨 **当前形象**：仅保留“鲸鱼娘”作为默认/唯一虚拟形象
- 📖 **学习状态监控**：自动识别当前页面（章节 / 学习中心 / 知识星图 / 实验场 / 仪表盘等），统计今日学习时长、页面访问次数、章节足迹
- ⏱️ **屏幕使用时间**：统计今日屏幕使用总时长（仅页面可见时累计），每天自动重置并归档历史
- 💬 **气泡台词**：点击鲸鱼随机切换台词（学习统计 / 卖萌吐槽 / rua 动图），5 秒自动收起
- 📊 **今日总结与下一步建议**：根据今日学习时长、连续学习时长、章节足迹生成可执行建议
- 💤 **休息提醒**：连续学习达到设定间隔后弹出休息提醒，提醒间隔可配置
- 🏆 **成就系统**：学习时长、章节探索、休息习惯、连续学习、自定义形象等成就，解锁后气泡提示
- 🎯 **每日目标**：可设置每日学习目标，菜单内显示目标进度
- ⚙️ **汉堡菜单**（悬停鲸鱼右上角 ⚙️ 出现）：学习总结、大小调节、音效开关与音量、气泡开关、休息提醒、每日目标、今日数据、重置位置 / 清零统计

## 目录结构

```text
frontend/static/avatar-widget/
├── avatar-widget.css      # 挂件样式
├── avatar-widget.js       # 挂件主逻辑（纯前端，无依赖）
├── assets/                # 素材（图片 / 音效 / 动图）
└── README.md              # 本文件
```

## 数据存储

- 设置与自定义形象：localStorage（`aimaster_avatar_settings` / `aimaster_avatar_customs`）
- 今日统计：localStorage（`aimaster_avatar_stats`，跨天自动归零，昨日归档到 `aimaster_avatar_stats_YYYY-MM-DD`）
- 历史归档：localStorage（`aimaster_avatar_history`，用于连续学习天数统计）
- 成就：localStorage（`aimaster_avatar_achievements`）

## 如何在新页面启用

在 HTML 的 `</body>` 前加入（相对路径视页面层级而定）：

```html
<link rel="stylesheet" href="<相对路径>/avatar-widget.css" />
<script src="<相对路径>/avatar-widget.js" defer></script>
```

## 修改学习页判定

页面是否计入「学习时间」由 `avatar-widget.js` 中 `isStudyPage()` 与 `studyLabel()` 控制（基于页面相对项目根目录的路径匹配），可按需增删。
