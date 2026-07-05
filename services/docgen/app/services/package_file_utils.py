"""Utilitaires partagés pour les fichiers de paquet (sans dépendances circulaires)."""

from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, status

from app.services.package_workflow import trace_package_files

CONTENT_TYPES = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".pdf": "application/pdf",
    ".txt": "text/plain; charset=utf-8",
}


def resolve_package_file(job: dict, template_code: str) -> tuple[str, str]:
    trace = job.get("template_versions_json") or {}
    prefix = ""
    if isinstance(trace, dict):
        prefix = trace.get("dossier_prefix") or ""
    for item in trace_package_files(trace):
        if item.get("template_code") == template_code or item.get("file_path") == template_code:
            arcname = item.get("file_path") or item.get("template_code") or template_code
            return f"{prefix}{arcname}", str(arcname)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fichier introuvable dans le paquet")


def content_type_for_filename(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    return CONTENT_TYPES.get(ext, "application/octet-stream")
