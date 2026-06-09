#!/usr/bin/env python3
"""Scan exhaustif de toutes les sections remplaçables — règles + NVIDIA."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGES = ROOT / "Packages"
OUT_JSON = ROOT / "docs" / "package-sections-full.json"
OUT_MD = ROOT / "docs" / "package-sections-catalog.md"

sys.path.insert(0, str(ROOT / "packages" / "tip-common"))

from tip_common.document_section_scanner import scan_document_sections  # noqa: E402
from tip_common.package_types import (  # noqa: E402
    ALL_PACKAGE_TYPES,
    PACKAGE_TYPE_SPECS,
    infer_document_type,
    package_file_order,
    template_day_index,
)

COPY_EXT = {".pdf", ".png", ".pptx", ".ppt"}


async def scan_file(path: Path, package_type: str, use_ai: bool) -> dict:
    role = infer_document_type(path.name)
    ext = path.suffix.lower()
    if ext in COPY_EXT:
        return {
            "filename": path.name,
            "package_type": package_type,
            "document_role": role,
            "day_index": template_day_index(path.name),
            "format": ext.lstrip("."),
            "action": "copie",
            "sections": [],
            "replacement_fields": [],
        }
    data = path.read_bytes()
    report = await scan_document_sections(
        filename=path.name,
        file_bytes=data,
        document_role=role,
        use_ai=use_ai and bool(os.getenv("NVIDIA_API_KEY")),
    )
    report["package_type"] = package_type
    report["day_index"] = template_day_index(path.name)
    report["format"] = ext.lstrip(".")
    return report


def _md_escape(s: str) -> str:
    return s.replace("|", "\\|").replace("\n", " ")[:120]


async def main() -> None:
    use_ai = os.getenv("USE_AI", "1") != "0"
    delay = float(os.getenv("SCAN_DELAY", "0.3"))
    all_reports: list[dict] = []

    for ptype in ALL_PACKAGE_TYPES:
        folder = PACKAGES / ptype
        if not folder.is_dir():
            continue
        spec = PACKAGE_TYPE_SPECS.get(ptype)
        files = sorted(
            [p for p in folder.iterdir() if p.is_file() and not p.name.startswith("~$")],
            key=lambda p: package_file_order(p.name),
        )
        print(f"\n=== {ptype} ({len(files)} fichiers) ===")
        for i, path in enumerate(files, 1):
            print(f"  [{i}/{len(files)}] {path.name}…", flush=True)
            try:
                report = await scan_file(path, ptype, use_ai)
                all_reports.append(report)
                n = report.get("replaceable_count") or len(report.get("replacement_fields") or [])
                print(f"       → {report.get('section_count', 0)} sections, {n} à remplacer ({report.get('classifier', '?')})")
            except Exception as exc:
                print(f"       ERR {exc}")
                all_reports.append({"filename": path.name, "package_type": ptype, "error": str(exc)})
            if delay and i < len(files):
                await asyncio.sleep(delay)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(all_reports, indent=2, ensure_ascii=False), encoding="utf-8")

    # Markdown catalogue
    lines = [
        "# Catalogue des sections à remplacer — tous documents AO",
        "",
        f"Généré par `scan_all_document_sections.py` — classifier IA : {'oui' if use_ai else 'non'}",
        "",
    ]
    for ptype in ALL_PACKAGE_TYPES:
        pkg_files = [r for r in all_reports if r.get("package_type") == ptype]
        if not pkg_files:
            continue
        spec = PACKAGE_TYPE_SPECS.get(ptype)
        lines.append(f"## {ptype} — {spec.label if spec else ptype} ({spec.duration_days if spec else '?'}j)")
        lines.append("")
        for rep in pkg_files:
            if rep.get("error"):
                lines.append(f"### ❌ {rep['filename']}")
                lines.append(f"- Erreur : {rep['error']}")
                lines.append("")
                continue
            if rep.get("action") == "copie":
                lines.append(f"### 📄 {rep['filename']} — **copie**")
                lines.append("")
                continue
            lines.append(f"### {rep['filename']} (`{rep.get('document_role')}`)")
            lines.append("")
            fields = rep.get("replacement_fields") or []
            if not fields:
                lines.append("_Aucune section détectée automatiquement — revue manuelle._")
                lines.append("")
                continue
            lines.append("| Section | Clé | Stratégie | Format IA |")
            lines.append("|---------|-----|-----------|-----------|")
            for f in fields:
                hint = f.get("format_hint") or f.get("note") or f.get("section_kind", "")
                lines.append(
                    f"| {_md_escape(f.get('sample', ''))} | `{f.get('context_key', '')}` | "
                    f"{f.get('strategy', '')} | {_md_escape(hint)} |"
                )
            lines.append("")

    OUT_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nJSON : {OUT_JSON}")
    print(f"MD   : {OUT_MD}")


if __name__ == "__main__":
    asyncio.run(main())
