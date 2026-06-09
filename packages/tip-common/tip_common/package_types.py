"""Types de paquets AO Alliance et détection depuis dossiers / événements."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import date
from pathlib import Path

PACKAGE_TYPE_ORP_S = "ORP_S"
PACKAGE_TYPE_OP_C = "OP_C"
PACKAGE_TYPE_ORP_C = "ORP_C"
PACKAGE_TYPE_IEC_S = "IEC_S"
PACKAGE_TYPE_NONOP_C = "NONOP_C"

ALL_PACKAGE_TYPES = (
    PACKAGE_TYPE_ORP_S,
    PACKAGE_TYPE_OP_C,
    PACKAGE_TYPE_ORP_C,
    PACKAGE_TYPE_IEC_S,
    PACKAGE_TYPE_NONOP_C,
)


ACTIVITY_COURS = "cours"
ACTIVITY_SEMINAIRE = "seminaire"

# « Événement » = instance TIP (projet, dates, lieu). « Cours » / « Séminaire » = format AO du paquet.


@dataclass(frozen=True)
class PackageTypeSpec:
    code: str
    label: str
    activity_kind: str
    activity_label: str
    title: str
    description: str
    preparation_theme: str
    duration_days: int
    aliases: tuple[str, ...]


PACKAGE_TYPE_SPECS: dict[str, PackageTypeSpec] = {
    PACKAGE_TYPE_ORP_S: PackageTypeSpec(
        code=PACKAGE_TYPE_ORP_S,
        label="ORP S",
        activity_kind=ACTIVITY_SEMINAIRE,
        activity_label="Séminaire",
        title="Séminaire ORP — PBO (1 jour)",
        description="Séminaire salle opératoire PBO, format court (1 journée). Programme type PBO.",
        preparation_theme="pbo",
        duration_days=1,
        aliases=("orp s", "orp-s", "orp_s", "seminaire orp", "seminaire pbo"),
    ),
    PACKAGE_TYPE_ORP_C: PackageTypeSpec(
        code=PACKAGE_TYPE_ORP_C,
        label="ORP C",
        activity_kind=ACTIVITY_COURS,
        activity_label="Cours",
        title="Cours ORP — PBO (3 jours)",
        description="Cours AO Alliance PBO sur plusieurs jours (listes de présence J1–J3).",
        preparation_theme="pbo",
        duration_days=3,
        aliases=("orp c", "orp-c", "orp_c", "cours orp", "cours pbo"),
    ),
    PACKAGE_TYPE_OP_C: PackageTypeSpec(
        code=PACKAGE_TYPE_OP_C,
        label="Op C",
        activity_kind=ACTIVITY_COURS,
        activity_label="Cours",
        title="Cours opératoire — Op C (3 jours)",
        description="Cours AO Alliance en bloc opératoire (traitement chirurgical des fractures).",
        preparation_theme="operatory",
        duration_days=3,
        aliases=("op c", "operatory course", "cours operatoire", "cours op", "operatoire"),
    ),
    PACKAGE_TYPE_NONOP_C: PackageTypeSpec(
        code=PACKAGE_TYPE_NONOP_C,
        label="NonOp C",
        activity_kind=ACTIVITY_COURS,
        activity_label="Cours",
        title="Cours non opératoire — NonOp C (3 jours)",
        description="Cours AO Alliance hors bloc (traitement non opératoire des fractures).",
        preparation_theme="operatory",
        duration_days=3,
        aliases=("nonop c", "non-op c", "non op c", "nonoperatory", "cours non op"),
    ),
    PACKAGE_TYPE_IEC_S: PackageTypeSpec(
        code=PACKAGE_TYPE_IEC_S,
        label="IEC S",
        activity_kind=ACTIVITY_SEMINAIRE,
        activity_label="Séminaire",
        title="Séminaire IEC — IEC S (1 jour)",
        description="Séminaire IEC (éducation continue), format court (1 journée).",
        preparation_theme="iec",
        duration_days=1,
        aliases=("iec s", "iec-s", "iec_s", "seminaire iec", "iec seminar"),
    ),
}


def list_package_types_by_activity() -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {ACTIVITY_COURS: [], ACTIVITY_SEMINAIRE: []}
    for code in ALL_PACKAGE_TYPES:
        spec = PACKAGE_TYPE_SPECS[code]
        grouped[spec.activity_kind].append(
            {
                "code": spec.code,
                "label": spec.label,
                "activity_kind": spec.activity_kind,
                "activity_label": spec.activity_label,
                "title": spec.title,
                "description": spec.description,
                "preparation_theme": spec.preparation_theme,
                "duration_days": spec.duration_days,
            }
        )
    return grouped


def package_type_public_dict(code: str) -> dict | None:
    spec = PACKAGE_TYPE_SPECS.get(code)
    if spec is None:
        return None
    return {
        "code": spec.code,
        "label": spec.label,
        "activity_kind": spec.activity_kind,
        "activity_label": spec.activity_label,
        "title": spec.title,
        "description": spec.description,
        "preparation_theme": spec.preparation_theme,
        "duration_days": spec.duration_days,
    }


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def _norm(value: str | None) -> str:
    if not value:
        return ""
    return _strip_accents(str(value).strip().lower())


def _event_duration_days(start: str | date | None, end: str | date | None) -> int:
    if not start:
        return 1
    start_d = date.fromisoformat(str(start)[:10])
    end_d = date.fromisoformat(str(end or start)[:10])
    return max(1, (end_d - start_d).days + 1)


def _programme_file(files: list[Path]) -> Path | None:
    for path in sorted(files):
        if path.is_file() and path.name.lower().startswith("02_"):
            return path
    return None


def detect_package_type_from_folder(folder_name: str, files: list[Path]) -> str | None:
    """Déduit le type de paquet depuis le nom du dossier et le fichier programme (02_*)."""
    label = _norm(folder_name).replace("_", " ")
    for code, spec in PACKAGE_TYPE_SPECS.items():
        if _norm(spec.label) in label or any(alias in label for alias in spec.aliases):
            return code
        if code.lower().replace("_", " ") in label:
            return code

    programme = _programme_file(files)
    if programme is None:
        return None

    stem = _norm(programme.stem)
    if "iec" in stem:
        return PACKAGE_TYPE_IEC_S
    if "nonp" in stem or "nonop" in stem:
        return PACKAGE_TYPE_NONOP_C
    if "op c" in stem or "opc" in stem.replace(" ", ""):
        return PACKAGE_TYPE_OP_C
    if "orp c" in stem:
        return PACKAGE_TYPE_ORP_C
    if "pbo" in stem:
        dates_match = re.search(r"package_(\d{4}(?:-\d{2})?)", _norm(folder_name))
        if dates_match and "-" in dates_match.group(1):
            return PACKAGE_TYPE_ORP_C
        return PACKAGE_TYPE_ORP_S
    return None


def infer_preparation_theme_for_event(
    *,
    event_type: str | None,
    title: str | None = None,
) -> str | None:
    """Déduit le thème TIP (pbo / operatory / iec) depuis l'activité et le titre."""
    combined = _norm(f"{event_type or ''} {title or ''}")
    if not combined.strip():
        return None

    if any(
        kw in combined
        for kw in (
            "iec",
            "information education communication",
            "education communication",
            "seminaire iec",
            "seminar iec",
        )
    ):
        return "iec"
    if any(
        kw in combined
        for kw in (
            "orp s",
            "orp c",
            "orp",
            "pbo",
            "operating room",
            "salle op",
            "seminaire orp",
            "seminaire pbo",
        )
    ):
        return "pbo"
    if any(
        kw in combined
        for kw in (
            "nonop",
            "non-op",
            "non op",
            "nonoperatory",
            "cours non",
        )
    ):
        return "operatory"
    if any(
        kw in combined
        for kw in (
            "operatory",
            "operatoire",
            "op c",
            "cmf",
            "fracture",
            "cours op",
        )
    ):
        return "operatory"

    activity = _norm(event_type)
    if activity in ("seminar", "seminaire", "seminaire d'information", "activity"):
        if "iec" in combined or "communication" in combined:
            return "iec"
        if "orp" in combined or "pbo" in combined:
            return "pbo"
    return None


def infer_package_type_for_event(
    *,
    preparation_theme: str | None,
    event_type: str | None,
    title: str | None = None,
    start_date: str | date | None = None,
    end_date: str | date | None = None,
) -> str | None:
    """Associe un événement TIP au modèle de paquet le plus probable."""
    text = _norm(f"{event_type or ''} {title or ''}")
    # Ordre important : NONOP_C avant OP_C (« op c » est contenu dans « nonop c »).
    for code in (
        PACKAGE_TYPE_NONOP_C,
        PACKAGE_TYPE_ORP_C,
        PACKAGE_TYPE_ORP_S,
        PACKAGE_TYPE_OP_C,
        PACKAGE_TYPE_IEC_S,
    ):
        spec = PACKAGE_TYPE_SPECS[code]
        if any(alias in text for alias in spec.aliases):
            return code
        if _norm(spec.label) in text:
            return code

    theme = _norm(preparation_theme) or infer_preparation_theme_for_event(
        event_type=event_type,
        title=title,
    )
    days = _event_duration_days(start_date, end_date)
    if theme == "iec":
        return PACKAGE_TYPE_IEC_S
    if theme == "pbo":
        return PACKAGE_TYPE_ORP_C if days >= 2 else PACKAGE_TYPE_ORP_S
    if theme == "operatory":
        if any(x in text for x in ("nonop", "non-op", "non op", "nonoperatory")):
            return PACKAGE_TYPE_NONOP_C
        return PACKAGE_TYPE_OP_C

    activity = _norm(event_type)
    if activity in ("seminar", "seminaire", "seminaire d'information"):
        return PACKAGE_TYPE_IEC_S if days <= 1 else PACKAGE_TYPE_ORP_C
    if activity in ("course", "cours"):
        return PACKAGE_TYPE_OP_C if days >= 2 else PACKAGE_TYPE_ORP_S
    return None


def describe_inferred_event_package(
    *,
    preparation_theme: str | None,
    event_type: str | None,
    title: str | None = None,
    start_date: str | date | None = None,
    end_date: str | date | None = None,
) -> dict | None:
    """Résumé paquet + thème inférés pour l'UI et la génération."""
    theme = preparation_theme or infer_preparation_theme_for_event(
        event_type=event_type,
        title=title,
    )
    package_type = infer_package_type_for_event(
        preparation_theme=theme,
        event_type=event_type,
        title=title,
        start_date=start_date,
        end_date=end_date,
    )
    if not package_type:
        return None
    spec = PACKAGE_TYPE_SPECS[package_type]
    return {
        "package_type": package_type,
        "package_label": spec.label,
        "activity_kind": spec.activity_kind,
        "activity_label": spec.activity_label,
        "preparation_theme": theme,
        "duration_days": _event_duration_days(start_date, end_date),
        "expected_package_days": spec.duration_days,
        "classifier": "rules",
    }


_DAY_FILE_RE = re.compile(r"jour\s*[_\s]*(\d)", re.IGNORECASE)


def template_day_index(filename: str) -> int | None:
    """Extrait le numéro de jour d'un fichier paquet (07b → 2, 08a → 1)."""
    match = _DAY_FILE_RE.search(filename)
    if not match:
        return None
    return int(match.group(1))


def filter_templates_by_package_duration(
    templates: list[dict],
    *,
    package_type: str | None = None,
    max_days: int | None = None,
) -> list[dict]:
    """
    Ne conserve que les fichiers adaptés à la durée du paquet.
    Séminaire 1j (IEC_S, ORP_S) : uniquement Jour 1 — pas de 07b/07c/08b/08c.
    """
    if max_days is None and package_type and package_type in PACKAGE_TYPE_SPECS:
        max_days = PACKAGE_TYPE_SPECS[package_type].duration_days
    if not max_days or max_days >= 3:
        return templates

    filtered: list[dict] = []
    for tpl in templates:
        label = str(tpl.get("name") or tpl.get("file_path") or "")
        day = template_day_index(label)
        if day is not None and day > max_days:
            continue
        filtered.append(tpl)
    return filtered


def package_file_order(filename: str) -> tuple[int, str]:
    """Tri naturel des fichiers paquet (01_, 07a_, …)."""
    match = re.match(r"^(\d+)([a-z])?", filename, re.IGNORECASE)
    if not match:
        return (999, filename.lower())
    major = int(match.group(1))
    minor = match.group(2) or ""
    return (major, minor.lower())


def infer_document_type(filename: str) -> str:
    lower = filename.lower()
    if lower.startswith("01_"):
        return "accord_collaboration"
    if lower.startswith("02_"):
        return "programme"
    if lower.startswith("03_"):
        return "budget"
    if lower.startswith("04_"):
        return "coordonnees_bancaires"
    if lower.startswith("05_"):
        return "evaluation"
    if lower.startswith("06_"):
        return "rapport_national"
    if lower.startswith("07"):
        return "presence_enseignants"
    if lower.startswith("08"):
        return "presence_participants"
    if lower.startswith("09_"):
        return "liste_definitive"
    if lower.startswith("10_"):
        return "accuse_paiement"
    if lower.startswith("11_"):
        return "rapport_depenses"
    if lower.startswith("12_"):
        return "guide_utilisateur"
    if lower.startswith("13"):
        return "logo"
    if lower.startswith("14_"):
        return "badge"
    if lower.startswith("15_"):
        return "presentation"
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return "pdf"
    if ext in {".png", ".jpg", ".jpeg"}:
        return "image"
    if ext in {".xlsx", ".xls"}:
        return "spreadsheet"
    if ext in {".pptx", ".ppt"}:
        return "presentation"
    return "autre"
