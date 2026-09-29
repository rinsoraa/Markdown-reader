# -*- coding: utf-8 -*-
"""打包 Markdown Reader 扩展 → dist/markdown-reader-<version>.zip 与 .xpi。

只打包运行所需文件（manifest、content、popup、icons、README、LICENSE），
排除测试、脚本与 dist 自身。
"""
import os
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DIST = os.path.join(ROOT, "dist")

INCLUDE_DIRS = ("content", "popup", "icons")
INCLUDE_FILES = ("manifest.json", "README.md", "LICENSE")
SKIP_EXTENSIONS = (".pyc",)
SKIP_NAMES = ("gen_icons.py",)


def read_version():
    import json

    with open(os.path.join(ROOT, "manifest.json"), encoding="utf-8") as f:
        return json.load(f)["version"]


def collect():
    files = []
    for name in INCLUDE_FILES:
        files.append((os.path.join(ROOT, name), name))
    for d in INCLUDE_DIRS:
        base = os.path.join(ROOT, d)
        for dirpath, _, filenames in os.walk(base):
            for fn in sorted(filenames):
                full = os.path.join(dirpath, fn)
                rel = os.path.relpath(full, ROOT).replace(os.sep, "/")
                if fn.endswith(SKIP_EXTENSIONS) or fn in SKIP_NAMES:
                    continue
                files.append((full, rel))
    return files


def build():
    os.makedirs(DIST, exist_ok=True)
    version = read_version()
    files = collect()
    zip_path = os.path.join(DIST, f"markdown-reader-{version}.zip")
    xpi_path = os.path.join(DIST, f"markdown-reader-{version}.xpi")
    for target in (zip_path, xpi_path):
        with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as zf:
            for full, rel in files:
                zf.write(full, rel)
        print("written", target, os.path.getsize(target), "bytes")
    print("packed", len(files), "files")


if __name__ == "__main__":
    build()
