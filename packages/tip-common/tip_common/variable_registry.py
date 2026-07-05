"""Registre des variables de modèles AO — source unique pour docgen, catalog et UI."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any

_DOC_APOSTROPHE_CHARS = ("'", "\u2019", "\u2018", "`")
_EVENT_SPELLINGS = ("évenement", "événement", "evenement", "évènement")


@dataclass(frozen=True)
class TemplateVariableDef:
    key: str
    placeholders: tuple[str, ...]
    event_field: str
    example: str
    label_fr: str
    label_en: str
    description_fr: str
    description_en: str
    category: str


@dataclass(frozen=True)
class TemplateVariableKeepDef:
    sample: str
    label_fr: str
    label_en: str
    description_fr: str
    description_en: str


def _brace(label: str, *, spaced: bool = False) -> str:
    if spaced:
        return f"{{{{ {label.strip()} }}}}"
    return f"{{{{{label}}}}}"


def _nom_event_placeholders() -> tuple[str, ...]:
    out: list[str] = []
    seen: set[str] = set()
    for ap in _DOC_APOSTROPHE_CHARS:
        for article in ("l", "L"):
            for spell in _EVENT_SPELLINGS:
                for ph in (
                    _brace(f"Nom de {article}{ap}{spell}"),
                    _brace(f"Nom de {article}{ap}{spell}", spaced=True),
                ):
                    if ph not in seen:
                        seen.add(ph)
                        out.append(ph)
    return tuple(out)


def _date_event_placeholders() -> tuple[str, ...]:
    out: list[str] = []
    seen: set[str] = set()
    for ap in _DOC_APOSTROPHE_CHARS:
        for article in ("l", "L"):
            for spell in _EVENT_SPELLINGS:
                for ph in (
                    _brace(f"Date de {article}{ap}{spell}"),
                    _brace(f"Date de {article}{ap}{spell}", spaced=True),
                ):
                    if ph not in seen:
                        seen.add(ph)
                        out.append(ph)
    return tuple(out)


def _teacher_placeholders(slot: int | str) -> tuple[str, ...]:
    label = ".." if slot == 6 else str(slot)
    out: list[str] = []
    seen: set[str] = set()
    for ap in _DOC_APOSTROPHE_CHARS:
        for article in ("L", "l"):
            ph = _brace(f"Nom de {article}{ap}Ens. {label}")
            if ph not in seen:
                seen.add(ph)
                out.append(ph)
    return tuple(out)


def _teacher_variable_defs() -> tuple[TemplateVariableDef, ...]:
    items: list[TemplateVariableDef] = []
    for index in range(1, 7):
        slot = ".." if index == 6 else index
        items.append(
            TemplateVariableDef(
                key=f"teacher_{index}",
                placeholders=_teacher_placeholders(slot),
                event_field=f"teachers[{index - 1}] / teacher_names[{index - 1}]",
                example="Albert Désiré Atangana Fouda",
                label_fr=f"Enseignant {index}",
                label_en=f"Faculty member {index}",
                description_fr=f"Nom de l'enseignant slot Ens. {slot} (programme, listes).",
                description_en=f"Faculty name for Ens. {slot} slot (programme, lists).",
                category="teachers",
            )
        )
    return tuple(items)


TEMPLATE_VARIABLES: tuple[TemplateVariableDef, ...] = (
    TemplateVariableDef(
        key="project_number",
        placeholders=(
            "{{ project_number }}",
            "{{ numero_projet }}",
            "{{Project Number}}",
            "[PROJECT_NUMBER]",
        ),
        event_field="project_number",
        example="702294",
        label_fr="Numéro de projet",
        label_en="Project number",
        description_fr="Code projet AO Alliance (événement TIP).",
        description_en="AO Alliance project code (TIP event).",
        category="event",
    ),
    TemplateVariableDef(
        key="cost_center",
        placeholders=("{{Cost Center}}", "{{ cost_center }}"),
        event_field="cost_center",
        example="CC-12345",
        label_fr="Centre de coûts",
        label_en="Cost center",
        description_fr="Centre de coûts comptable du projet.",
        description_en="Project accounting cost center.",
        category="event",
    ),
    TemplateVariableDef(
        key="title",
        placeholders=(
            "{{ title }}",
            "{{ titre }}",
            "{{ event_title }}",
            *_nom_event_placeholders(),
            "[EVENT_TITLE]",
        ),
        event_field="title / title_formatted",
        example="Séminaire AO Alliance—Information, Éducation et Communication (IEC)",
        label_fr="Nom de l'événement",
        label_en="Event title",
        description_fr="Titre complet du cours ou séminaire en français.",
        description_en="Full course or seminar title in French.",
        category="event",
    ),
    TemplateVariableDef(
        key="event_type",
        placeholders=("{{ event_type }}", "{{ type_evenement }}"),
        event_field="event_type",
        example="Séminaire",
        label_fr="Type d'événement",
        label_en="Event type",
        description_fr="Cours ou séminaire (libellé activité).",
        description_en="Course or seminar (activity label).",
        category="event",
    ),
    TemplateVariableDef(
        key="package_label",
        placeholders=("{{ package_label }}",),
        event_field="package_label",
        example="IEC S",
        label_fr="Type de paquet",
        label_en="Package type",
        description_fr="Code paquet AO (OP_C, IEC_S, ORP_S, …).",
        description_en="AO package code (OP_C, IEC_S, ORP_S, …).",
        category="event",
    ),
    TemplateVariableDef(
        key="preparation_theme",
        placeholders=("{{ preparation_theme }}", "{{ theme }}"),
        event_field="preparation_theme",
        example="iec",
        label_fr="Thème de préparation",
        label_en="Preparation theme",
        description_fr="Thème AO : iec, pbo, operatory, …",
        description_en="AO theme: iec, pbo, operatory, …",
        category="event",
    ),
    TemplateVariableDef(
        key="city",
        placeholders=("{{ city }}", "{{ ville }}", "{{Ville}}", "[CITY]"),
        event_field="city",
        example="Kinshasa",
        label_fr="Ville",
        label_en="City",
        description_fr="Ville d'accueil.",
        description_en="Host city.",
        category="location",
    ),
    TemplateVariableDef(
        key="country",
        placeholders=("{{ country }}", "{{ pays }}", "{{Pays}}", "[COUNTRY]"),
        event_field="country",
        example="République démocratique du Congo",
        label_fr="Pays",
        label_en="Country",
        description_fr="Pays (libellé français dans les documents).",
        description_en="Country (French label in documents).",
        category="location",
    ),
    TemplateVariableDef(
        key="region",
        placeholders=("{{ region }}",),
        event_field="region",
        example="Afrique centrale",
        label_fr="Région",
        label_en="Region",
        description_fr="Région géographique si renseignée.",
        description_en="Geographic region if provided.",
        category="location",
    ),
    TemplateVariableDef(
        key="lieu",
        placeholders=(
            "{{ lieu }}",
            "{{ location }}",
            "{{ lieu_formatted }}",
            "{{Ville}}, {{Pays}}",
            "{{Ville}}, {{Pays}}  {{Date de l'évenement}}",
        ),
        event_field="lieu / lieu_formatted / city + country",
        example="Kinshasa, République démocratique du Congo",
        label_fr="Lieu complet",
        label_en="Full location",
        description_fr="Ville et pays combinés (en-têtes, listes de présence).",
        description_en="Combined city and country (headers, attendance lists).",
        category="location",
    ),
    TemplateVariableDef(
        key="header_lieu_date",
        placeholders=("{{ header_lieu_date }}",),
        event_field="header_lieu_date",
        example="Kinshasa, RDC  31 décembre 2026",
        label_fr="Ligne lieu + date (en-tête)",
        label_en="Location + date header line",
        description_fr="Ligne combinée date et lieu pour en-têtes de documents.",
        description_en="Combined date and location line for document headers.",
        category="location",
    ),
    TemplateVariableDef(
        key="start_date",
        placeholders=(
            "{{ start_date }}",
            "{{ date_debut }}",
            "{{ event_date }}",
            "[START_DATE]",
        ),
        event_field="start_date",
        example="31/12/2026",
        label_fr="Date de début (courte)",
        label_en="Start date (short)",
        description_fr="Date de début JJ/MM/AAAA.",
        description_en="Start date DD/MM/YYYY.",
        category="date",
    ),
    TemplateVariableDef(
        key="end_date",
        placeholders=("{{ end_date }}", "{{ date_fin }}", "[END_DATE]"),
        event_field="end_date",
        example="31/12/2026",
        label_fr="Date de fin (courte)",
        label_en="End date (short)",
        description_fr="Date de fin JJ/MM/AAAA.",
        description_en="End date DD/MM/YYYY.",
        category="date",
    ),
    TemplateVariableDef(
        key="start_date_long",
        placeholders=("{{ start_date_long }}",),
        event_field="start_date_long",
        example="31 décembre 2026",
        label_fr="Date de début (longue)",
        label_en="Start date (long)",
        description_fr="Date de début en toutes lettres.",
        description_en="Start date spelled out in French.",
        category="date",
    ),
    TemplateVariableDef(
        key="end_date_long",
        placeholders=("{{ end_date_long }}",),
        event_field="end_date_long",
        example="31 décembre 2026",
        label_fr="Date de fin (longue)",
        label_en="End date (long)",
        description_fr="Date de fin en toutes lettres.",
        description_en="End date spelled out in French.",
        category="date",
    ),
    TemplateVariableDef(
        key="date_range",
        placeholders=(
            *_date_event_placeholders(),
            "{{ date_range_formatted }}",
        ),
        event_field="date_range_formatted / start_date + end_date",
        example="03 – 05 juin 2026",
        label_fr="Plage de dates",
        label_en="Date range",
        description_fr="Dates de l'événement (1 jour ou plusieurs jours).",
        description_en="Event dates (single day or range).",
        category="date",
    ),
    TemplateVariableDef(
        key="date_single_formatted",
        placeholders=("{{ date_single_formatted }}",),
        event_field="date_single_formatted",
        example="31 décembre 2026",
        label_fr="Date unique formatée",
        label_en="Single formatted date",
        description_fr="Date de l'événement sur une seule ligne (1 jour).",
        description_en="Event date on one line (single day).",
        category="date",
    ),
    TemplateVariableDef(
        key="date_du_jour",
        placeholders=("{{Date du jour}}", "{{ date_du_jour }}", "{{ today }}"),
        event_field="date_du_jour",
        example="31 décembre 2026",
        label_fr="Date du document",
        label_en="Document date",
        description_fr="Date affichée sur le document (jour concerné pour les listes multi-jours).",
        description_en="Date shown on the document (day index for multi-day lists).",
        category="date",
    ),
    TemplateVariableDef(
        key="weekday_date",
        placeholders=("{{ weekday_date }}",),
        event_field="weekday_date (calculée)",
        example="mardi 31 décembre 2026",
        label_fr="Jour de la semaine + date",
        label_en="Weekday + date",
        description_fr="Date avec jour de la semaine (listes de présence).",
        description_en="Date with weekday name (attendance lists).",
        category="date",
    ),
    TemplateVariableDef(
        key="year",
        placeholders=("{{ year }}", "{{ annee }}"),
        event_field="year",
        example="2026",
        label_fr="Année",
        label_en="Year",
        description_fr="Année de l'événement.",
        description_en="Event year.",
        category="date",
    ),
    TemplateVariableDef(
        key="responsible_person",
        placeholders=(
            "{{ responsable }}",
            "{{ responsible_person }}",
            "{{Nom du responsable}}",
            "{{Nom du Responsable}}",
            "{{Nom du responsable national}}",
            "[RESPONSIBLE]",
        ),
        event_field="responsible_person / national_responsible_name",
        example="Dominique Nkoa",
        label_fr="Responsable national",
        label_en="National responsible",
        description_fr="Nom du responsable national de l'événement.",
        description_en="National event responsible name.",
        category="contact",
    ),
    TemplateVariableDef(
        key="responsible_email",
        placeholders=("{{Email}}", "{{ responsible_email }}", "xxxxx@email.com"),
        event_field="responsible_email / national_responsible_email",
        example="contact@example.org",
        label_fr="Courriel du responsable",
        label_en="Responsible email",
        description_fr="E-mail du responsable national.",
        description_en="National responsible email.",
        category="contact",
    ),
    TemplateVariableDef(
        key="responsible_phone",
        placeholders=(
            "{{Numéro du responsable}}",
            "{{ responsible_phone }}",
            "+xx xxx xxx xxx",
        ),
        event_field="responsible_phone",
        example="+237 78515882",
        label_fr="Téléphone du responsable",
        label_en="Responsible phone",
        description_fr="Téléphone du responsable national.",
        description_en="National responsible phone.",
        category="contact",
    ),
    TemplateVariableDef(
        key="contact_line",
        placeholders=("{{ contact_line }}",),
        event_field="contact_line",
        example="Courriel: x@y.org        Téléphone: +237…",
        label_fr="Ligne contact courriel/tél.",
        label_en="Email/phone contact line",
        description_fr="Ligne combinée courriel et téléphone.",
        description_en="Combined email and phone line.",
        category="contact",
    ),
    TemplateVariableDef(
        key="organizer_responsible_name",
        placeholders=(
            "{{ organizer_responsible_name }}",
            _brace("responsable de l'organisation"),
        ),
        event_field="organizer_responsible_name / prepared_by",
        example="Marie Dupont",
        label_fr="Responsable organisation",
        label_en="Organizer contact",
        description_fr="Personne de contact organisation du séminaire.",
        description_en="Seminar organizer contact person.",
        category="contact",
    ),
    TemplateVariableDef(
        key="prepared_by",
        placeholders=("{{ prepared_by }}", "{{ prepared_by_name }}"),
        event_field="prepared_by",
        example="Eric Kevin Nkoa",
        label_fr="Rédacteur du rapport",
        label_en="Report author",
        description_fr="Nom de l'utilisateur ayant généré le paquet (rapport national).",
        description_en="User who generated the package (national report).",
        category="contact",
    ),
    TemplateVariableDef(
        key="participants_expected",
        placeholders=(
            "{{ participants_expected }}",
            "{{ participants_count }}",
        ),
        event_field="participants_expected",
        example="45",
        label_fr="Nombre de participants",
        label_en="Expected participants",
        description_fr="Effectif prévu (rapport national).",
        description_en="Expected headcount (national report).",
        category="contact",
    ),
    TemplateVariableDef(
        key="title_prefix",
        placeholders=(
            _brace("Dr ou Pr ou rien "),
            _brace("Dr ou Pr ou rien"),
        ),
        event_field="Dr / Pr (extrait du responsable)",
        example="Dr",
        label_fr="Titre Dr / Pr",
        label_en="Dr / Prof prefix",
        description_fr="Préfixe honorifique du responsable (Dr, Pr, …).",
        description_en="Honorific prefix for responsible (Dr, Prof, …).",
        category="contact",
    ),
    *_teacher_variable_defs(),
    *tuple(
        TemplateVariableDef(
            key=f"enseignant_{i}",
            placeholders=(_brace(f"enseignant_{i}"), _brace(f"teacher_{i}")),
            event_field=f"enseignant_{i} / teacher_{i}",
            example="Albert Désiré Atangana Fouda",
            label_fr=f"Enseignant {i} (alias Jinja)",
            label_en=f"Faculty {i} (Jinja alias)",
            description_fr=f"Alias docxtpl pour l'enseignant {i}.",
            description_en=f"docxtpl alias for faculty member {i}.",
            category="teachers",
        )
        for i in range(1, 7)
    ),
)

KEEP_SAMPLES: tuple[TemplateVariableKeepDef, ...] = (
    TemplateVariableKeepDef(
        sample="Prénom Nom",
        label_fr="Nom participant / intervenant",
        label_en="Participant / speaker name",
        description_fr="Ligne vierge à remplir sur place — ne pas remplacer.",
        description_en="Blank line to fill on site — not replaced.",
    ),
    TemplateVariableKeepDef(
        sample="Prénom/ Nom",
        label_fr="Format contact modèle",
        label_en="Template contact format",
        description_fr="Conservé sauf section « Personne de contact ».",
        description_en="Kept except in « Contact person » section.",
    ),
    TemplateVariableKeepDef(
        sample="adresse@email",
        label_fr="E-mail générique tableau",
        label_en="Generic table email",
        description_fr="Placeholder générique — ne pas remplacer dans les tableaux.",
        description_en="Generic placeholder — do not replace in tables.",
    ),
)

CATEGORY_LABELS: dict[str, tuple[str, str]] = {
    "event": ("Événement", "Event"),
    "location": ("Lieu & zone", "Location & region"),
    "date": ("Dates", "Dates"),
    "contact": ("Contact & effectifs", "Contact & headcount"),
    "teachers": ("Enseignants", "Faculty"),
}

REPLACEMENT_MECHANISMS: tuple[dict[str, str], ...] = (
    {
        "id": "brace",
        "title_fr": "Variables {{ … }}",
        "title_en": "{{ … }} placeholders",
        "desc_fr": "Copiez le placeholder exact dans Word/Excel — reconnu instantanément à l'import.",
        "desc_en": "Copy the exact placeholder into Word/Excel — recognized instantly on import.",
    },
    {
        "id": "highlight",
        "title_fr": "Texte surligné en jaune",
        "title_en": "Yellow highlighted text",
        "desc_fr": "Dates/lieux surlignés : complément si pas de variable {{ … }}.",
        "desc_en": "Highlighted dates/locations: fallback when no {{ … }} variable.",
    },
    {
        "id": "literal",
        "title_fr": "Exemples du modèle",
        "title_en": "Template sample text",
        "desc_fr": "Texte d'exemple (ex. « 29 mai 2026 ») remplacé via règles métier.",
        "desc_en": "Sample text (e.g. « 29 May 2026 ») replaced via business rules.",
    },
)

_KEEP_SAMPLE_SET = frozenset(item.sample for item in KEEP_SAMPLES)


def _normalize_placeholder_label(text: str) -> str:
    raw = (text or "").strip()
    brace = re.match(r"^\{\{(.+)\}\}$", raw)
    if brace:
        raw = brace.group(1)
    elif raw.startswith("[") and raw.endswith("]"):
        return raw[1:-1].strip().lower()
    return re.sub(r"\s+", " ", raw.strip().lower())


def _build_placeholder_index() -> dict[str, str]:
    index: dict[str, str] = {}
    for var in TEMPLATE_VARIABLES:
        for ph in var.placeholders:
            index[_normalize_placeholder_label(ph)] = var.key
    return index


_PLACEHOLDER_INDEX = _build_placeholder_index()


_TEACHER_SLOT_RE = re.compile(r"nom de l.?ens\.\s*(\d+|\.\.)", re.I)


def resolve_brace_placeholder_to_key(sample: str) -> str | None:
    """Mappe un placeholder {{ … }} ou [TAG] vers une clé contexte docgen."""
    norm = _normalize_placeholder_label(sample)
    if not norm:
        return None
    if norm in _PLACEHOLDER_INDEX:
        return _PLACEHOLDER_INDEX[norm]
    teacher = _TEACHER_SLOT_RE.search(norm)
    if teacher:
        slot = teacher.group(1)
        if slot == "..":
            return "teacher_6"
        try:
            return f"teacher_{int(slot)}"
        except ValueError:
            return "teacher_name"
    snake = norm.replace(" ", "_")
    if snake.startswith("enseignant_") or snake.startswith("teacher_"):
        return snake
    direct_keys = {v.key for v in TEMPLATE_VARIABLES}
    if snake in direct_keys:
        return snake
    return None


def is_keep_sample(sample: str) -> bool:
    text = (sample or "").strip()
    if text in _KEEP_SAMPLE_SET:
        return True
    lowered = text.lower()
    return lowered in {"prénom nom", "prenom nom", "prénom/ nom", "adresse@email"}


def variable_by_key(key: str) -> TemplateVariableDef | None:
    for item in TEMPLATE_VARIABLES:
        if item.key == key:
            return item
    return None


def build_variables_guide(*, locale: str = "fr") -> dict[str, Any]:
    lang = "en" if locale.lower().startswith("en") else "fr"
    label = "label_en" if lang == "en" else "label_fr"
    desc = "description_en" if lang == "en" else "description_fr"

    variables = []
    for item in TEMPLATE_VARIABLES:
        row = asdict(item)
        row["label"] = getattr(item, label)
        row["description"] = getattr(item, desc)
        row["primary_placeholder"] = item.placeholders[0] if item.placeholders else ""
        variables.append(row)

    keep = []
    for item in KEEP_SAMPLES:
        keep.append(
            {
                "sample": item.sample,
                "label": getattr(item, label),
                "description": getattr(item, desc),
            }
        )

    categories = [
        {
            "id": cat_id,
            "label": labels[0 if lang == "fr" else 1],
        }
        for cat_id, labels in CATEGORY_LABELS.items()
    ]

    mechanisms = []
    for item in REPLACEMENT_MECHANISMS:
        mechanisms.append(
            {
                "id": item["id"],
                "title": item[f"title_{lang}"],
                "description": item[f"desc_{lang}"],
            }
        )

    return {
        "locale": lang,
        "variables": variables,
        "keep_samples": keep,
        "categories": categories,
        "mechanisms": mechanisms,
    }
