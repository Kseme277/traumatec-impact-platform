#!/usr/bin/env python3
"""Remplace les variables de modèle AO dans un fichier local (test / prévisualisation).

Usage:
  python3 scripts/replace_template_variables.py fichier.docx --context event.json
  python3 scripts/replace_template_variables.py fichier.docx --list-placeholders
  python3 scripts/replace_template_variables.py fichier.docx -o sortie.docx

Le contexte JSON reprend les champs événement TIP (project_number, title, city, country,
start_date, responsible_person, …). À la génération, docgen utilise la même logique
(build_event_context + placeholders FR + analyse des champs).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [
    str(ROOT / "packages" / "tip-common"),
    str(ROOT / "services" / "docgen"),
]

from tip_common.variable_registry import build_variables_guide  # noqa: E402

_BRACE_RE = re.compile(r"\{\{[^{}]+\}\}|\[[A-Z_]+\]")


def _load_context(path: Path | None) -> dict:
    if path is None:
        return {
            "project_number": "702294",
            "title": "Séminaire AO Alliance—Information, Éducation et Communication (IEC)",
            "title_formatted": "Séminaire AO Alliance—Information, Éducation et Communication (IEC)",
            "city": "Kinshasa",
            "country": "Democratic Republic of the Congo",
            "start_date": "2026-12-31",
            "end_date": "2026-12-31",
            "date_single_formatted": "31 décembre 2026",
            "national_responsible_name": "Dominique Nkoa",
            "responsible_email": "contact@example.org",
            "responsible_phone": "+237 78515882",
        }
    return json.loads(path.read_text(encoding="utf-8"))


def _find_placeholders(data: bytes) -> list[str]:
    found: set[str] = set()
    for match in _BRACE_RE.finditer(data.decode("latin-1", errors="ignore")):
        found.add(match.group(0))
    for match in _BRACE_RE.finditer(data.decode("utf-8", errors="ignore")):
        found.add(match.group(0))
    try:
        text = data.decode("utf-16-le", errors="ignore")
        for match in _BRACE_RE.finditer(text):
            found.add(match.group(0))
    except UnicodeDecodeError:
        pass
    return sorted(found)


def _replace_docx(path: Path, context: dict) -> bytes:
    from app.services.docgen.template_render import build_event_context, render_package_document

    ctx = build_event_context(context)
    return render_package_document(
        path.read_bytes(),
        suffix=path.suffix,
        context=ctx,
        document_role="generic",
    )


def _replace_doc(path: Path, context: dict) -> bytes:
    from app.services.docgen.template_render import build_event_context, render_package_document

    ctx = build_event_context(context)
    return render_package_document(
        path.read_bytes(),
        suffix=path.suffix,
        context=ctx,
        document_role="programme",
    )


def _replace_xlsx(path: Path, context: dict) -> bytes:
    from app.services.docgen.template_render import build_event_context, render_package_document

    ctx = build_event_context(context)
    return render_package_document(
        path.read_bytes(),
        suffix=path.suffix,
        context=ctx,
        document_role="budget",
    )


def replace_file(path: Path, context: dict) -> bytes:
    suffix = path.suffix.lower()
    if suffix == ".docx":
        return _replace_docx(path, context)
    if suffix == ".doc":
        return _replace_doc(path, context)
    if suffix in {".xlsx", ".xls"}:
        return _replace_xlsx(path, context)
    raise SystemExit(f"Format non supporté : {suffix}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Remplace les variables AO dans un modèle local.")
    parser.add_argument("file", type=Path, nargs="?", help="Fichier modèle (.doc, .docx, .xlsx)")
    parser.add_argument("--context", type=Path, help="JSON événement TIP")
    parser.add_argument("-o", "--output", type=Path, help="Fichier de sortie")
    parser.add_argument("--list-placeholders", action="store_true", help="Liste les {{ … }} détectés")
    parser.add_argument("--list-guide", action="store_true", help="Affiche le registre des variables")
    args = parser.parse_args()

    if args.list_guide:
        guide = build_variables_guide(locale="fr")
        print("Variables reconnues à la génération :\n")
        for row in guide["variables"]:
            ph = row["primary_placeholder"]
            print(f"  {ph:40} → {row['label']} (ex. {row['example']})")
        print("\nNe pas remplacer :")
        for row in guide["keep_samples"]:
            print(f"  {row['sample']:40} — {row['label']}")
        return 0

    if not args.file or not args.file.is_file():
        print("Fichier introuvable — indiquez un modèle ou --list-guide", file=sys.stderr)
        return 1

    data = args.file.read_bytes()
    placeholders = _find_placeholders(data)
    if args.list_placeholders:
        if placeholders:
            print("Placeholders détectés :")
            for item in placeholders:
                print(f"  {item}")
        else:
            print("Aucun {{ … }} détecté — le fichier peut utiliser du texte surligné ou des exemples.")
        return 0

    context = _load_context(args.context)
    out = replace_file(args.file, context)
    dest = args.output or args.file.with_stem(args.file.stem + "_filled")
    dest.write_bytes(out)
    print(f"Écrit : {dest} ({len(out)} octets)")
    if placeholders:
        print(f"Placeholders vus dans le modèle : {len(placeholders)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
