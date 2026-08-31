#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AIMaster 自动开发日志生成器
每次提交后自动为每个成员生成/追加开发日志，并提醒美国成员补充日志。

用法:
    python scripts/auto_dev_log.py [--all]

说明:
    默认只处理自上次记录以来的新提交；
    首次运行或加 --all 时处理全部提交。
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEVLOG = ROOT / "devlog"
ENTRIES = DEVLOG / "entries"
REMINDERS = DEVLOG / "reminders"
TIMELINE = DEVLOG / "timeline.md"
TEAM_FILE = DEVLOG / "team.json"
STATE_FILE = DEVLOG / ".last_commit"

RECORD_SEP = "\x1e"
FIELD_SEP = "\x1f"

CATEGORY_KEYWORDS = [
    ("方案设计", ["方案", "设计", "架构", "design"]),
    ("实验测试", ["实验", "测试", "验证", "benchmark", "实验数据", "test"]),
    ("问题排查", ["修复", "解决", "问题", "bug", "fix", "排查", "报错"]),
    ("文档", ["文档", "doc", "readme", "日志"]),
    ("版本迭代", ["feat", "feature", "新增", "优化", "改进", "迭代", "版本", "打包"]),
]


def run_git(*args: str) -> str:
    return subprocess.check_output(
        ["git", *args], cwd=str(ROOT), text=True, encoding="utf-8", errors="replace"
    ).strip()


def safe_name(name: str) -> str:
    name = re.sub(r"[^\w\u4e00-\u9fff.-]+", "_", name, flags=re.UNICODE)
    return name.strip("_") or "unknown"


def load_team() -> dict:
    if not TEAM_FILE.exists():
        return {"members": [], "reminder": {"enabled": True, "region": "US"}}
    try:
        return json.loads(TEAM_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"members": [], "reminder": {"enabled": True, "region": "US"}}


def find_member(team: dict, name: str, email: str) -> dict | None:
    for m in team.get("members", []):
        if (m.get("email") and m["email"].lower() == email.lower()) or (
            m.get("name") and m["name"].lower() == name.lower()
        ):
            return m
    return None


def get_commits(since: str | None = None, max_count: int = 500) -> list[dict]:
    fmt = f"%H{FIELD_SEP}%an{FIELD_SEP}%ae{FIELD_SEP}%aI{FIELD_SEP}%s{FIELD_SEP}%b{RECORD_SEP}"
    cmd = ["git", "log", f"--format={fmt}", "--date=iso"]
    if since:
        cmd += [f"{since}..HEAD"]
    else:
        cmd += ["-n", str(max_count)]
    out = subprocess.check_output(cmd, cwd=str(ROOT), text=True, encoding="utf-8", errors="replace")
    commits = []
    for rec in out.split(RECORD_SEP):
        rec = rec.strip("\r\n")
        if not rec:
            continue
        parts = rec.split(FIELD_SEP)
        if len(parts) < 6:
            continue
        h, an, ae, ai, s, b = parts[:6]
        commits.append(
            {
                "hash": h,
                "short": h[:8],
                "author_name": an,
                "author_email": ae,
                "date": ai,
                "subject": s,
                "body": b,
            }
        )
    return commits


def files_for(commit_hash: str) -> list[str]:
    out = run_git("-c", "core.quotePath=false", "show", "--name-only", "--format=", commit_hash)
    return [x for x in out.splitlines() if x.strip()]


def guess_category(subject: str) -> str:
    lower = subject.lower()
    for cat, keys in CATEGORY_KEYWORDS:
        if any(k.lower() in lower for k in keys):
            return cat
    return "开发迭代"


def entry_path(author_name: str, date_str: str) -> Path:
    dt = datetime.fromisoformat(date_str)
    safe = safe_name(author_name)
    return ENTRIES / f"{dt.year:04d}" / f"{dt.month:02d}" / f"{dt.date().isoformat()}_{safe}.md"


def ensure_reminder(member: dict, commit: dict, entry: Path) -> bool:
    """如果成员是 US 且该提交还没有详细日志，生成提醒。返回是否生成。"""
    reminder_cfg = load_team().get("reminder", {})
    if not reminder_cfg.get("enabled", True):
        return False
    if member.get("region", "").upper() != reminder_cfg.get("region", "US").upper():
        return False
    if entry.exists() and "<!-- 已人工补充 -->" in entry.read_text(encoding="utf-8", errors="replace"):
        return False
    date = datetime.fromisoformat(commit["date"]).date().isoformat()
    fname = f"{date}_{safe_name(commit['author_name'])}_{commit['short']}.md"
    reminder = REMINDERS / fname
    template = reminder_cfg.get(
        "template",
        "请补充本次改进的详细开发日志，并附上截图、实验数据或会议纪要等佐证材料。",
    )
    content = f"""# 开发日志提醒

- **成员**：{commit['author_name']}（{commit['author_email']}）
- **地区**：{member.get('region', 'US')}
- **提交**：{commit['short']}
- **时间**：{commit['date']}
- **标题**：{commit['subject']}

> {template}

请编辑：`{entry.relative_to(ROOT).as_posix()}`
"""
    reminder.parent.mkdir(parents=True, exist_ok=True)
    reminder.write_text(content, encoding="utf-8")
    print(f"  [提醒] {commit['author_name']} 是美国成员，请补充开发日志 -> {reminder.relative_to(ROOT).as_posix()}")
    return True


def append_timeline(commit: dict, category: str, member: dict | None) -> None:
    TIMELINE.parent.mkdir(parents=True, exist_ok=True)
    if not TIMELINE.exists():
        TIMELINE.write_text("# AIMaster 项目开发时间线\n\n", encoding="utf-8")
    text = TIMELINE.read_text(encoding="utf-8", errors="replace")
    if commit["short"] in text:
        return
    region = member.get("region", "-") if member else "-"
    role = member.get("role", "-") if member else "-"
    line = (
        f"- `{commit['date']}` `{commit['short']}` **{commit['author_name']}** "
        f"（{region}/{role}）[{category}] {commit['subject']}"
    )
    with TIMELINE.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def append_entry(commit: dict, category: str, member: dict | None, files: list[str]) -> Path:
    path = entry_path(commit["author_name"], commit["date"])
    path.parent.mkdir(parents=True, exist_ok=True)
    existing = path.read_text(encoding="utf-8", errors="replace") if path.exists() else ""
    if commit["short"] in existing:
        return path
    region = member.get("region", "-") if member else "-"
    role = member.get("role", "-") if member else "-"
    body = (commit["body"] or "").strip()
    section = f"""
## {commit['date']} - {commit['subject']}

- **提交**：`{commit['short']}`
- **作者**：{commit['author_name']} <{commit['author_email']}>
- **角色/地区**：{role} / {region}
- **分类**：{category}
- **涉及文件**：
{chr(10).join('  - ' + f for f in (files or ['-']) )}
- **说明**：
{body if body else '（待补充详细说明）'}

> 自动生成于 {datetime.now().isoformat(timespec='seconds')}
"""
    with path.open("a", encoding="utf-8") as f:
        f.write(section)
    return path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true", help="处理全部提交（首次初始化用）")
    parser.add_argument("--check", action="store_true", help="CI 模式：若生成美国成员提醒则返回非 0")
    args = parser.parse_args()

    ENTRIES.mkdir(parents=True, exist_ok=True)
    REMINDERS.mkdir(parents=True, exist_ok=True)
    team = load_team()
    reminded = False

    since = None
    if not args.all and STATE_FILE.exists():
        since = STATE_FILE.read_text(encoding="utf-8").strip() or None

    commits = get_commits(since=since)
    if not commits:
        print("没有新的提交需要处理。")
        return 0

    for commit in reversed(commits):  # 从旧到新，保持时间线顺序
        files = files_for(commit["hash"])
        # 仅更新 devlog 的维护性提交不再重复记录，避免日志提交引发循环
        if files and all(f.startswith("devlog/") for f in files):
            print(f"  [跳过] {commit['short']} 仅更新 devlog，不重复记录")
            continue
        member = find_member(team, commit["author_name"], commit["author_email"])
        category = guess_category(commit["subject"])
        path = append_entry(commit, category, member, files)
        append_timeline(commit, category, member)
        if ensure_reminder(member, commit, path) if member else False:
            reminded = True
        print(f"  [日志] {commit['date'][:10]} {commit['short']} {commit['author_name']} -> {path.relative_to(ROOT).as_posix()}")

    # 记录已处理位置
    STATE_FILE.write_text(commits[0]["hash"], encoding="utf-8")
    print(f"完成：共处理 {len(commits)} 个提交。")
    if args.check and reminded:
        print("有美国成员需要补充开发日志，CI 检查未通过。请查看 devlog/reminders/")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
