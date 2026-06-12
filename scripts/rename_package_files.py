#!/usr/bin/env python3
"""Renomme les fichiers programme (02_*) dans Packages/{TYPE}/ selon le type de paquet."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGES = ROOT / "Packages"
sys.path.insert(0, str(ROOT / "packages" / "tip-common"))

from tip_common.package_types import (  # noqa: E402
    PACKAGE_TYPE_SPECS,
    adapt_package_filename,
    infer_document_type,
    normalize_package_type,
)

# Fichiers programme erronés à retirer (doublon / mauvais format pour le type).
_REMOVE_IF_CANONICAL_EXISTS = frozenset(
    {
        ("IEC_C", "02_Modèle_Programme_Sem IEC_SEN.doc"),
        ("IEC_F", "02_Modèle_Programme_Sem IEC_SEN.doc"),
    }
)


def rename_package_files(*, dry_run: bool = False) -> list[str]:
    actions: list[str] = []

    for folder in sorted(PACKAGES.iterdir()):
        if not folder.is_dir() or folder.name.startswith("."):
            continue
        package_type = normalize_package_type(folder.name.upper().replace("-", "_")) or ""
        if package_type not in PACKAGE_TYPE_SPECS:
            continue

        for path in sorted(folder.iterdir()):
            if not path.is_file() or path.name.startswith("~$"):
                continue

            key = (folder.name.upper().replace("-", "_"), path.name)
            if key in _REMOVE_IF_CANONICAL_EXISTS:
                actions.append(f"REMOVE {path}")
                if not dry_run:
                    path.unlink()
                continue

            new_name = adapt_package_filename(path.name, package_type)
            if new_name == path.name:
                continue
            if infer_document_type(path.name) != "programme":
                continue

            target = folder / new_name
            if target.exists():
                actions.append(f"SKIP (exists) {path} -> {target.name}")
                continue

            actions.append(f"RENAME {path.name} -> {new_name} [{package_type}]")
            if not dry_run:
                path.rename(target)

    return actions


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    if dry:
        print("Mode simulation (--dry-run)")
    actions = rename_package_files(dry_run=dry)
    if not actions:
        print("Aucun renommage nécessaire.")
    else:
        for line in actions:
            print(line)
