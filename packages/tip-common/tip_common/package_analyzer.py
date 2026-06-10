"""Analyse d'un paquet AO (fichiers ZIP) : classification et indices de remplacement."""

from __future__ import annotations

import re
import zipfile
from dataclasses import asdict, dataclass, field
from io import BytesIO
from pathlib import PurePosixPath
from typing import Any
from xml.etree import ElementTree as ET

from tip_common.package_types import (
    PACKAGE_TYPE_SPECS,
    detect_package_type_from_folder,
    infer_document_type,
    normalize_package_type,
    package_file_order,
    package_type_public_dict,
)

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

DATE_RANGE_RE = re.compile(r"\d{2}\s*[–-]\s*\d{2}\s+\w+", re.I)
WEEKDAY_RE = re.compile(r"^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b", re.I)
HOTEL_RE = re.compile(r"h[oô]tel|h[oô]pital", re.I)
PLACEHOLDER_NAME_RE = re.compile(r"pr[eé]nom\s*/?\s*nom", re.I)


@dataclass
class AnalyzedFile:
    filename: str
    document_role: str
    order: int
    replaceable: bool
    file_format: str
    size_bytes: int
    highlight_samples: list[str] = field(default_factory=list)


@dataclass
class PackageAnalysis:
    package_type: str
    event_type_label: str
    activity_kind: str
    activity_label: str
    preparation_theme: str
    confidence: float
    files: list[AnalyzedFile]
    replacement_model: dict[str, Any]
    detected_from: str

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["files"] = [asdict(f) for f in self.files]
        data["type_info"] = package_type_public_dict(self.package_type)
        return data


def _extract_highlighted_text(docx_bytes: bytes, *, limit: int = 8) -> list[str]:
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
        if highlighted:
            line = "".join(texts).strip()
            if line and line not in samples:
                samples.append(line[:200])
        if len(samples) >= limit:
            break
    return samples


def _classify_highlight_pattern(text: str) -> str | None:
    if DATE_RANGE_RE.search(text):
        return "date_range"
    if WEEKDAY_RE.match(text):
        return "weekday_date"
    if HOTEL_RE.search(text):
        return "hotel_line"
    if PLACEHOLDER_NAME_RE.search(text):
        return "participant_name"
    if "adresse@email" in text.lower():
        return "contact_placeholder"
    return None


def _build_replacement_model(files: list[AnalyzedFile]) -> dict[str, Any]:
    model: dict[str, dict[str, Any]] = {}
    for analyzed in files:
        for sample in analyzed.highlight_samples:
            kind = _classify_highlight_pattern(sample)
            if not kind:
                continue
            entry = model.setdefault(
                kind,
                {"variable": _variable_for_kind(kind), "samples": [], "keep_original": kind == "participant_name"},
            )
            if sample not in entry["samples"]:
                entry["samples"].append(sample)
    return model


def _variable_for_kind(kind: str) -> str:
    return {
        "date_range": "date_range_fr",
        "weekday_date": "weekday_date_fr",
        "hotel_line": "lieu",
        "participant_name": "participant_name",
        "contact_placeholder": "contact_placeholder",
    }.get(kind, kind)


def extract_zip_entries(zip_bytes: bytes) -> list[tuple[str, bytes]]:
    """Extrait les fichiers du ZIP (racine ou un seul sous-dossier)."""
    with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
        names = [
            info.filename
            for info in zf.infolist()
            if not info.is_dir()
            and not info.filename.startswith("__MACOSX")
            and "/." not in info.filename
            and not PurePosixPath(info.filename).name.startswith("~$")
            and not PurePosixPath(info.filename).name.startswith(".")
        ]
        if not names:
            raise ValueError("ZIP vide ou sans fichiers utilisables.")

        prefixes = {n.split("/")[0] for n in names if "/" in n}
        strip_prefix = ""
        if len(prefixes) == 1 and all("/" in n for n in names):
            strip_prefix = f"{next(iter(prefixes))}/"

        entries: list[tuple[str, bytes]] = []
        for name in names:
            if strip_prefix and not name.startswith(strip_prefix):
                continue
            arcname = name[len(strip_prefix) :] if strip_prefix else name
            if "/" in arcname:
                continue
            data = zf.read(name)
            if data:
                entries.append((arcname, data))
        if not entries:
            raise ValueError("ZIP sans fichiers à la racine du paquet.")
        return entries


def analyze_package_zip(
    zip_bytes: bytes,
    *,
    source_name: str = "paquet.zip",
    package_type_hint: str | None = None,
) -> tuple[PackageAnalysis, list[tuple[str, bytes]]]:
    entries = extract_zip_entries(zip_bytes)
    from pathlib import Path

    pseudo_paths = [Path(name) for name, _ in entries]
    zip_stem = PurePosixPath(source_name).stem.upper().replace("-", "_")
    detected_type = package_type_hint
    if not detected_type and zip_stem in PACKAGE_TYPE_SPECS:
        detected_type = zip_stem
    if not detected_type:
        detected_type = detect_package_type_from_folder(
            PurePosixPath(source_name).stem,
            pseudo_paths,
        )
    if not detected_type:
        programme = next((n for n, _ in entries if n.lower().startswith("02_")), None)
        raise ValueError(
            "Type de paquet non reconnu. Nommez le ZIP ou incluez un fichier 02_* programme reconnu "
            f"(programme trouvé : {programme or 'aucun'})."
        )

    detected_type = normalize_package_type(detected_type) or detected_type
    spec = PACKAGE_TYPE_SPECS[detected_type]
    analyzed_files: list[AnalyzedFile] = []
    for index, (filename, data) in enumerate(
        sorted(entries, key=lambda item: package_file_order(item[0])),
        start=1,
    ):
        ext = PurePosixPath(filename).suffix.lower()
        highlights: list[str] = []
        if ext == ".docx":
            highlights = _extract_highlighted_text(data)
        analyzed_files.append(
            AnalyzedFile(
                filename=filename,
                document_role=infer_document_type(filename),
                order=index,
                replaceable=ext in {".docx", ".doc", ".xlsx"},
                file_format=ext.lstrip("."),
                size_bytes=len(data),
                highlight_samples=highlights,
            )
        )

    confidence = 0.95 if package_type_hint else 0.85
    if any(f.document_role == "programme" for f in analyzed_files):
        confidence = min(0.99, confidence + 0.05)

    analysis = PackageAnalysis(
        package_type=detected_type,
        event_type_label=spec.label,
        activity_kind=spec.activity_kind,
        activity_label=spec.activity_label,
        preparation_theme=spec.preparation_theme,
        confidence=round(confidence, 2),
        files=analyzed_files,
        replacement_model=_build_replacement_model(analyzed_files),
        detected_from=source_name,
    )
    return analysis, entries
