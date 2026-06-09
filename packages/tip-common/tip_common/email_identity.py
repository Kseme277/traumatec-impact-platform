"""Correspondance d'emails TIP ↔ Clerk (fautes de domaine, OAuth)."""

from __future__ import annotations

from difflib import SequenceMatcher


def normalize_email(email: str) -> str:
    return email.strip().lower()


def email_local_part(email: str) -> str:
    normalized = normalize_email(email)
    if "@" not in normalized:
        return normalized
    return normalized.split("@", 1)[0]


def email_domain(email: str) -> str:
    normalized = normalize_email(email)
    if "@" not in normalized:
        return ""
    return normalized.split("@", 1)[1]


def domains_are_similar(domain_a: str, domain_b: str) -> bool:
    if domain_a == domain_b:
        return True
    if not domain_a or not domain_b:
        return False
    ratio = SequenceMatcher(None, domain_a, domain_b).ratio()
    return ratio >= 0.88


def emails_match_for_linking(email_a: str, email_b: str) -> bool:
    a = normalize_email(email_a)
    b = normalize_email(email_b)
    if a == b:
        return True
    if email_local_part(a) != email_local_part(b):
        return False
    return domains_are_similar(email_domain(a), email_domain(b))
