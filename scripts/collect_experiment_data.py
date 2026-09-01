#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""自动收集实验数据/压测结果/性能数据到 devlog/evidence/experiments（不收集截图）。"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPERIMENTS = ROOT / "devlog" / "evidence" / "experiments"
MANIFEST = EXPERIMENTS / "manifest.json"
TIMELINE = ROOT / "devlog" / "timeline.md"

DATA_EXTS = {".csv", ".json", ".xlsx", ".xls", ".log", ".txt", ".md", ".yaml", ".yml"}
SOURCE_DIRS = ["artifacts", "test-results"]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_manifest() -> dict:
    if MANIFEST.exists():
        try:
            return json.loads(MANIFEST.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"version": 1, "files": []}


def save_manifest(manifest: dict) -> None:
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def collect_from(source_root: Path, manifest: dict, new_files: list[dict]) -> None:
    if not source_root.exists():
        return
    for path in sorted(source_root.rglob("*")):
        if not path.is_file() or path.name.startswith("."):
            continue
        if path.suffix.lower() not in DATA_EXTS:
            continue
        digest = sha256(path)
        if any(f["sha256"] == digest for f in manifest["files"]):
            continue
        target_dir = EXPERIMENTS
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / path.name
        if target.exists():
            target = target_dir / f"{datetime.now():%Y%m%d_%H%M%S}_{path.name}"
        shutil.copy2(path, target)
        record = {
            "source": str(path.relative_to(ROOT).as_posix()),
            "path": str(target.relative_to(ROOT).as_posix()),
            "sha256": digest,
            "size": path.stat().st_size,
            "collected_at": datetime.now().isoformat(timespec="seconds"),
        }
        manifest["files"].append(record)
        new_files.append(record)
        print(f"收录实验数据: {record['path']}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", action="append", default=[], help="额外扫描目录")
    args = parser.parse_args()

    manifest = load_manifest()
    new_files: list[dict] = []

    for name in SOURCE_DIRS + args.source:
        collect_from(ROOT / name, manifest, new_files)

    if not new_files:
        print("没有新的实验数据需要收录。")
        return 0

    save_manifest(manifest)

    TIMELINE.parent.mkdir(parents=True, exist_ok=True)
    if not TIMELINE.exists():
        TIMELINE.write_text("# AIMaster 项目开发时间线\n\n", encoding="utf-8")
    with TIMELINE.open("a", encoding="utf-8") as f:
        f.write(f"- `{datetime.now().isoformat(timespec='seconds')}` 📊 自动收录实验数据 {len(new_files)} 个\n")

    print(f"完成：新增收录实验数据 {len(new_files)} 个。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
