"""Motifs regex pour libellés AO (accents FR + apostrophes typographiques)."""

from __future__ import annotations

import re

# Apostrophe ASCII, typographique droite/gauche, backtick
APOSTROPHE = r"['\u2019\u2018`]?"
# e, é, è (et variantes majuscules)
_EV = r"[eéèêëÉÈÊË]"
EVENEMENT = rf"{_EV}v{_EV}nement"

LIEU_LABEL_RE = re.compile(rf"lieu\s+de\s+l{APOSTROPHE}{EVENEMENT}", re.I)
TITRE_OR_NOM_LABEL_RE = re.compile(
    rf"(?:titre|nom)\s+de\s+l{APOSTROPHE}{EVENEMENT}",
    re.I,
)
DATE_LABEL_RE = re.compile(rf"date\s+de\s+l{APOSTROPHE}{EVENEMENT}", re.I)

LIEU_LINE_RE = re.compile(rf"^(Lieu de l{APOSTROPHE}{EVENEMENT}:\s*)(.*)$", re.I)
EVENT_NAME_LINE_RE = re.compile(rf"^(Nom de l{APOSTROPHE}{EVENEMENT}:\s*)(.*)$", re.I)
EVENT_DATE_LINE_RE = re.compile(rf"^(Date de l{APOSTROPHE}{EVENEMENT}:\s*)(.*)$", re.I)
RESP_NAME_LINE_RE = re.compile(
    rf"^(Nom du responsable national de l{APOSTROPHE}{EVENEMENT}:\s*)(.*)$",
    re.I,
)
RESP_EMAIL_LINE_RE = re.compile(
    rf"^(Email du responsable national de l{APOSTROPHE}{EVENEMENT}:\s*)(.*)$",
    re.I,
)
RESP_PHONE_LINE_RE = re.compile(
    rf"^(N°\s*téléphone du responsable national de l{APOSTROPHE}{EVENEMENT}:\s*)(.*)$",
    re.I,
)
RESP_NAME_LABEL_RE = re.compile(
    rf"nom\s+du\s+responsable\s+national\s+de\s+l{APOSTROPHE}{EVENEMENT}",
    re.I,
)
RESP_EMAIL_LABEL_RE = re.compile(
    rf"email\s+du\s+responsable\s+national\s+de\s+l{APOSTROPHE}{EVENEMENT}",
    re.I,
)
RESP_PHONE_LABEL_RE = re.compile(
    rf"n°\s*téléphone\s+du\s+responsable\s+national\s+de\s+l{APOSTROPHE}{EVENEMENT}",
    re.I,
)

# Préfixes par défaut (modèles accord Excel — colonne B fusionnée)
DEFAULT_NOM_EVENT_PREFIX = "Nom de l'évènement: "
DEFAULT_LIEU_EVENT_PREFIX = "Lieu de l'évènement: "
DEFAULT_DATE_EVENT_PREFIX = "Date de l'évènement: "
DEFAULT_RESP_NAME_PREFIX = "Nom du responsable national de l'évènement: "
DEFAULT_RESP_EMAIL_PREFIX = "Email du responsable national de l'évènement: "
DEFAULT_RESP_PHONE_PREFIX = "N° téléphone du responsable national de l'évènement: "

LEGACY_LIEUX = (
    "Bangui, RCA",
    "Dakar, Sénégal",
    "Mbour, Sénégal",
    "Kaffrine, Sénégal",
    "Brazzaville, Congo",
    "Zurich, Suisse",
    "Ethiopia, Ethiopia",
    "Addis Ababa, Ethiopia",
)
