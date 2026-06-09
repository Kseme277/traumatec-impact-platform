#!/usr/bin/env python3
"""Crée des ZIP à partir de Packages/{TYPE}/ pour import via l'UI ou l'API."""

from __future__ import annotations

import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGES = ROOT / "Packages"
OUT = ROOT / "package-zips"


def build_zips() -> list[Path]:
    OUT.mkdir(exist_ok=True)
    created: list[Path] = []
    for folder in sorted(PACKAGES.iterdir()):
        if not folder.is_dir():
            continue
        files = [p for p in folder.iterdir() if p.is_file() and not p.name.startswith("~$")]
        if not files:
            continue
        zip_path = OUT / f"{folder.name}.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for path in sorted(files, key=lambda p: p.name):
                zf.write(path, arcname=path.name)
        created.append(zip_path)
        print(f"  {zip_path.name} ({len(files)} fichiers)")
    return created


if __name__ == "__main__":
    print(f"ZIP dans {OUT}/")
    build_zips()
