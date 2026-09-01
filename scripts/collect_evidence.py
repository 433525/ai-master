#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""自动收集开发佐证材料到 devlog/evidence 并登记到 manifest。"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "devlog" / "evidence"
MANIFEST = EVIDENCE / "manifest.json"
TIMELINE = ROOT / "devlog" / "timeline.md"

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"}
DATA_EXTS = {".csv", ".json", ".xlsx", ".xls", ".log", ".txt", ".md", ".yaml", ".yml"}

SOURCE_DIRS = ["artifacts", "test-results", "screenshots"]


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


def target_for(path: Path) -> Path:
    ext = path.suffix.lower()
    if ext in IMAGE_EXTS:
        return EVIDENCE / "screenshots" / "auto"
    if ext in DATA_EXTS:
        return EVIDENCE / "experiments"
    return EVIDENCE / "experiments"


def collect_from(source_root: Path, manifest: dict, new_files: list[dict]) -> None:
    if not source_root.exists():
        return
    for path in sorted(source_root.rglob("*")):
        if not path.is_file() or path.name.startswith("."):
            continue
        digest = sha256(path)
        # 已登记过则跳过
        if any(f["sha256"] == digest for f in manifest["files"]):
            continue
        target_dir = target_for(path)
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
        print(f"收录: {record['path']}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", action="append", default=[], help="额外扫描目录")
    args = parser.parse_args()

    manifest = load_manifest()
    new_files: list[dict] = []

    for name in SOURCE_DIRS + args.source:
        collect_from(ROOT / name, manifest, new_files)

    # 自动截图目录也登记
    auto_shot = EVIDENCE / "screenshots" / "auto"
    collect_from(auto_shot, manifest, new_files)

    if not new_files:
        print("没有新的佐证材料需要收录。")
        return 0

    save_manifest(manifest)

    # 时间线追加一行
    TIMELINE.parent.mkdir(parents=True, exist_ok=True)
    if not TIMELINE.exists():
        TIMELINE.write_text("# AIMaster 项目开发时间线\n\n", encoding="utf-8")
    with TIMELINE.open("a", encoding="utf-8") as f:
        f.write(f"- `{datetime.now().isoformat(timespec='seconds')}` 📎 自动收录 {len(new_files)} 个佐证材料\n")

    print(f"完成：新增收录 {len(new_files)} 个文件。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
