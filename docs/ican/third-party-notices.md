# 第三方版权与资产核查

核查日期：2026-09-05。本文记录可见许可文本和本地文件，不构成全部权利链的法律保证。

## 结论与使用边界

**dsh-pet 的代码和素材不是同一许可口径。** 本地两份 LICENSE 均为 MIT；但外层和内层 README 的“许可”节均写明：

> 代码：MIT
>
> 素材（动画/提示词/源视频）：允许开源使用，**禁止商用**

不得依据 MIT 文件宣称鲸鱼娘动画可自由商用。本轮保留鲸鱼娘原形象与全部已有动作，不删减或替换；保留资源与署名不意味着已经解决商业授权。收费服务、商业宣传等使用场景应取得覆盖该场景的书面授权。公开比赛演示是否落入许可范围，也不能在没有具体确认时承诺。

## 来源与许可证据

| 对象 | 本地证据 | 可确认事项 | 尚未确认 |
| --- | --- | --- | --- |
| AI Master 代码 | [根 LICENSE](../../LICENSE) | MIT，Copyright (c) 2026 jscjscjscjscjsc | 不自动覆盖所有引入素材 |
| dsh-pet 代码 | [外层 LICENSE](../../third_party/dsh-pet/LICENSE)、[内层 LICENSE](../../third_party/dsh-pet/dsh-pet/LICENSE) | MIT，Copyright (c) 2026 PC2005-cloud；两文件 SHA-256 相同 | 不能覆盖另行限制的素材 |
| dsh-pet 素材 | [外层 README](../../third_party/dsh-pet/README.md)、[内层 README](../../third_party/dsh-pet/dsh-pet/README.md) | 允许开源使用、禁止商用；内层 README 说明素材生成链使用豆包 | 角色原始设计、平台生成条款、源视频及嵌入内容权利链 |
| Three.js r128 | `frontend/static/vendor/three.r128.min.js` 文件头 | Copyright 2010–2021 Three.js Authors；SPDX-License-Identifier: MIT | 分发需继续保留声明与适用许可文本 |
| 字体、音频、图像、外部课件 | 原资源及引用目录 | 项目包含本地与外链资源 | 尚未完成逐文件来源与分发范围核查，不能称全部原创或无版权风险 |

上游项目：[PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)。其 README 的 [LICENSE 链接](https://github.com/PC2005-cloud/dsh-pet/blob/master/LICENSE) 指向 master 分支；本次另读取 main 分支原始 LICENSE 返回 MIT 文本。远程分支会变化，未来分发应固定版本或提交标识。

两份本地 dsh-pet LICENSE 的 SHA-256：`22757DC9C895B2729A2FC684D227CADFB54D5AF3DD300029926839E8C4E269CE`。

## 资产快照

范围：`third_party/dsh-pet/dsh-pet/assets/`，递归文件统计。字节为文件大小之和，不等于单次页面流量。

| 类型 | 文件数 | 总字节 |
| --- | ---: | ---: |
| GIF | 97 | 62,113,253 |
| WebM | 100 | 51,970,670 |
| PNG | 8 | 264,402 |
| TTF | 1 | 4,083,908 |
| JSONC | 1 | 9,130 |

外层 `third_party/dsh-pet/assets/` 另有 8 个 PNG，不计入上表。上游描述“97 个动作”；本地 WebM 为 100 个，两种口径不可混用。GIF 采用转写名称、WebM 多为中文名，未做逐动作一一对应审计，因此不把三个文件差额擅自解释为特定新增动作。前端动画根路径指向上述 `assets/webm/`。

上游“97 个动作均为 PR 手工抠像”中的 PR 是视频制作工具语境，不是 GitHub pull request，也不能由此声称角色或整段动画全部手绘原创。本项目贡献口径为资源集成与学习状态联动。

## 分发与商业化待办

1. 源码、Electron 包与其他分发物保留版权声明、许可文件和素材限制，不只在演示口头提及。
2. 固定来源版本并建立实际分发清单，逐项核对动画、字体、音频及图像来源与许可。
3. 向权利方说明比赛展示、公开仓库、宣传视频、收费服务与二次分发范围，取得明确许可。
4. 第三方课程、服务标识与外链不得用作团队原创或品牌背书证明。
5. 商业假设计入授权前提与费用；当前资产保留要求继续执行，未来变更核心形象另行决策。

## MIT 许可文本

以下适用于采用 MIT 的代码，**不将受单独限制的素材改为 MIT**。相应作品连同各自原始版权行保留：AI Master 为 `Copyright (c) 2026 jscjscjscjscjsc`；dsh-pet 为 `Copyright (c) 2026 PC2005-cloud`；Three.js 为 `Copyright 2010-2021 Three.js Authors`。

```text
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
