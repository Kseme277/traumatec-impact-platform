"""Remplacements texte sûrs dans les fichiers Word .doc (OLE) — longueur fixe uniquement."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

_DEFAULT_ENCODINGS = ("utf-16-le", "utf-8", "latin-1")


def replace_fixed_width_in_binary(
    data: bytes,
    old: str,
    new: str,
    *,
    encodings: tuple[str, ...] = _DEFAULT_ENCODINGS,
    max_replacements: int | None = None,
) -> tuple[bytes, int]:
    """
    Remplace une chaîne dans un .doc sans modifier la taille en octets.
    Les expansions sont ignorées (sinon Word signale un fichier corrompu sous Windows).
    """
    if not old or not new or old == new:
        return data, 0

    for encoding in encodings:
        try:
            old_b = old.encode(encoding)
            new_b = new.encode(encoding)
        except UnicodeEncodeError:
            continue
        if old_b not in data:
            continue
        if len(new_b) > len(old_b):
            logger.warning(
                "Remplacement .doc ignoré (texte trop long, %s > %s octets) : %r",
                len(new_b),
                len(old_b),
                old[:48],
            )
            continue

        pad_len = len(old_b) - len(new_b)
        if encoding == "utf-16-le":
            space = " ".encode("utf-16-le")
            padded = new_b + space * (pad_len // len(space))
        else:
            padded = new_b + b" " * pad_len
        result = data
        count = 0
        limit = max_replacements if max_replacements is not None else None
        while old_b in result:
            result = result.replace(old_b, padded, 1)
            count += 1
            if limit is not None and count >= limit:
                break
        if count:
            return result, count

    return data, 0
