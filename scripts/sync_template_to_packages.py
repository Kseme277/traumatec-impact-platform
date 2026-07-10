#!/usr/bin/env python3
"""Synchronise Template/ (sources AO Alliance) vers Packages/{TYPE}/ attendu par le catalog.

Mapping :
  Paquet_Sem/Paquet_Op S      → OP_S
  Paquet_Sem/Paquet_Sem PBO   → PBO_S
  Paquet_Sem/Paquet_Sem IEC   → IEC_S
  Paquet_Cours/Paquet Op C    → OP_C
  Paquet_Cours/Paquet_ORP C   → ORP_C
  Paquet_Cours/Paquet_Nonop C → NONOP_C
  FET                         → copie de OP_C (listes J1–J2 filtrées à l'import)
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "Template"
PACKAGES = ROOT / "Packages"

# (source relative à Template/, code paquet)
TEMPLATE_MAP: tuple[tuple[str, str], ...] = (
    ("Paquet_Sem/Paquet_Op S", "OP_S"),
    ("Paquet_Sem/Paquet_Sem PBO", "PBO_S"),
    ("Paquet_Sem/Paquet_Sem IEC", "IEC_S"),
    ("Paquet_Cours/Paquet Op C", "OP_C"),
    ("Paquet_Cours/Paquet_ORP C", "ORP_C"),
    ("Paquet_Cours/Paquet_Nonop C", "NONOP_C"),
)


def _copy_files(src: Path, dest: Path) -> int:
    dest.mkdir(parents=True, exist_ok=True)
    # Nettoyer l'ancien contenu (fichiers uniquement)
    for old in dest.iterdir():
        if old.is_file():
            old.unlink()
        elif old.is_dir():
            shutil.rmtree(old)

    count = 0
    for path in sorted(src.iterdir()):
        if not path.is_file():
            continue
        name = path.name
        if name.startswith("~$") or name.startswith(".~"):
            continue
        shutil.copy2(path, dest / name)
        count += 1
    return count


def sync(*, with_fet: bool = True) -> list[tuple[str, int]]:
    if not TEMPLATE.is_dir():
        raise SystemExit(f"Dossier Template/ introuvable : {TEMPLATE}")

    PACKAGES.mkdir(parents=True, exist_ok=True)
    results: list[tuple[str, int]] = []

    for rel, code in TEMPLATE_MAP:
        src = TEMPLATE / rel
        if not src.is_dir():
            print(f"  SKIP {code} — source absente : {rel}")
            continue
        n = _copy_files(src, PACKAGES / code)
        results.append((code, n))
        print(f"  {code:8} ← {rel} ({n} fichiers)")

    if with_fet:
        op_c = PACKAGES / "OP_C"
        if op_c.is_dir() and any(op_c.iterdir()):
            n = _copy_files(op_c, PACKAGES / "FET")
            results.append(("FET", n))
            print(f"  {'FET':8} ← OP_C (copie, {n} fichiers)")
        else:
            print("  SKIP FET — OP_C vide")

    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync Template/ → Packages/{TYPE}/")
    parser.add_argument("--no-fet", action="store_true", help="Ne pas générer FET depuis OP_C")
    args = parser.parse_args()

    print(f"Sync {TEMPLATE} → {PACKAGES}")
    results = sync(with_fet=not args.no_fet)
    total = sum(n for _, n in results)
    print(f"\nOK — {len(results)} type(s), {total} fichier(s).")
    print("Ensuite : docker compose exec catalog python /app/scripts/bootstrap_packages_db.py --force")
    return 0 if results else 1


if __name__ == "__main__":
    raise SystemExit(main())
