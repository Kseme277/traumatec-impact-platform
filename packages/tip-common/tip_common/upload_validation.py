"""Validation des fichiers uploadés (taille, extension, contenu ZIP)."""

from __future__ import annotations

import io
import zipfile
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

MAX_EXCEL_UPLOAD_BYTES = 20 * 1024 * 1024
MAX_ZIP_UPLOAD_BYTES = 200 * 1024 * 1024
MAX_DOCUMENT_UPLOAD_BYTES = 50 * 1024 * 1024
ZIP_MAX_FILES = 500
ZIP_MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024

_EXCEL_SUFFIXES = {".xlsx", ".xls"}
_ZIP_SUFFIXES = {".zip"}
_DOCUMENT_SUFFIXES = {".docx", ".doc", ".odt"}


def _suffix(filename: str | None) -> str:
    if not filename:
        return ""
    return Path(filename).suffix.lower()


async def read_upload_bounded(file: UploadFile, *, max_bytes: int) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Fichier trop volumineux (max {max_bytes // (1024 * 1024)} Mo).",
            )
        chunks.append(chunk)
    return b"".join(chunks)


def assert_zip_archive(data: bytes) -> None:
    if len(data) < 4 or data[:2] != b"PK":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archive ZIP invalide.",
        )
    try:
        with zipfile.ZipFile(io.BytesIO(data), "r") as archive:
            infos = archive.infolist()
            if len(infos) > ZIP_MAX_FILES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Archive ZIP trop complexe (trop de fichiers).",
                )
            uncompressed = sum(info.file_size for info in infos)
            if uncompressed > ZIP_MAX_UNCOMPRESSED_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Archive ZIP trop volumineuse une fois décompressée.",
                )
            for info in infos:
                name = info.filename.replace("\\", "/")
                if name.startswith("/") or ".." in Path(name).parts:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Archive ZIP non autorisée (chemin suspect).",
                    )
    except zipfile.BadZipFile as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archive ZIP invalide ou corrompue.",
        ) from exc


async def read_validated_excel(file: UploadFile) -> bytes:
    if _suffix(file.filename) not in _EXCEL_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fichier Excel requis (.xlsx ou .xls).",
        )
    data = await read_upload_bounded(file, max_bytes=MAX_EXCEL_UPLOAD_BYTES)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Fichier vide.",
        )
    return data


async def read_validated_zip(file: UploadFile) -> bytes:
    if _suffix(file.filename) not in _ZIP_SUFFIXES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fichier ZIP requis (.zip).",
        )
    data = await read_upload_bounded(file, max_bytes=MAX_ZIP_UPLOAD_BYTES)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Fichier ZIP vide.",
        )
    assert_zip_archive(data)
    return data


async def read_validated_document(
    file: UploadFile,
    *,
    allowed_suffixes: set[str] | None = None,
    max_bytes: int = MAX_DOCUMENT_UPLOAD_BYTES,
) -> tuple[bytes, str]:
    allowed = allowed_suffixes or _DOCUMENT_SUFFIXES
    suffix = _suffix(file.filename)
    if suffix not in allowed:
        allowed_list = ", ".join(sorted(allowed))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Format accepté : {allowed_list}",
        )
    data = await read_upload_bounded(file, max_bytes=max_bytes)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Fichier vide.",
        )
    return data, file.filename or f"upload{suffix}"
