#!/usr/bin/env python3
"""
Audit fichier par fichier de chaque type de paquet AO Alliance.
Extrait les zones à remplacer (surlignages, TBD, placeholders) et mappe les clés événement.
"""

from __future__ import annotations

import asyncio
import json
import re
import sys
import zipfile
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PACKAGES = ROOT / "Packages"
OUT = ROOT / "docs" / "package-replacement-audit.json"

sys.path.insert(0, str(ROOT / "packages" / "tip-common"))

from tip_common.package_types import (  # noqa: E402
    ALL_PACKAGE_TYPES,
    PACKAGE_TYPE_SPECS,
    infer_document_type,
    package_file_order,
)
from tip_common.template_field_analyzer import (  # noqa: E402
    _extract_docx_text_samples,
    _extract_xlsx_text_samples,
    _rules_analyze,
)

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

ROLE_LABELS = {
    "accord_collaboration": "Accord collaboration responsable national",
    "programme": "Programme / agenda séminaire ou cours",
    "budget": "Budget prévisionnel",
    "coordonnees_bancaires": "Coordonnées bancaires",
    "evaluation": "Évaluation en ligne (PDF — copie)",
    "rapport_national": "Rapport responsable national",
    "presence_enseignants": "Liste présence enseignants",
    "presence_participants": "Liste présence participants",
    "liste_definitive": "Liste définitive enseignants + participants",
    "accuse_paiement": "Accusé réception paiement espèces",
    "rapport_depenses": "Report dépenses / vérification budget",
    "guide_utilisateur": "Guide utilisateur (PDF — copie)",
    "logo": "Logo AO Alliance (image — copie)",
    "badge": "Modèle badge",
    "presentation": "Présentation PPT (copie)",
    "pdf": "PDF",
    "image": "Image",
    "spreadsheet": "Tableur",
    "autre": "Autre",
}

COPY_ONLY_ROLES = {"evaluation", "guide_utilisateur", "logo", "presentation", "pdf", "image"}


def _extract_all_highlights(docx_bytes: bytes, *, limit: int = 20) -> list[str]:
    samples: list[str] = []
    try:
        with zipfile.ZipFile(BytesIO(docx_bytes)) as zf:
            if "word/document.xml" not in zf.namelist():
                return samples
            root = ET.fromstring(zf.read("word/document.xml"))
    except (zipfile.BadZipFile, ET.ParseError):
        return samples

    for paragraph in root.iter(f"{{{W_NS}}}p"):
        texts: list[str] = []
        highlighted = False
        for run in paragraph.iter(f"{{{W_NS}}}r"):
            rpr = run.find(f"{{{W_NS}}}rPr")
            if rpr is not None and rpr.find(f"{{{W_NS}}}highlight") is not None:
                highlighted = True
            node = run.find(f"{{{W_NS}}}t")
            if node is not None and node.text:
                texts.append(node.text)
        line = "".join(texts).strip()
        if highlighted and line and line not in samples:
            samples.append(line[:300])
        if len(samples) >= limit:
            break
    return samples


def _scan_doc_binary(data: bytes) -> list[str]:
    found: list[str] = []
    for token in (
        "TBD",
        "Zurich",
        "[PROJECT_NUMBER]",
        "[EVENT_TITLE]",
        "[CITY]",
        "[COUNTRY]",
        "[START_DATE]",
        "[END_DATE]",
        "[RESPONSIBLE]",
        "{{ project_number }}",
        "{{ title }}",
        "{{ city }}",
        "Prénom Nom",
        "adresse@email",
    ):
        if token.encode() in data or token.lower().encode() in data.lower():
            found.append(token)
    return found


def _deep_samples(path: Path, data: bytes) -> list[str]:
    ext = path.suffix.lower()
    samples: list[str] = []
    if ext == ".docx":
        samples.extend(_extract_all_highlights(data))
        samples.extend(_extract_docx_text_samples(data, limit=15))
    elif ext == ".xlsx":
        samples.extend(_extract_xlsx_text_samples(data, limit=20))
    elif ext == ".doc":
        samples.extend(_scan_doc_binary(data))
    # dédupliquer
    out: list[str] = []
    for s in samples:
        s = s.strip()
        if s and s not in out:
            out.append(s)
    return out


def _action_for_role(role: str, ext: str) -> str:
    if role in COPY_ONLY_ROLES:
        return "copie"
    if ext in {".png", ".pdf", ".pptx", ".ppt"}:
        return "copie"
    if role in {"presence_enseignants", "presence_participants", "liste_definitive"}:
        return "remplacer_dates_lieu + conserver_noms"
    if role == "programme":
        return "remplacer_complet (dates, lieu, titre, responsable)"
    if role in {"accord_collaboration", "budget", "rapport_national", "rapport_depenses"}:
        return "remplacer_projet_dates_lieu"
    if role in {"coordonnees_bancaires", "accuse_paiement", "badge"}:
        return "remplacer_projet_lieu"
    if ext in {".docx", ".doc", ".xlsx"}:
        return "remplacer_si_detecte"
    return "copie"


async def audit_file(package_type: str, path: Path) -> dict:
    data = path.read_bytes()
    role = infer_document_type(path.name)
    samples = _deep_samples(path, data)
    fields = _rules_analyze(samples, path.name) if samples else []

    day_match = re.search(r"jour\s*(\d)", path.name, re.I)
    return {
        "filename": path.name,
        "document_role": role,
        "role_label": ROLE_LABELS.get(role, role),
        "day_index": int(day_match.group(1)) if day_match else None,
        "format": path.suffix.lower().lstrip("."),
        "size_kb": round(len(data) / 1024, 1),
        "action": _action_for_role(role, path.suffix.lower()),
        "samples_found": samples,
        "replacement_fields": fields,
        "field_count": len(fields),
    }


async def audit_package_type(package_type: str) -> dict:
    folder = PACKAGES / package_type
    if not folder.is_dir():
        return {"package_type": package_type, "error": "dossier absent", "files": []}

    spec = PACKAGE_TYPE_SPECS.get(package_type)
    files_sorted = sorted(
        [p for p in folder.iterdir() if p.is_file() and not p.name.startswith("~$")],
        key=lambda p: package_file_order(p.name),
    )
    audited = []
    for path in files_sorted:
        audited.append(await audit_file(package_type, path))

    replaceable = [f for f in audited if f["action"] != "copie"]
    return {
        "package_type": package_type,
        "label": spec.label if spec else package_type,
        "duration_days": spec.duration_days if spec else None,
        "preparation_theme": spec.preparation_theme if spec else None,
        "file_count": len(audited),
        "replaceable_count": len(replaceable),
        "files": audited,
    }


async def main() -> None:
    report = {
        "summary": {},
        "packages": [],
    }
    for ptype in ALL_PACKAGE_TYPES:
        pkg = await audit_package_type(ptype)
        report["packages"].append(pkg)
        report["summary"][ptype] = {
            "files": pkg["file_count"],
            "replaceable": pkg["replaceable_count"],
        }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Audit écrit : {OUT}")
    for pkg in report["packages"]:
        print(
            f"  {pkg['package_type']:8} — {pkg['file_count']} fichiers, "
            f"{pkg['replaceable_count']} à personnaliser"
        )


if __name__ == "__main__":
    asyncio.run(main())
