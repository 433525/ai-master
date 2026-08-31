#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AIMaster 开发全流程时间线 PDF 生成器
"""
from __future__ import annotations

import io
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

import auto_dev_log  # noqa: E402

from PIL import Image as PILImage  # noqa: E402
from reportlab.lib import colors  # noqa: E402
from reportlab.lib.pagesizes import A4  # noqa: E402
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet  # noqa: E402
from reportlab.lib.units import cm  # noqa: E402
from reportlab.lib.utils import ImageReader  # noqa: E402
from reportlab.pdfbase import pdfmetrics  # noqa: E402
from reportlab.pdfbase.ttfonts import TTFont  # noqa: E402
from reportlab.platypus import (  # noqa: E402
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT_FILE = ROOT / "devlog" / "AIMaster_开发全流程时间线.pdf"
MAX_PDF_BYTES = 50 * 1024 * 1024
EVIDENCE_DIR = ROOT / "devlog" / "evidence"

try:
    font_path = "C:/Windows/Fonts/simhei.ttf"
    if not Path(font_path).exists():
        raise OSError(font_path)
    pdfmetrics.registerFont(TTFont("SimHei", font_path))
    FONT = "SimHei"
except Exception:
    FONT = "Helvetica"


def styles():
    ss = getSampleStyleSheet()
    custom = {
        "Title": ParagraphStyle("Title", parent=ss["Title"], fontName=FONT, fontSize=24, leading=30, textColor=colors.HexColor("#0B1D3A")),
        "H1": ParagraphStyle("H1", parent=ss["Heading1"], fontName=FONT, fontSize=16, leading=22, textColor=colors.HexColor("#1F4D78"), spaceBefore=14, spaceAfter=6),
        "H2": ParagraphStyle("H2", parent=ss["Heading2"], fontName=FONT, fontSize=13, leading=18, textColor=colors.HexColor("#2E74B5"), spaceBefore=10, spaceAfter=4),
        "Body": ParagraphStyle("Body", parent=ss["BodyText"], fontName=FONT, fontSize=10, leading=15),
        "Small": ParagraphStyle("Small", parent=ss["BodyText"], fontName=FONT, fontSize=8.5, leading=12),
        "Code": ParagraphStyle("Code", parent=ss["Code"], fontName="Courier", fontSize=8.5, leading=11),
    }
    return custom


def add_paragraph(story, text, style):
    if text:
        story.append(Paragraph(text, style))


def add_table(story, header, rows, col_widths=None):
    data = [header] + rows
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8EEF5")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0B1D3A")),
                ("FONTNAME", (0, 0), (-1, -1), FONT),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#B8C4D6")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 8))


def git_commits_for_pdf():
    commits = auto_dev_log.get_commits(max_count=1000)
    team = auto_dev_log.load_team()
    rows = []
    for c in commits:
        member = auto_dev_log.find_member(team, c["author_name"], c["author_email"])
        region = member.get("region", "-") if member else "-"
        role = member.get("role", "-") if member else "-"
        cat = auto_dev_log.guess_category(c["subject"])
        rows.append(
            [
                Paragraph(c["date"][:19].replace("T", " "), styles()["Small"]),
                Paragraph(f"{c['short']}<br/>{c['author_name']}", styles()["Small"]),
                Paragraph(f"{region}<br/>{role}", styles()["Small"]),
                Paragraph(cat, styles()["Small"]),
                Paragraph(c["subject"], styles()["Small"]),
            ]
        )
    return rows


def team_rows():
    team = auto_dev_log.load_team()
    rows = []
    for m in team.get("members", []):
        rows.append(
            [
                Paragraph(m.get("name", "-"), styles()["Small"]),
                Paragraph(m.get("email", "-"), styles()["Small"]),
                Paragraph(m.get("region", "-"), styles()["Small"]),
                Paragraph(m.get("role", "-"), styles()["Small"]),
                Paragraph(m.get("note", ""), styles()["Small"]),
            ]
        )
    return rows


def devlog_entries_summary():
    entries_dir = ROOT / "devlog" / "entries"
    if not entries_dir.exists():
        return []
    rows = []
    for p in sorted(entries_dir.rglob("*.md")):
        rel = p.relative_to(ROOT).as_posix()
        content = p.read_text(encoding="utf-8", errors="replace")
        first_line = next((ln.strip("# ").strip() for ln in content.splitlines() if ln.strip().startswith("## ")), p.stem)
        rows.append([Paragraph(rel, styles()["Small"]), Paragraph(first_line[:120], styles()["Small"])])
    return rows


def evidence_images():
    """收集并压缩截图/图片，返回 reportlab Image 元素列表。"""
    images = []
    for ext in ("*.png", "*.jpg", "*.jpeg", "*.bmp", "*.gif", "*.webp"):
        images.extend(EVIDENCE_DIR.rglob(ext))
    images = [p for p in images if ".gitkeep" not in p.name]
    elements = []
    for p in sorted(images)[:50]:
        try:
            im = PILImage.open(p)
            im = im.convert("RGB")
            max_w = 520
            max_h = 320
            im.thumbnail((max_w, max_h), PILImage.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=70, optimize=True)
            buf.seek(0)
            img = Image(ImageReader(buf), width=im.width, height=im.height)
            elements.append(Paragraph(f"📷 {p.relative_to(ROOT).as_posix()}", styles()["Small"]))
            elements.append(img)
            elements.append(Spacer(1, 6))
        except Exception as e:
            elements.append(Paragraph(f"无法读取图片 {p.name}: {e}", styles()["Small"]))
    return elements


def evidence_text_files():
    """收集会议纪要/实验数据等文本佐证材料。"""
    elements = []
    patterns = ["*.md", "*.txt", "*.csv", "*.json", "*.log"]
    files = []
    for pat in patterns:
        files.extend((EVIDENCE_DIR / "meetings").rglob(pat))
        files.extend((EVIDENCE_DIR / "experiments").rglob(pat))
    seen = set()
    for p in sorted(files):
        if p in seen:
            continue
        seen.add(p)
        rel = p.relative_to(ROOT).as_posix()
        elements.append(Paragraph(f"📄 {rel}", styles()["H2"]))
        try:
            text = p.read_text(encoding="utf-8", errors="replace").strip()
        except Exception as e:
            text = f"读取失败: {e}"
        if not text:
            text = "（空文件）"
        if len(text) > 6000:
            text = text[:6000] + "\n...（已截断）"
        safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
        elements.append(Paragraph(safe, styles()["Code"]))
        elements.append(Spacer(1, 6))
    return elements


def build_pdf() -> Path:
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    st = styles()
    doc = SimpleDocTemplate(
        str(OUT_FILE),
        pagesize=A4,
        leftMargin=1.6 * cm,
        rightMargin=1.6 * cm,
        topMargin=1.4 * cm,
        bottomMargin=1.4 * cm,
        title="AIMaster 项目开发全流程时间线",
        author="AIMaster DevLog System",
    )
    story = []

    story.append(Spacer(1, 3 * cm))
    story.append(Paragraph("AIMaster 项目开发全流程时间线", st["Title"]))
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph("完整、真实记录项目开发关键节点与佐证材料", st["H2"]))
    story.append(Spacer(1, 1.2 * cm))
    story.append(Paragraph(f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", st["Body"]))
    story.append(Paragraph(f"Git 分支：{auto_dev_log.run_git('branch', '--show-current') or 'master'}", st["Body"]))
    story.append(Paragraph(f"最新提交：{auto_dev_log.run_git('rev-parse', '--short', 'HEAD')}", st["Body"]))
    story.append(PageBreak())

    story.append(Paragraph("1. 项目概览", st["H1"]))
    readme = ROOT / "README.md"
    if readme.exists():
        lines = [l for l in readme.read_text(encoding="utf-8", errors="replace").splitlines() if l.strip() and not l.startswith("#")]
        add_paragraph(story, "<br/>".join(lines[:20]), st["Body"])
    else:
        add_paragraph(story, "（暂无 README）", st["Body"])

    story.append(Paragraph("2. 团队分工", st["H1"]))
    tr = team_rows()
    if tr:
        add_table(story, ["姓名", "邮箱", "地区", "角色", "备注"], tr, [3.2 * cm, 5.0 * cm, 1.6 * cm, 4.2 * cm, 3.4 * cm])
    else:
        add_paragraph(story, "请在 devlog/team.json 中维护团队成员信息。", st["Body"])

    story.append(Paragraph("3. 开发时间线（Git 提交记录）", st["H1"]))
    cr = git_commits_for_pdf()
    add_table(
        story,
        ["时间", "提交/作者", "地区/角色", "分类", "说明"],
        cr,
        [3.6 * cm, 3.4 * cm, 2.6 * cm, 2.0 * cm, 5.6 * cm],
    )

    story.append(Paragraph("4. 自动开发日志", st["H1"]))
    er = devlog_entries_summary()
    if er:
        add_table(story, ["日志文件", "标题"], er, [7.0 * cm, 10.2 * cm])
    else:
        add_paragraph(story, "暂无开发日志，请先运行 python scripts/auto_dev_log.py", st["Body"])

    story.append(Paragraph("5. 佐证材料：截图", st["H1"]))
    imgs = evidence_images()
    if imgs:
        story.extend(imgs)
    else:
        add_paragraph(story, "当前没有截图。请将截图放入 devlog/evidence/screenshots/。", st["Body"])

    story.append(Paragraph("6. 佐证材料：实验数据 / 会议纪要", st["H1"]))
    texts = evidence_text_files()
    if texts:
        story.extend(texts)
    else:
        add_paragraph(story, "当前没有实验数据或会议纪要。请放入 devlog/evidence/experiments/ 和 devlog/evidence/meetings/。", st["Body"])

    doc.build(story)

    size = OUT_FILE.stat().st_size
    if size > MAX_PDF_BYTES:
        raise RuntimeError(f"PDF 大小 {size / 1024 / 1024:.1f}MB 超过 50MB 限制")
    print(f"PDF 已生成：{OUT_FILE} ({size / 1024:.1f} KB)")
    return OUT_FILE


if __name__ == "__main__":
    build_pdf()
