"""Mise en forme texte assistant — listes lisibles, sans markdown."""

from __future__ import annotations

import re


def normalize_assistant_reply(text: str) -> str:
    """Convertit le markdown courant en texte structuré (puces •, pas de **)."""
    if not text:
        return ""

    lines: list[str] = []
    for raw in text.splitlines():
        line = raw.rstrip()
        stripped = line.strip()

        if re.match(r"^[-*+]\s+", stripped):
            content = re.sub(r"^[-*+]\s+", "", stripped)
            lines.append(f"• {content}")
            continue

        if re.match(r"^\d+\.\s+", stripped):
            num, rest = re.split(r"\.\s+", stripped, maxsplit=1)
            lines.append(f"{num}. {rest}")
            continue

        cleaned = stripped
        cleaned = re.sub(r"\*\*(.+?)\*\*", r"\1", cleaned)
        cleaned = re.sub(r"__(.+?)__", r"\1", cleaned)
        cleaned = re.sub(r"\*(.+?)\*", r"\1", cleaned)
        cleaned = re.sub(r"_(.+?)_", r"\1", cleaned)
        cleaned = re.sub(r"`(.+?)`", r"\1", cleaned)
        lines.append(cleaned if stripped else "")

    return "\n".join(lines).strip()
