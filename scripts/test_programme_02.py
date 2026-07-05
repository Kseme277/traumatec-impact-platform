#!/usr/bin/env python3
"""Test des remplacements programme 02 et listes de présence 07a/08a."""

from __future__ import annotations

import sys
import zipfile
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path[:0] = [
    str(ROOT / "packages" / "tip-common"),
    str(ROOT / "services" / "docgen"),
]

from app.services.docgen.programme_doc_replace import apply_programme_doc_replacements  # noqa: E402
from app.services.docgen.template_render import build_event_context, render_package_document  # noqa: E402
from app.services.docgen.docx_xml_replace import _paragraph_text  # noqa: E402

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
TEMPLATE_DIR = ROOT / "Template/Paquet_Sem/Paquet_Sem IEC"

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
FULL_COUNTRY = "République démocratique du Congo"
FULL_TITLE = CONTEXT["title_formatted"]


def _ens3_binary_tail_preserved(original: bytes, generated: bytes) -> bool:
    marker = "Ens. 3".encode("utf-16-le")
    idx = original.find(marker)
    if idx < 0:
        return True
    # Conserver le binaire Word après les ~80 premiers octets du placeholder Ens. 3
    tail_start = idx + 80
    tail_end = idx + 580
    return original[tail_start:tail_end] == generated[tail_start:tail_end]


def _header_lines(docx_bytes: bytes) -> list[str]:
    lines: list[str] = []
    with zipfile.ZipFile(BytesIO(docx_bytes)) as zf:
        for name in sorted(zf.namelist()):
            if "header" in name and name.endswith(".xml"):
                root = ET.fromstring(zf.read(name))
                for paragraph in root.iter(f"{{{W_NS}}}p"):
                    text = _paragraph_text(paragraph).strip()
                    if text:
                        lines.append(text)
    return lines


def test_programme_02() -> list[tuple[str, bool]]:
    template = TEMPLATE_DIR / "02_Modèle_Programme_IEC.doc"
    if not template.is_file():
        return [("02 template exists", False)]

    doc = template.read_bytes()
    png_before = doc.find(b"\x89PNG")
    out = apply_programme_doc_replacements(doc, CONTEXT)
    png_after = out.find(b"\x89PNG")

    checks: list[tuple[str, bool]] = [
        ("02 PNG preserved", png_before >= 0 and png_before == png_after),
        ("02 file size unchanged", len(out) == len(doc)),
        ("02 no placeholder {{Nom de l", "{{Nom de l".encode("utf-16-le") not in out),
        ("02 date filled", "31 d\xe9cembre 2026".encode("utf-16-le") in out),
        (
            "02 header full country",
            "République démocratique du Congo".encode("utf-16-le") in out
            and b"R\xe9publique d\xe9m.\x00" not in out,
        ),
        (
            "02 ens3 binary tail preserved",
            _ens3_binary_tail_preserved(doc, out),
        ),
        (
            "02 page-1 title complete",
            "Information, \xc9ducation et Communication (IEC)".encode("utf-16-le") in out,
        ),
        (
            "02 header zone not corrupted",
            sum(
                1
                for i in range(1564000, min(1565400, len(doc), len(out)))
                if doc[i] != out[i]
            )
            < 200,
        ),
    ]

    idx = out.find("Bienvenue au séminaire ".encode("utf-16-le"))
    if idx >= 0:
        chunk = out[idx : idx + 800].decode("utf-16-le")
        end = chunk.find("\r\r")
        welcome = chunk[:end] if end > 0 else chunk
        checks.append(("02 welcome paragraph built", "Bienvenue au séminaire" in welcome))
        for snippet in EXPECTED_MIDDLE_SNIPPETS:
            checks.append((f"02 welcome contains {snippet!r}", snippet in welcome))
        checks.append((f"02 welcome ending {EXPECTED_ENDING!r}", EXPECTED_ENDING in welcome))
        checks.append(("02 no Prob. abbreviation", "Prob." not in welcome))
        checks.append(("02 communautaire not truncated", "communautaire" in welcome))
    else:
        checks.append(("02 welcome paragraph built", False))

    teacher_names = [
        "Albert Désiré Atangana Fouda",
        "Saouwada Paul Beme appolinaire",
        "Marie Virginie Edu mengue",
    ]
    out_teachers = apply_programme_doc_replacements(
        doc,
        {**CONTEXT, "teacher_names": teacher_names},
    )
    sec_start = out_teachers.find("Enseignants nationaux".encode("utf-16-le"))
    sec_end = out_teachers.find("Organisation du séminaire".encode("utf-16-le"))
    if sec_start >= 0 and sec_end > sec_start:
        section = out_teachers[sec_start:sec_end].decode("utf-16-le", errors="replace")
        lines = [
            line.strip().lstrip("\x0e")
            for line in section.split("\r")
            if line.strip() and "Enseignants nationaux" not in line
        ]
        checks.append(
            (
                "02 teachers one per line",
                all(name.encode("utf-16-le") in out_teachers for name in teacher_names),
            )
        )
        checks.append(
            ("02 teachers no dual column row",
             not any(
                 sum(1 for name in teacher_names if name.split()[0] in line) >= 2
                 for line in lines
             )),
        )
        checks.append(
            ("02 teachers no column breaks", b"\x0e\x00" not in out_teachers[sec_start:sec_end]),
        )
    else:
        checks.append(("02 teachers one per line", False))

    ctx_full = {
        **CONTEXT,
        "start_date": "2026-12-31",
        "teacher_names": teacher_names,
        "national_responsible_name": "Dominique Nkoa",
        "responsible_email": "contact@example.com",
        "responsible_phone": "+237 78515882",
    }
    out_full = apply_programme_doc_replacements(doc, ctx_full)
    table_start = out_full.find("Modérateur".encode("utf-16-le"))
    if table_start >= 0:
        table_chunk = out_full[table_start : table_start + 12000]
        checks.append(
            (
                "02 schedule keeps Prénom Nom",
                table_chunk.count("Prénom Nom".encode("utf-16-le")) >= 10,
            )
        )
        checks.append(
            (
                "02 schedule weekday date updated",
                "Mardi 04 avril 2023".encode("utf-16-le") not in out_full
                and "2026".encode("utf-16-le") in out_full[table_start : table_start + 12000],
            )
        )
    checks.append(
        (
            "02 contact keeps table names clean",
            out_full.find("Dominique NkCourriel".encode("utf-16-le")) < 0,
        )
    )

    return checks


def test_presence(template_name: str, role: str) -> list[tuple[str, bool]]:
    template = TEMPLATE_DIR / template_name
    if not template.is_file():
        return [(f"{template_name} exists", False)]

    ctx = build_event_context({**CONTEXT, "package_duration_days": 1})
    bad_fields = [
        {
            "sample": "{{Nom de L\u2019évenement}}",
            "context_key": "city",
            "strategy": "replace",
            "section_kind": "placeholder",
        },
        {
            "sample": "{{Ville}}, {{Pays}}  {{Date de l\u2019évenement}}",
            "context_key": "city",
            "strategy": "replace",
            "section_kind": "date_lieu_combined",
        },
    ]
    out = render_package_document(
        template.read_bytes(),
        suffix=".docx",
        context=ctx,
        replacement_fields=bad_fields,
        document_role=role,
        day_index=1,
    )
    lines = _header_lines(out)
    title_lines = [line for line in lines if line.startswith("Séminaire") or "Information" in line]
    lieu_lines = [line for line in lines if FULL_COUNTRY in line or "Kinshasa" in line]

    return [
        (f"{template_name} title not city", not any(line == ctx["city"] for line in title_lines)),
        (f"{template_name} full title", any(FULL_TITLE in line for line in lines)),
        (f"{template_name} full country", any(FULL_COUNTRY in line for line in lieu_lines)),
        (f"{template_name} no double city header", lines.count(ctx["city"]) < 2),
    ]


def main() -> int:
    checks = test_programme_02()
    checks.extend(test_presence("08a_Liste de présence Participants_Jour 1.docx", "presence_participants"))
    checks.extend(test_presence("07a_ Liste de présence d' Enseignants_Jour 1.docx", "presence_enseignants"))

    failed = [name for name, ok in checks if not ok]
    for name, ok in checks:
        print(f"{'OK' if ok else 'FAIL'}: {name}")

    if failed:
        print(f"\n{len(failed)} check(s) failed.")
        return 1

    print("\nAll checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
