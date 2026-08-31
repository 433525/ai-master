#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""安装 AIMaster 自动开发日志 Git Hook。"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
subprocess.check_call(["git", "config", "core.hooksPath", ".githooks"], cwd=str(ROOT))
print("已配置 Git hooksPath = .githooks，之后每次 commit 都会自动生成开发日志。")
