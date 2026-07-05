"""Types de paquets AO Alliance et détection depuis dossiers / événements."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from datetime import date
from pathlib import Path

PACKAGE_TYPE_OP_S = "OP_S"
PACKAGE_TYPE_PBO_S = "PBO_S"
PACKAGE_TYPE_ORP_S = "ORP_S"  # legacy — alias PBO_S (paquets existants)
PACKAGE_TYPE_OP_C = "OP_C"
PACKAGE_TYPE_ORP_C = "ORP_C"
PACKAGE_TYPE_IEC_S = "IEC_S"
PACKAGE_TYPE_NONOP_C = "NONOP_C"
PACKAGE_TYPE_FET = "FET"
# Legacy (paquets déjà importés — non proposés à l'inférence)
PACKAGE_TYPE_IEC_C = "IEC_C"
PACKAGE_TYPE_PBO_F = "PBO_F"
PACKAGE_TYPE_IEC_F = "IEC_F"

ALL_PACKAGE_TYPES = (
    PACKAGE_TYPE_OP_S,
    PACKAGE_TYPE_PBO_S,
    PACKAGE_TYPE_IEC_S,
    PACKAGE_TYPE_OP_C,
    PACKAGE_TYPE_ORP_C,
    PACKAGE_TYPE_NONOP_C,
    PACKAGE_TYPE_FET,
)

PREPARATION_THEMES = ("operatory", "pbo", "iec")

LEGACY_PACKAGE_TYPES = (PACKAGE_TYPE_ORP_S,)


ACTIVITY_COURS = "cours"
ACTIVITY_SEMINAIRE = "seminaire"
ACTIVITY_FACULTY = "faculty"

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
    PACKAGE_TYPE_OP_S: PackageTypeSpec(
        code=PACKAGE_TYPE_OP_S,
        label="Op S",
        activity_kind=ACTIVITY_SEMINAIRE,
        activity_label="Séminaire",
        title="Séminaire opératoire — Op S (1 jour)",
        description="Séminaire AO Alliance en bloc opératoire, format court (1 journée).",
        preparation_theme="operatory",
        duration_days=1,
        aliases=("op s", "op-s", "op_s", "seminaire op", "seminaire operatoire", "operatory seminar"),
    ),
    PACKAGE_TYPE_PBO_S: PackageTypeSpec(
        code=PACKAGE_TYPE_PBO_S,
        label="PBO S",
        activity_kind=ACTIVITY_SEMINAIRE,
        activity_label="Séminaire",
        title="Séminaire PBO — PBO S (1 jour)",
        description="Séminaire salle opératoire PBO, format court (1 journée). Programme type PBO.",
        preparation_theme="pbo",
        duration_days=1,
        aliases=("pbo s", "pbo-s", "pbo_s", "seminaire pbo", "seminaire orp"),
    ),
    PACKAGE_TYPE_ORP_S: PackageTypeSpec(
        code=PACKAGE_TYPE_ORP_S,
        label="PBO S",
        activity_kind=ACTIVITY_SEMINAIRE,
        activity_label="Séminaire",
        title="Séminaire PBO — PBO S (1 jour)",
        description="Ancien code ORP_S — équivalent PBO S (1 journée).",
        preparation_theme="pbo",
        duration_days=1,
        aliases=("orp s", "orp-s", "orp_s", "seminaire orp"),
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
    PACKAGE_TYPE_IEC_C: PackageTypeSpec(
        code=PACKAGE_TYPE_IEC_C,
        label="IEC C",
        activity_kind=ACTIVITY_COURS,
        activity_label="Cours",
        title="Cours IEC — IEC C (3 jours)",
        description="Cours AO Alliance IEC sur plusieurs jours (listes de présence J1–J3).",
        preparation_theme="iec",
        duration_days=3,
        aliases=("iec c", "iec-c", "iec_c", "cours iec", "iec course"),
    ),
    PACKAGE_TYPE_FET: PackageTypeSpec(
        code=PACKAGE_TYPE_FET,
        label="Faculty ET",
        activity_kind=ACTIVITY_FACULTY,
        activity_label="Faculty Education Training",
        title="Faculty Education Training — FET (2 jours)",
        description="Formation Faculty Education Training — format court (2 journées), listes J1–J2.",
        preparation_theme="operatory",
        duration_days=2,
        aliases=(
            "fet",
            "fet c",
            "faculty education training",
            "faculty education",
            "faculty training",
            "formation faculty",
            "faculty operatory",
            "faculty op",
        ),
    ),
    PACKAGE_TYPE_PBO_F: PackageTypeSpec(
        code=PACKAGE_TYPE_PBO_F,
        label="PBO F",
        activity_kind=ACTIVITY_FACULTY,
        activity_label="Faculty Education Training",
        title="Faculty Education Training — PBO (3 jours)",
        description="Formation Faculty PBO — même structure documentaire que les cours AO (3 jours).",
        preparation_theme="pbo",
        duration_days=3,
        aliases=("pbo f", "pbo-f", "pbo_f", "faculty pbo", "fet pbo"),
    ),
    PACKAGE_TYPE_IEC_F: PackageTypeSpec(
        code=PACKAGE_TYPE_IEC_F,
        label="IEC F",
        activity_kind=ACTIVITY_FACULTY,
        activity_label="Faculty Education Training",
        title="Faculty Education Training — IEC (3 jours)",
        description="Formation Faculty IEC — même structure documentaire que les cours AO (3 jours).",
        preparation_theme="iec",
        duration_days=3,
        aliases=("iec f", "iec-f", "iec_f", "faculty iec", "fet iec"),
    ),
}


_THEME_ORDER = {"operatory": 0, "pbo": 1, "iec": 2}


def list_package_types_by_activity() -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {
        ACTIVITY_COURS: [],
        ACTIVITY_SEMINAIRE: [],
        ACTIVITY_FACULTY: [],
    }
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
    for items in grouped.values():
        items.sort(
            key=lambda row: (
                _THEME_ORDER.get(row["preparation_theme"], 9),
                row["label"],
            )
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


def normalize_package_type(code: str | None) -> str | None:
    """Mappe les codes legacy vers les types canoniques (import / affichage)."""
    if not code:
        return None
    upper = str(code).upper().replace("-", "_")
    if upper == PACKAGE_TYPE_ORP_S:
        return PACKAGE_TYPE_PBO_S
    return upper


def detect_package_type_from_folder(folder_name: str, files: list[Path]) -> str | None:
    """Déduit le type de paquet depuis le nom du dossier et le fichier programme (02_*)."""
    label = _norm(folder_name).replace("_", " ")
    if label in {"orp s", "orp_s"}:
        return PACKAGE_TYPE_PBO_S
    if label in {"op s", "op_s"}:
        return PACKAGE_TYPE_OP_S
    if label in {"pbo s", "pbo_s"}:
        return PACKAGE_TYPE_PBO_S
    if label in {"iec c", "iec_c"}:
        return PACKAGE_TYPE_IEC_C
    if label in {"iec f", "iec_f"}:
        return PACKAGE_TYPE_IEC_F
    if label in {"pbo f", "pbo_f"}:
        return PACKAGE_TYPE_PBO_F
    if label in {"fet", "faculty education training", "faculty education"} or "fet" in label:
        return PACKAGE_TYPE_FET
    for code, spec in PACKAGE_TYPE_SPECS.items():
        if _norm(spec.label) in label or any(alias in label for alias in spec.aliases):
            return code
        if code.lower().replace("_", " ") in label:
            return code

    programme = _programme_file(files)
    if programme is None:
        return None

    stem = _norm(programme.stem)
    if "iec f" in stem or "faculty iec" in stem:
        return PACKAGE_TYPE_IEC_F
    if "iec c" in stem or "cours iec" in stem:
        return PACKAGE_TYPE_IEC_C
    if "iec" in stem:
        return PACKAGE_TYPE_IEC_S
    if "pbo f" in stem or "faculty pbo" in stem:
        return PACKAGE_TYPE_PBO_F
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
        return PACKAGE_TYPE_PBO_S
    if "op s" in stem or re.search(r"\bop\b", stem):
        return PACKAGE_TYPE_OP_S
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
            "faculty education training",
            "faculty education",
            "faculty training",
            "formation faculty",
            " fet",
            "fet ",
        )
    ) or re.search(r"\bfet\b", combined):
        return "operatory"
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
    metadata_json: dict | None = None,
) -> str | None:
    """Associe un événement TIP au modèle de paquet le plus probable."""
    text = _norm(f"{event_type or ''} {title or ''}")
    days = _event_duration_days(start_date, end_date)
    override = (metadata_json or {}).get("package_type_override")
    if isinstance(override, str):
        override = override.strip().upper().replace("-", "_")
    theme = _norm(preparation_theme) or infer_preparation_theme_for_event(
        event_type=event_type,
        title=title,
    )
    activity_kind = infer_activity_kind(event_type, title, days=days)

    package_type = package_type_for_theme_and_activity(
        theme or "",
        activity_kind,
        text=text,
        package_override=override if isinstance(override, str) else None,
    )
    if package_type:
        return normalize_package_type(package_type) or package_type

    if theme:
        package_type = package_type_for_theme_and_activity(theme, activity_kind, text=text)
        if package_type:
            return normalize_package_type(package_type) or package_type

    # Ordre important : NONOP_C avant OP_C (« op c » est contenu dans « nonop c »).
    for code in (
        PACKAGE_TYPE_FET,
        PACKAGE_TYPE_NONOP_C,
        PACKAGE_TYPE_ORP_C,
        PACKAGE_TYPE_IEC_S,
        PACKAGE_TYPE_PBO_S,
        PACKAGE_TYPE_OP_S,
        PACKAGE_TYPE_OP_C,
        PACKAGE_TYPE_ORP_S,
    ):
        spec = PACKAGE_TYPE_SPECS[code]
        if any(alias in text for alias in spec.aliases):
            return code
        if _norm(spec.label) in text:
            return code

    return None


def infer_activity_kind(
    event_type: str | None,
    title: str | None = None,
    *,
    days: int = 1,
) -> str:
    """Déduit le format AO (cours / séminaire / faculty) depuis l'activité et le titre."""
    text = _norm(f"{event_type or ''} {title or ''}")
    activity = _norm(event_type)
    if activity_is_faculty(activity, text):
        return ACTIVITY_FACULTY
    if activity_is_seminar(activity, text):
        return ACTIVITY_SEMINAIRE
    if activity in ("course", "cours") or "cours" in text:
        return ACTIVITY_COURS
    if days <= 1:
        return ACTIVITY_SEMINAIRE
    return ACTIVITY_COURS


def package_type_for_theme_and_activity(
    theme: str,
    activity_kind: str,
    *,
    text: str = "",
    package_override: str | None = None,
) -> str | None:
    """Matrice thème TIP × format (cours / séminaire / faculty)."""
    if package_override:
        normalized = normalize_package_type(package_override) or package_override
        if normalized in PACKAGE_TYPE_SPECS:
            return normalized

    theme = _norm(theme)
    if activity_kind == ACTIVITY_FACULTY:
        return PACKAGE_TYPE_FET
    if activity_kind == ACTIVITY_SEMINAIRE:
        if theme == "pbo":
            return PACKAGE_TYPE_PBO_S
        if theme == "iec":
            return PACKAGE_TYPE_IEC_S
        return PACKAGE_TYPE_OP_S
    if theme == "pbo":
        return PACKAGE_TYPE_ORP_C
    if any(x in text for x in ("nonop", "non-op", "non op", "nonoperatory", "cours non")):
        return PACKAGE_TYPE_NONOP_C
    return PACKAGE_TYPE_OP_C


def _package_candidate_dict(
    package_type: str,
    *,
    preparation_theme: str | None,
    suggested: bool = False,
    score: float = 0.0,
) -> dict:
    spec = PACKAGE_TYPE_SPECS[package_type]
    canonical = normalize_package_type(package_type) or package_type
    return {
        "package_type": canonical,
        "package_label": PACKAGE_TYPE_SPECS[canonical].label,
        "preparation_theme": preparation_theme,
        "activity_kind": spec.activity_kind,
        "activity_label": spec.activity_label,
        "expected_package_days": spec.duration_days,
        "suggested": suggested,
        "score": score,
    }


def list_package_candidates_for_event(
    *,
    preparation_theme: str | None = None,
    event_type: str | None = None,
    title: str | None = None,
    start_date: str | date | None = None,
    end_date: str | date | None = None,
    metadata_json: dict | None = None,
) -> list[dict]:
    """Paquets applicables pour un événement (choix UI / IA)."""
    text = _norm(f"{event_type or ''} {title or ''}")
    days = _event_duration_days(start_date, end_date)
    activity = infer_activity_kind(event_type, title, days=days)
    theme = _norm(preparation_theme) or infer_preparation_theme_for_event(
        event_type=event_type,
        title=title,
    )
    override = (metadata_json or {}).get("package_type_override")
    if isinstance(override, str):
        override = override.strip().upper().replace("-", "_")

    if activity == ACTIVITY_FACULTY:
        return [_package_candidate_dict(PACKAGE_TYPE_FET, preparation_theme=None, suggested=True, score=1.0)]

    if activity == ACTIVITY_SEMINAIRE or days <= 1:
        candidates = [
            _package_candidate_dict(PACKAGE_TYPE_OP_S, preparation_theme="operatory"),
            _package_candidate_dict(PACKAGE_TYPE_PBO_S, preparation_theme="pbo"),
            _package_candidate_dict(PACKAGE_TYPE_IEC_S, preparation_theme="iec"),
        ]
    else:
        candidates = [
            _package_candidate_dict(PACKAGE_TYPE_OP_C, preparation_theme="operatory"),
            _package_candidate_dict(PACKAGE_TYPE_ORP_C, preparation_theme="pbo"),
            _package_candidate_dict(PACKAGE_TYPE_NONOP_C, preparation_theme="operatory"),
        ]

    best_type = package_type_for_theme_and_activity(
        theme or "",
        activity,
        text=text,
        package_override=override if isinstance(override, str) else None,
    )
    if not best_type and theme:
        best_type = package_type_for_theme_and_activity(
            theme,
            activity,
            text=text,
        )

    for item in candidates:
        if item["package_type"] == normalize_package_type(best_type or ""):
            item["suggested"] = True
            item["score"] = 0.85
        elif theme and item.get("preparation_theme") == theme:
            item["score"] = 0.7
        elif any(alias in text for alias in PACKAGE_TYPE_SPECS[item["package_type"]].aliases):
            item["score"] = max(item["score"], 0.6)

    if override and isinstance(override, str):
        canonical = normalize_package_type(override) or override
        for item in candidates:
            item["suggested"] = item["package_type"] == canonical
            if item["suggested"]:
                item["score"] = 1.0

    candidates.sort(key=lambda row: (-row["score"], row["package_label"]))
    if candidates and not any(c["suggested"] for c in candidates):
        candidates[0]["suggested"] = True
        candidates[0]["score"] = max(candidates[0]["score"], 0.5)
    return candidates


def effective_list_days(
    *,
    start_date: str | date | None = None,
    end_date: str | date | None = None,
    package_type: str | None = None,
    package_max_days: int | None = None,
) -> int:
    """Nombre de jours pour filtrer les listes 07/08 (min durée événement, max paquet)."""
    event_days = _event_duration_days(start_date, end_date)
    if package_max_days is None and package_type:
        spec = PACKAGE_TYPE_SPECS.get(package_type)
        package_max_days = spec.duration_days if spec else None
    if not package_max_days:
        return event_days
    return min(event_days, package_max_days)


def activity_is_faculty(activity: str, text: str) -> bool:
    if activity in ("faculty", "faculty education training", "formation faculty"):
        return True
    return any(
        kw in text
        for kw in (
            "faculty education training",
            "faculty education",
            "faculty training",
            "formation faculty",
        )
    ) or bool(re.search(r"\bfet\b", text))


def activity_is_seminar(activity: str, text: str) -> bool:
    if activity in ("seminar", "seminaire", "seminaire d'information"):
        return True
    return any(
        kw in text
        for kw in ("seminaire", "seminar", "séminaire", "seminaire op", "seminaire pbo", "seminaire iec")
    )


def describe_inferred_event_package(
    *,
    preparation_theme: str | None,
    event_type: str | None,
    title: str | None = None,
    start_date: str | date | None = None,
    end_date: str | date | None = None,
    metadata_json: dict | None = None,
) -> dict | None:
    """Résumé paquet + thème inférés pour l'UI et la génération."""
    theme = preparation_theme or infer_preparation_theme_for_event(
        event_type=event_type,
        title=title,
    )
    candidates = list_package_candidates_for_event(
        preparation_theme=preparation_theme,
        event_type=event_type,
        title=title,
        start_date=start_date,
        end_date=end_date,
        metadata_json=metadata_json,
    )
    package_type = infer_package_type_for_event(
        preparation_theme=theme,
        event_type=event_type,
        title=title,
        start_date=start_date,
        end_date=end_date,
        metadata_json=metadata_json,
    )
    if not package_type and candidates:
        package_type = candidates[0]["package_type"]
    if not package_type:
        return None
    canonical = normalize_package_type(package_type) or package_type
    spec = PACKAGE_TYPE_SPECS[canonical]
    resolved_theme = theme
    if not resolved_theme:
        for candidate in candidates:
            if candidate["package_type"] == canonical and candidate.get("preparation_theme"):
                resolved_theme = candidate["preparation_theme"]
                break
    if not resolved_theme:
        resolved_theme = spec.preparation_theme
    return {
        "package_type": canonical,
        "package_label": spec.label,
        "activity_kind": spec.activity_kind,
        "activity_label": spec.activity_label,
        "preparation_theme": resolved_theme,
        "duration_days": _event_duration_days(start_date, end_date),
        "expected_package_days": spec.duration_days,
        "package_candidates": candidates,
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
    Filtre les listes 07/08 selon max_days (durée paquet ou événement).
    Séminaire 1j (OP_S, PBO_S, IEC_S) ou FET 2j : listes au-delà de max_days exclues.
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


# Noms canoniques du fichier programme (02_*) par type de paquet.
_CANONICAL_PROGRAMME_STEM: dict[str, str] = {
    PACKAGE_TYPE_OP_S: "02_Modèle_Programme_Sem Op_S",
    PACKAGE_TYPE_IEC_S: "02_Modèle_Programme_Sem IEC_SEN",
    PACKAGE_TYPE_PBO_S: "02_Modèle_Programme_PBO",
    PACKAGE_TYPE_ORP_S: "02_Modèle_Programme_PBO",
    PACKAGE_TYPE_OP_C: "02_Modèle Programme_Op C_v2",
    PACKAGE_TYPE_IEC_C: "02_Modèle Programme_Op C_v2",
    PACKAGE_TYPE_IEC_F: "02_Modèle Programme_Op C_v2",
    PACKAGE_TYPE_FET: "02_Modèle_Programme_FET",
    PACKAGE_TYPE_ORP_C: "02_Modèle programme_ORP C_Congo_v2",
    PACKAGE_TYPE_PBO_F: "02_Modèle programme_ORP C_Congo_v2",
    PACKAGE_TYPE_NONOP_C: "02_Modèle Programme_Nonp C_SEN",
}

def adapt_package_filename(filename: str, package_type: str | None) -> str:
    """
    Adapte le nom exporté au type de paquet cible.

    Ex. OP_S : ``02_Modèle_Programme_Sem IEC_SEN.doc`` → ``02_Modèle_Programme_Sem Op_S.doc``.
    """
    if not filename or not package_type:
        return filename
    code = normalize_package_type(package_type) or str(package_type).upper().replace("-", "_")
    if code not in PACKAGE_TYPE_SPECS:
        return filename
    if infer_document_type(filename) != "programme":
        return filename

    canonical = _CANONICAL_PROGRAMME_STEM.get(code)
    if not canonical:
        return filename

    return f"{canonical}{Path(filename).suffix}"
