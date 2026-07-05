#!/usr/bin/env python3
"""Test complet des remplacements du programme 02 (texte + logo PNG)."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [
    str(ROOT / "packages" / "tip-common"),
    str(ROOT / "services" / "docgen"),
]

from app.services.docgen.programme_doc_replace import apply_programme_doc_replacements  # noqa: E402

TEMPLATE = ROOT / "Template/Paquet_Sem/Paquet_Sem IEC/02_Modèle_Programme_IEC.doc"

CONTEXT = {
    "title": "Séminaire AO Alliance—Information, Éducation et Communication (IEC)",
    "title_formatted": "Séminaire AO Alliance—Information, Éducation et Communication (IEC)",
    "date_single_formatted": "31 décembre 2026",
    "city": "Kinshasa",
    "country": "Democratic Republic of the Congo",
}

EXPECTED_MIDDLE_SNIPPETS = (
    "Problématique de Prise en Charge des Fractures",
    "des agents de santé communautaire",
)
EXPECTED_ENDING = "à Kinshasa, République démocratique du Congo."


def main() -> int:
    if not TEMPLATE.is_file():
        print(f"MISSING template: {TEMPLATE}")
        return 1

    doc = TEMPLATE.read_bytes()
    png_before = doc.find(b"\x89PNG")
    out = apply_programme_doc_replacements(doc, CONTEXT)
    png_after = out.find(b"\x89PNG")

    checks: list[tuple[str, bool]] = [
        ("PNG preserved", png_before >= 0 and png_before == png_after),
        ("file size unchanged", len(out) == len(doc)),
        ("no placeholder {{Nom de l", "{{Nom de l".encode("utf-16-le") not in out),
        ("date filled", "31 d\xe9cembre 2026".encode("utf-16-le") in out),
    ]

    idx = out.find("Bienvenue au séminaire ".encode("utf-16-le"))
    if idx >= 0:
        chunk = out[idx : idx + 800].decode("utf-16-le")
        end = chunk.find("\r\r")
        welcome = chunk[:end] if end > 0 else chunk
        checks.append(("welcome paragraph built", "Bienvenue au séminaire" in welcome))
        for snippet in EXPECTED_MIDDLE_SNIPPETS:
            checks.append((f"welcome contains {snippet!r}", snippet in welcome))
        checks.append((f"welcome ending {EXPECTED_ENDING!r}", EXPECTED_ENDING in welcome))
        checks.append(("no Prob. abbreviation", "Prob." not in welcome))
        checks.append(("communautaire not truncated to comm", "communautaire" in welcome))
    else:
        welcome = None
        checks.append(("welcome paragraph built", False))

    failed = [name for name, ok in checks if not ok]
    for name, ok in checks:
        print(f"{'OK' if ok else 'FAIL'}: {name}")

    if welcome:
        print("\nWelcome paragraph:")
        print(repr(welcome))

    if failed:
        print(f"\n{len(failed)} check(s) failed.")
        return 1

    print("\nAll checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
