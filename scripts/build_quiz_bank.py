#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 AIMaster 沉浸刷题题库（含官方权威出处标注）。"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "data" / "quiz_bank.json"

SOURCES = {
    "google-mlcc": {
        "name": "Google Machine Learning Crash Course",
        "url": "https://developers.google.com/machine-learning/crash-course/exercises",
    },
    "microsoft-ai900": {
        "name": "Microsoft Learn: AI-900 Study Guide",
        "url": "https://learn.microsoft.com/credentials/certifications/resources/study-guides/ai-900",
    },
    "ai4k12": {
        "name": "AI4K12: Five Big Ideas in AI",
        "url": "https://ai4k12.org/",
    },
    "stanford-cs221": {
        "name": "Stanford CS221: Artificial Intelligence",
        "url": "https://stanford-cs221.github.io/",
    },
    "deeplearning-ai": {
        "name": "DeepLearning.AI",
        "url": "https://www.deeplearning.ai/courses/",
    },
    "openai": {
        "name": "OpenAI",
        "url": "https://openai.com/",
    },
    "alibaba-cloud": {
        "name": "阿里云大模型 ACP 认证",
        "url": "https://www.aliyun.com/",
    },
    "anthropic": {
        "name": "Anthropic Claude Documentation",
        "url": "https://docs.anthropic.com/",
    },
}

CATEGORIES = [
    "AI 基础与伦理",
    "机器学习与深度学习",
    "大模型基础原理",
    "Transformer 架构",
    "提示词工程",
    "LLM 框架与 Agent",
    "RAG 技术",
    "Claude Code",
    "大模型应用与部署",
]

QUESTIONS = []

# ---------- AI 基础与伦理 ----------
QUESTIONS += [
    {
        "id": "ai-001",
        "category": "AI 基础与伦理",
        "difficulty": 1,
        "question": "下列哪一项属于人工智能的典型应用？",
        "options": ["语音识别", "电子表格", "文本编辑器", "操作系统"],
        "answer": 0,
        "explanation": "语音识别是人工智能的典型应用之一，让机器理解并处理人类语音。",
        "source": "ai4k12",
    },
    {
        "id": "ai-002",
        "category": "AI 基础与伦理",
        "difficulty": 1,
        "question": "“图灵测试”主要用于测试什么？",
        "options": ["机器是否能思考", "机器是否能学习", "机器是否能被人类分辨", "机器是否能自我复制"],
        "answer": 2,
        "explanation": "图灵测试通过让人类与机器对话，判断机器是否具有与人类难以区分的智能表现。",
        "source": "stanford-cs221",
    },
    {
        "id": "ai-003",
        "category": "AI 基础与伦理",
        "difficulty": 2,
        "question": "下列哪个术语表示“让机器从数据中自动学习规律”？",
        "options": ["机器学习", "人工编程", "数据库管理", "网络通信"],
        "answer": 0,
        "explanation": "机器学习是人工智能的核心方法，通过数据训练模型自动发现规律。",
        "source": "google-mlcc",
    },
    {
        "id": "ai-004",
        "category": "AI 基础与伦理",
        "difficulty": 2,
        "question": "AI4K12 提出的“人工智能五大核心思想”中，不包含以下哪一项？",
        "options": ["感知与表示", "机器学习", "自然交互", "社会影响"],
        "answer": 2,
        "explanation": "AI4K12 五大思想包括：感知与表示、机器学习、推理、自然交互、社会影响。",
        "source": "ai4k12",
    },
    {
        "id": "ai-005",
        "category": "AI 基础与伦理",
        "difficulty": 3,
        "question": "AI 伦理中“公平性”问题主要关注什么？",
        "options": ["算法对各类人群是否产生偏见", "模型是否足够大", "训练速度是否够快", "界面是否美观"],
        "answer": 0,
        "explanation": "AI 公平性关注算法决策是否对不同种族、性别、年龄等群体产生系统性偏见。",
        "source": "ai4k12",
    },
]

# ---------- 机器学习与深度学习 ----------
QUESTIONS += [
    {
        "id": "ml-001",
        "category": "机器学习与深度学习",
        "difficulty": 1,
        "question": "下列哪个是典型的分类问题？",
        "options": ["判断邮件是否为垃圾邮件", "预测房价", "生成图片", "压缩文件"],
        "answer": 0,
        "explanation": "垃圾邮件识别是分类问题，输出为离散类别；房价预测是回归问题。",
        "source": "google-mlcc",
    },
    {
        "id": "ml-002",
        "category": "机器学习与深度学习",
        "difficulty": 1,
        "question": "过拟合是指模型？",
        "options": ["在训练集表现好但测试集表现差", "在训练集和测试集表现都好", "无法收敛", "输出随机结果"],
        "answer": 0,
        "explanation": "过拟合是模型过度学习训练数据细节，导致泛化能力下降。",
        "source": "google-mlcc",
    },
    {
        "id": "dl-001",
        "category": "机器学习与深度学习",
        "difficulty": 1,
        "question": "神经网络中“激活函数”的作用是？",
        "options": ["引入非线性", "增加内存", "压缩模型", "删除神经元"],
        "answer": 0,
        "explanation": "激活函数让神经网络具备非线性表达能力，从而拟合复杂函数。",
        "source": "deeplearning-ai",
    },
    {
        "id": "dl-004",
        "category": "机器学习与深度学习",
        "difficulty": 2,
        "question": "Transformer 中“自注意力”机制的核心优势是？",
        "options": ["能捕捉长距离依赖", "不需要训练", "参数量更少", "只能处理中文"],
        "answer": 0,
        "explanation": "自注意力允许每个位置直接关注序列中所有其他位置，擅长捕捉长距离依赖。",
        "source": "google-mlcc",
    },
    {
        "id": "ml-005",
        "category": "机器学习与深度学习",
        "difficulty": 3,
        "question": "偏差-方差权衡中，“高方差”通常对应？",
        "options": ["过拟合", "欠拟合", "模型未训练", "数据太少"],
        "answer": 0,
        "explanation": "高方差意味着模型对训练数据过于敏感，容易过拟合。",
        "source": "stanford-cs221",
    },
]

# ---------- 大模型基础原理 ----------
QUESTIONS += [
    {
        "id": "llm-001",
        "category": "大模型基础原理",
        "difficulty": 1,
        "question": "大语言模型（LLM）主要基于哪种架构？",
        "options": ["Transformer", "支持向量机", "K近邻", "贝叶斯网络"],
        "answer": 0,
        "explanation": "当前主流大语言模型基本都基于 Transformer 架构。",
        "source": "openai",
    },
    {
        "id": "llm-002",
        "category": "大模型基础原理",
        "difficulty": 1,
        "question": "Token 在 LLM 中通常指？",
        "options": ["文本切分后的基本单位", "一种加密货币", "显卡型号", "数据库字段"],
        "answer": 0,
        "explanation": "Token 是模型处理文本时的最小单元，可以是词、子词或字符。",
        "source": "openai",
    },
    {
        "id": "llm-003",
        "category": "大模型基础原理",
        "difficulty": 2,
        "question": "上下文窗口（Context Window）指什么？",
        "options": ["模型一次能参考的最大 Token 数量", "显示器大小", "训练数据总量", "显卡显存"],
        "answer": 0,
        "explanation": "上下文窗口决定模型在生成回复时最多能利用多少输入内容。",
        "source": "openai",
    },
    {
        "id": "llm-004",
        "category": "大模型基础原理",
        "difficulty": 2,
        "question": "“幻觉（Hallucination）”在 LLM 中指的是？",
        "options": ["模型生成看似合理但错误的内容", "模型死机", "模型输出乱码", "模型拒绝回答"],
        "answer": 0,
        "explanation": "幻觉是 LLM 生成与事实不符但表达流畅的内容，是当前重要挑战。",
        "source": "deeplearning-ai",
    },
    {
        "id": "llm-005",
        "category": "大模型基础原理",
        "difficulty": 3,
        "question": "RLHF（基于人类反馈的强化学习）主要解决什么问题？",
        "options": ["让模型输出更符合人类偏好", "加快模型推理速度", "减少模型参数量", "让模型支持更多语言"],
        "answer": 0,
        "explanation": "RLHF 通过人类偏好训练奖励模型，再用强化学习让模型输出更符合人类期望。",
        "source": "deeplearning-ai",
    },
    {
        "id": "llm-006",
        "category": "大模型基础原理",
        "difficulty": 3,
        "question": "Chinchilla Scaling Law 的核心结论是？",
        "options": ["模型参数与训练数据应等比例扩展", "只增加参数即可", "只增加数据即可", "参数越多越好，数据不重要"],
        "answer": 0,
        "explanation": "Chinchilla 研究发现，给定计算预算时模型参数量和训练 token 数应等比例扩展。",
        "source": "deeplearning-ai",
    },
]

# ---------- Transformer 架构 ----------
QUESTIONS += [
    {
        "id": "tf-001",
        "category": "Transformer 架构",
        "difficulty": 1,
        "question": "Transformer 架构最初是由哪篇论文提出的？",
        "options": ["Attention Is All You Need", "ImageNet Classification", "BERT Pre-training", "GPT-3 Language Models"],
        "answer": 0,
        "explanation": "2017 年 Google 发表《Attention Is All You Need》，提出 Transformer 架构。",
        "source": "google-mlcc",
    },
    {
        "id": "tf-002",
        "category": "Transformer 架构",
        "difficulty": 1,
        "question": "自注意力机制中 Q、K、V 分别代表什么？",
        "options": ["查询、键、值", "问题、知识、答案", "质量、关键、价值", "队列、内核、向量"],
        "answer": 0,
        "explanation": "Q（Query）、K（Key）、V（Value）是自注意力机制的核心组成部分。",
        "source": "google-mlcc",
    },
    {
        "id": "tf-003",
        "category": "Transformer 架构",
        "difficulty": 2,
        "question": "位置编码（Positional Encoding）的作用是？",
        "options": ["让模型感知 token 的顺序", "增加模型参数量", "压缩输入", "加密文本"],
        "answer": 0,
        "explanation": "Transformer 本身不具备顺序感知，位置编码用于注入序列位置信息。",
        "source": "stanford-cs221",
    },
    {
        "id": "tf-004",
        "category": "Transformer 架构",
        "difficulty": 2,
        "question": "多头注意力（Multi-Head Attention）的主要好处是？",
        "options": ["让模型同时关注不同子空间的信息", "减少计算量", "让模型只能关注一个位置", "替代所有激活函数"],
        "answer": 0,
        "explanation": "多头注意力将特征分成多个头，在不同表示子空间学习关系，提升表达能力。",
        "source": "google-mlcc",
    },
    {
        "id": "tf-005",
        "category": "Transformer 架构",
        "difficulty": 3,
        "question": "Decoder-Only 架构与 Encoder-Decoder 架构相比，当前主流 LLM 更倾向哪种？",
        "options": ["Decoder-Only", "Encoder-Only", "Encoder-Decoder", "无差别"],
        "answer": 0,
        "explanation": "GPT、Claude、LLaMA 等主流生成式大模型大多采用 Decoder-Only 架构。",
        "source": "openai",
    },
]

# ---------- 提示词工程 ----------
QUESTIONS += [
    {
        "id": "prompt-001",
        "category": "提示词工程",
        "difficulty": 1,
        "question": "一个高质量的 Prompt 通常应当包含什么？",
        "options": ["清晰的任务描述", "越短越好", "随机关键词", "不需要上下文"],
        "answer": 0,
        "explanation": "清晰、具体的任务描述能显著提升大模型的回答质量。",
        "source": "deeplearning-ai",
    },
    {
        "id": "prompt-002",
        "category": "提示词工程",
        "difficulty": 1,
        "question": "“Few-shot”提示的意思是？",
        "options": ["在 Prompt 中给出少量示例", "只给一个词", "不提供任何示例", "使用随机采样"],
        "answer": 0,
        "explanation": "Few-shot 指在提示中提供少量示例，帮助模型理解任务格式。",
        "source": "openai",
    },
    {
        "id": "prompt-003",
        "category": "提示词工程",
        "difficulty": 2,
        "question": "如果想限制模型输出为 JSON，最合适的做法是？",
        "options": ["在 Prompt 中明确要求 JSON 格式并给出示例", "让模型自由发挥", "用二进制编码", "删除所有标点"],
        "answer": 0,
        "explanation": "明确指定输出格式并给示例，能大幅提高结构化输出的稳定性。",
        "source": "openai",
    },
    {
        "id": "prompt-004",
        "category": "提示词工程",
        "difficulty": 2,
        "question": "“思维链（Chain-of-Thought）”提示的核心思想是？",
        "options": ["让模型逐步推理", "让模型一次给出答案", "减少输入长度", "随机更换措辞"],
        "answer": 0,
        "explanation": "思维链通过引导模型展示中间推理步骤，提升复杂问题的准确率。",
        "source": "deeplearning-ai",
    },
    {
        "id": "prompt-005",
        "category": "提示词工程",
        "difficulty": 3,
        "question": "Prompt 注入攻击通常指的是？",
        "options": ["在输入中隐藏恶意指令试图劫持模型", "增加 Prompt 长度", "使用繁体中文", "压缩图片"],
        "answer": 0,
        "explanation": "Prompt 注入通过在输入中嵌入指令，试图让模型执行非预期操作，是一种安全风险。",
        "source": "openai",
    },
    {
        "id": "prompt-006",
        "category": "提示词工程",
        "difficulty": 2,
        "question": "System Prompt（系统提示词）通常用于？",
        "options": ["设定模型的角色、规则和输出约束", "让模型访问数据库", "提高模型运行速度", "代替训练数据"],
        "answer": 0,
        "explanation": "系统提示词用于定义模型的行为边界、角色和回答规范。",
        "source": "anthropic",
    },
]

# ---------- LLM 框架与 Agent ----------
QUESTIONS += [
    {
        "id": "agent-001",
        "category": "LLM 框架与 Agent",
        "difficulty": 1,
        "question": "LangChain 这类框架主要解决什么问题？",
        "options": ["简化 LLM 应用开发中的编排与集成", "替代 GPU 训练", "压缩模型文件", "自动生成网页"],
        "answer": 0,
        "explanation": "LangChain 提供模型调用、Prompt 管理、工具调用、记忆等模块，简化 LLM 应用开发。",
        "source": "deeplearning-ai",
    },
    {
        "id": "agent-002",
        "category": "LLM 框架与 Agent",
        "difficulty": 1,
        "question": "AI Agent 中的“工具调用（Function Calling）”主要作用是？",
        "options": ["让模型调用外部函数/API 获取信息或执行操作", "让模型自己修改训练数据", "让模型生成图片", "加快模型推理"],
        "answer": 0,
        "explanation": "工具调用让 LLM 可以连接外部系统，扩展模型能力边界。",
        "source": "openai",
    },
    {
        "id": "agent-003",
        "category": "LLM 框架与 Agent",
        "difficulty": 2,
        "question": "ReAct 模式的核心思想是？",
        "options": ["交替进行推理（Reasoning）和行动（Acting）", "只推理不行动", "只行动不推理", "随机选择答案"],
        "answer": 0,
        "explanation": "ReAct 让模型在推理和工具调用之间交替，提高复杂任务完成能力。",
        "source": "deeplearning-ai",
    },
    {
        "id": "agent-004",
        "category": "LLM 框架与 Agent",
        "difficulty": 2,
        "question": "Agent 的“记忆”模块主要用于？",
        "options": ["保存对话历史和状态以便多轮任务", "保存模型权重", "缓存 GPU 显存", "存储训练数据"],
        "answer": 0,
        "explanation": "记忆模块让 Agent 在多轮交互中保持上下文和任务状态。",
        "source": "deeplearning-ai",
    },
    {
        "id": "agent-005",
        "category": "LLM 框架与 Agent",
        "difficulty": 3,
        "question": "多 Agent 协作相比单 Agent 的优势通常是？",
        "options": ["不同 Agent 可以分工处理复杂任务", "参数量一定更少", "不需要 Prompt", "没有额外开销"],
        "answer": 0,
        "explanation": "多 Agent 通过角色分工、并行协作提升复杂任务的处理能力。",
        "source": "anthropic",
    },
]

# ---------- RAG 技术 ----------
QUESTIONS += [
    {
        "id": "rag-001",
        "category": "RAG 技术",
        "difficulty": 1,
        "question": "RAG（检索增强生成）的主要思路是？",
        "options": ["先检索外部知识再生成回答", "只靠模型记忆", "随机生成内容", "压缩模型参数"],
        "answer": 0,
        "explanation": "RAG 通过检索相关知识库内容辅助生成，减少幻觉并提高准确性。",
        "source": "microsoft-ai900",
    },
    {
        "id": "rag-002",
        "category": "RAG 技术",
        "difficulty": 2,
        "question": "RAG 中“向量检索”通常依赖什么技术？",
        "options": ["向量数据库 + 相似度计算", "关系型数据库", "文件压缩", "区块链"],
        "answer": 0,
        "explanation": "RAG 将文本转为向量并存入向量数据库，通过相似度检索最相关片段。",
        "source": "microsoft-ai900",
    },
    {
        "id": "rag-003",
        "category": "RAG 技术",
        "difficulty": 2,
        "question": "RAG 相比纯 Prompt 方式的主要优势是？",
        "options": ["能引用最新/私有知识并降低幻觉", "不需要模型", "速度一定更快", "不需要数据"],
        "answer": 0,
        "explanation": "RAG 可以把外部知识注入上下文，让模型基于最新或私有资料回答。",
        "source": "microsoft-ai900",
    },
    {
        "id": "rag-004",
        "category": "RAG 技术",
        "difficulty": 3,
        "question": "在 RAG 中，“chunking（分块）”过小可能导致什么问题？",
        "options": ["检索到的片段上下文不完整", "向量数据库体积变小", "模型一定更准确", "不需要索引"],
        "answer": 0,
        "explanation": "分块过小可能截断语义，导致检索结果缺乏完整上下文，影响生成质量。",
        "source": "deeplearning-ai",
    },
    {
        "id": "rag-005",
        "category": "RAG 技术",
        "difficulty": 3,
        "question": "RAG 中“重排序（Rerank）”的作用是？",
        "options": ["对初检结果做更精细的排序提升相关性", "删除所有文档", "压缩向量", "替代生成模型"],
        "answer": 0,
        "explanation": "重排序模型对初步检索结果进行二次排序，提高送入 LLM 的上下文质量。",
        "source": "microsoft-ai900",
    },
]

# ---------- Claude Code ----------
QUESTIONS += [
    {
        "id": "cc-001",
        "category": "Claude Code",
        "difficulty": 1,
        "question": "Claude Code 主要面向什么场景？",
        "options": ["在终端中辅助编程和项目开发", "替代操作系统", "做文字排版", "管理数据库备份"],
        "answer": 0,
        "explanation": "Claude Code 是 Anthropic 推出的终端 AI 编程助手，可帮助开发、调试和重构代码。",
        "source": "anthropic",
    },
    {
        "id": "cc-002",
        "category": "Claude Code",
        "difficulty": 1,
        "question": "使用 Claude Code 时，通常通过什么方式向它描述任务？",
        "options": ["自然语言指令", "二进制代码", "SQL 查询", "电路图"],
        "answer": 0,
        "explanation": "Claude Code 支持用自然语言描述开发任务，并可直接操作项目文件。",
        "source": "anthropic",
    },
    {
        "id": "cc-003",
        "category": "Claude Code",
        "difficulty": 2,
        "question": "Claude Code 能直接对项目做的操作包括？",
        "options": ["读写文件、运行命令、修改代码", "只能聊天", "只能生成图片", "只能管理网络"],
        "answer": 0,
        "explanation": "Claude Code 可以读写项目文件、执行终端命令并辅助完成开发任务。",
        "source": "anthropic",
    },
    {
        "id": "cc-004",
        "category": "Claude Code",
        "difficulty": 2,
        "question": "在 Claude Code 中使用“权限控制”的主要目的是？",
        "options": ["限制 AI 对文件和命令的自动操作范围", "提高屏幕亮度", "加快网络速度", "增加字体大小"],
        "answer": 0,
        "explanation": "权限控制让用户决定 AI 能执行哪些操作，提升安全性和可控性。",
        "source": "anthropic",
    },
]

# ---------- 大模型应用与部署 ----------
QUESTIONS += [
    {
        "id": "app-001",
        "category": "大模型应用与部署",
        "difficulty": 1,
        "question": "模型量化（Quantization）的主要目的是？",
        "options": ["减少模型体积和推理开销", "增加模型参数量", "让模型自动写代码", "提高训练数据量"],
        "answer": 0,
        "explanation": "量化通过降低参数精度（如 FP16→INT8）来减少显存占用和推理成本。",
        "source": "alibaba-cloud",
    },
    {
        "id": "app-002",
        "category": "大模型应用与部署",
        "difficulty": 1,
        "question": "AI-900 认证中，Azure AI Fundamentals 主要考察什么？",
        "options": ["AI 基础概念与 Azure AI 服务", "前端 HTML", "网络布线", "数据库索引"],
        "answer": 0,
        "explanation": "AI-900 面向 AI 基础概念和 Azure AI 服务，是入门级认证。",
        "source": "microsoft-ai900",
    },
    {
        "id": "app-003",
        "category": "大模型应用与部署",
        "difficulty": 2,
        "question": "在云上部署大模型服务时，以下哪项通常是关键指标？",
        "options": ["推理延迟（Latency）与吞吐量（Throughput）", "页面颜色", "字体大小", "鼠标型号"],
        "answer": 0,
        "explanation": "部署大模型需要关注推理延迟、吞吐量、成本和服务可用性。",
        "source": "microsoft-ai900",
    },
    {
        "id": "app-004",
        "category": "大模型应用与部署",
        "difficulty": 2,
        "question": "向量数据库在大模型应用中的典型用途是？",
        "options": ["存储和检索 Embedding 向量", "存储源代码", "管理用户密码", "渲染 3D 图形"],
        "answer": 0,
        "explanation": "向量数据库用于存储文本/图片等对象的向量表示，支持相似度检索，常用于 RAG。",
        "source": "alibaba-cloud",
    },
    {
        "id": "app-005",
        "category": "大模型应用与部署",
        "difficulty": 3,
        "question": "大模型应用上线前，最重要的安全合规检查包括？",
        "options": ["内容安全、数据隐私、权限控制", "更换显示器", "增加动画", "修改字体"],
        "answer": 0,
        "explanation": "生产级大模型应用必须关注内容安全、数据隐私、权限与合规要求。",
        "source": "alibaba-cloud",
    },
]


def main() -> None:
    ids = [q["id"] for q in QUESTIONS]
    if len(ids) != len(set(ids)):
        raise SystemExit("存在重复题目 id")
    for q in QUESTIONS:
        if not (0 <= q["answer"] < len(q["options"])):
            raise SystemExit(f"题目 {q['id']} answer 越界")
        if q["source"] not in SOURCES:
            raise SystemExit(f"题目 {q['id']} source 不存在: {q['source']}")
    bank = {
        "version": "2.0.0",
        "categories": CATEGORIES,
        "sources": SOURCES,
        "questions": QUESTIONS,
    }
    OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"题库已生成：{OUT}，共 {len(QUESTIONS)} 题")


if __name__ == "__main__":
    main()
