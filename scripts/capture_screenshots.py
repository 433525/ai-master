#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""自动捕获 AIMaster 界面截图，用于收录进开发日志。
依赖 Playwright；未安装时自动跳过。"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except Exception:
    print("未安装 Playwright，跳过截图捕获。可运行: pip install playwright && python -m playwright install chromium")
    sys.exit(0)

PAGES = [
    ("home", "/"),
    ("quiz", "/frontend/quiz/index.html"),
    ("history", "/frontend/history/index.html"),
    ("learning", "/frontend/learning-center/index.html"),
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8765")
    parser.add_argument("--out", default="devlog/evidence/screenshots/auto")
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        captured = []
        for name, path in PAGES:
            try:
                page.goto(args.base_url.rstrip("/") + path, wait_until="networkidle", timeout=20000)
                page.wait_for_timeout(800)
                fname = f"{stamp}_{name}.png"
                page.screenshot(path=str(out_dir / fname), full_page=False)
                captured.append(str(out_dir / fname))
                print(f"截图成功: {name} -> {out_dir / fname}")
            except Exception as e:
                print(f"截图失败: {name} -> {e}")
        browser.close()

    if not captured:
        print("没有捕获到任何截图")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
