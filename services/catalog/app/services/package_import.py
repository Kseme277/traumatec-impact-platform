"""Import versionné de paquets templates AO Alliance (upload ZIP)."""

from __future__ import annotations

import io
import logging
import os
import mimetypes
import re
import zipfile
from collections.abc import Callable
from pathlib import Path, PurePosixPath
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models.catalog import EventProfile, PackageBundle, PackageTemplate
from tip_common.package_analyzer import analyze_package_zip
from tip_common.package_types import (
    PACKAGE_TYPE_SPECS,
    filter_templates_by_package_duration,
    normalize_package_type,
)
from tip_common.redis_cache import invalidate_prefix
from tip_common.storage import PACKAGES_BUNDLES_PREFIX, get_object_storage

logger = logging.getLogger(__name__)


def _zip_arcname(filename: str) -> str:
    """Nom du fichier tel qu'il apparaît dans le ZIP importé (sans renommage canonique)."""
    return PurePosixPath(str(filename).replace("\\", "/")).name


async def _invalidate_templates_cache(settings: Settings) -> None:
    await invalidate_prefix(settings.redis_url, "tip:catalog:templates:")


def _import_scan_use_ai(explicit: bool | None = None) -> bool:
    """Analyse Mistral à l'import : désactivée par défaut (lente). Peut être forcée par requête ou CATALOG_IMPORT_SCAN_USE_AI."""
    if explicit is not None:
        return explicit
    return os.getenv("CATALOG_IMPORT_SCAN_USE_AI", "").strip().lower() in ("1", "true", "yes")

# Dossiers legacy / doublons — ne pas importer au bootstrap (utiliser PBO_S, pas ORP_S).
_BOOTSTRAP_SKIP_FOLDERS = frozenset({"ORP_S", "IEC_C", "PBO_F", "IEC_F"})


def _content_type(filename: str) -> str:
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def _template_code(package_type: str, version: int, filename: str) -> str:
    stem = PurePosixPath(filename).stem
    safe = re.sub(r"[^A-Za-z0-9]+", "_", stem).strip("_")[:36]
    return f"{package_type}-v{version}-{safe}"


async def _next_bundle_version(db: AsyncSession, package_type: str) -> int:
    result = await db.execute(
        select(func.coalesce(func.max(PackageBundle.version), 0)).where(
            PackageBundle.package_type == package_type
        )
    )
    current = int(result.scalar_one())
    return current + 1


async def _sync_profile_for_bundle(
    db: AsyncSession,
    bundle: PackageBundle,
    templates: list[PackageTemplate],
) -> EventProfile:
    spec = PACKAGE_TYPE_SPECS[bundle.package_type]
    result = await db.execute(
        select(EventProfile).where(EventProfile.package_type == bundle.package_type)
    )
    profile = result.scalar_one_or_none()
    sorted_templates = sorted(
        templates,
        key=lambda t: (t.placeholders or {}).get("package_file_order", 0),
    )
    if profile is None:
        profile = EventProfile(
            name=f"Paquet AO — {spec.label}",
            preparation_theme=spec.preparation_theme,
            package_type=bundle.package_type,
            event_type_label=spec.label,
            active_bundle_id=bundle.id,
            package_template_ids=[str(t.id) for t in sorted_templates],
            is_active=True,
        )
        db.add(profile)
    else:
        profile.name = f"Paquet AO — {spec.label}"
        profile.preparation_theme = spec.preparation_theme
        profile.event_type_label = spec.label
        profile.active_bundle_id = bundle.id
        profile.package_template_ids = [str(t.id) for t in sorted_templates]
        profile.is_active = True
    await db.flush()
    return profile


async def activate_package_bundle(
    db: AsyncSession,
    settings: Settings,
    bundle_id: UUID,
) -> PackageBundle:
    bundle = await db.get(PackageBundle, bundle_id)
    if bundle is None:
        raise ValueError("Version de paquet introuvable.")

    await db.execute(
        update(PackageBundle)
        .where(PackageBundle.package_type == bundle.package_type)
        .values(is_active=False)
    )
    bundle.is_active = True

    all_templates = (await db.execute(select(PackageTemplate))).scalars().all()
    bundle_templates: list[PackageTemplate] = []
    for tpl in all_templates:
        meta = tpl.placeholders or {}
        if meta.get("package_type") != bundle.package_type:
            continue
        is_target = str(meta.get("bundle_id")) == str(bundle.id)
        tpl.is_active = is_target
        if is_target:
            bundle_templates.append(tpl)

    if not bundle_templates:
        raise ValueError("Aucun fichier pour cette version.")

    await _sync_profile_for_bundle(db, bundle, bundle_templates)
    await db.commit()
    await db.refresh(bundle)
    await _invalidate_templates_cache(settings)
    return bundle


async def import_package_zip(
    db: AsyncSession,
    settings: Settings,
    *,
    zip_bytes: bytes,
    filename: str,
    uploaded_by_id: int | None,
    package_type_hint: str | None = None,
    notes: str | None = None,
    activate: bool = True,
    scan_use_ai: bool | None = None,
    on_progress: Callable[..., None] | None = None,
) -> dict:
    use_ai_for_scan = _import_scan_use_ai(scan_use_ai)
    if not zip_bytes:
        raise ValueError("Fichier ZIP vide.")
    if not filename.lower().endswith(".zip"):
        raise ValueError("Seuls les fichiers .zip sont acceptés.")

    analysis, entries = analyze_package_zip(
        zip_bytes,
        source_name=filename,
        package_type_hint=package_type_hint,
    )
    package_type = normalize_package_type(analysis.package_type) or analysis.package_type
    version = await _next_bundle_version(db, package_type)
    spec = PACKAGE_TYPE_SPECS.get(package_type) or PACKAGE_TYPE_SPECS[analysis.package_type]
    kept_names = {
        row["name"]
        for row in filter_templates_by_package_duration(
            [{"name": item.filename} for item in analysis.files],
            package_type=package_type,
            max_days=spec.duration_days,
        )
    }
    entries = [(name, data) for name, data in entries if name in kept_names]
    analysis.files = [item for item in analysis.files if item.filename in kept_names]
    if not entries:
        raise ValueError(
            f"Aucun fichier compatible avec la durée du paquet ({spec.duration_days} jour(s))."
        )

    storage = get_object_storage(settings)
    bundle_prefix = f"{PACKAGES_BUNDLES_PREFIX}{package_type.lower()}/v{version}/"

    zip_path = f"{bundle_prefix}{PurePosixPath(filename).name}"
    storage.upload_bytes(zip_path, zip_bytes, content_type="application/zip")

    bundle = PackageBundle(
        package_type=package_type,
        version=version,
        label=f"{spec.label} v{version}",
        source_zip_name=filename,
        zip_path=zip_path,
        file_count=len(entries),
        analysis_json=analysis.to_dict(),
        is_active=False,
        uploaded_by_id=uploaded_by_id,
        notes=notes,
    )
    db.add(bundle)
    await db.flush()

    entry_map = dict(entries)
    sorted_files = sorted(analysis.files, key=lambda f: f.order)

    async def _scan_fields(analyzed) -> tuple[str, dict]:
        data = entry_map.get(analyzed.filename)
        if data is None:
            raise ValueError(f"Fichier manquant dans le ZIP : {analyzed.filename}")
        if not analyzed.replaceable:
            return analyzed.filename, {}
        try:
            from tip_common.document_section_scanner import scan_document_sections

            scan = await scan_document_sections(
                filename=analyzed.filename,
                file_bytes=data,
                document_role=analyzed.document_role,
                use_ai=use_ai_for_scan,
            )
            return analyzed.filename, {
                "fields": scan.get("replacement_fields") or [],
                "classifier": scan.get("classifier"),
                "section_count": scan.get("section_count"),
                "samples": [
                    f.get("sample") for f in (scan.get("replacement_fields") or []) if f.get("sample")
                ],
            }
        except Exception as exc:
            logger.warning("Analyse champs %s : %s", analyzed.filename, exc)
            return analyzed.filename, {}

    total_files = len(sorted_files)
    field_by_name: dict[str, dict] = {}
    for index, analyzed in enumerate(sorted_files, start=1):
        label = "Variables {{ }}" if not use_ai_for_scan else "Analyse Mistral"
        if on_progress:
            on_progress(
                phase="analyzing",
                processed=index - 1,
                total=total_files,
                current_file=analyzed.filename,
                message=f"{label} : {analyzed.filename} ({index}/{total_files})",
            )
        name, fields = await _scan_fields(analyzed)
        field_by_name[name] = fields
        if on_progress:
            on_progress(
                phase="analyzing",
                processed=index,
                total=total_files,
                current_file=analyzed.filename,
                message=f"{label} : {analyzed.filename} ({index}/{total_files})",
            )

    if on_progress:
        on_progress(
            phase="saving",
            processed=total_files,
            total=total_files,
            current_file="",
            message="Enregistrement des fichiers et activation du paquet…",
        )

    created_templates: list[PackageTemplate] = []
    for analyzed in sorted_files:
        data = entry_map.get(analyzed.filename)
        if data is None:
            raise ValueError(f"Fichier manquant dans le ZIP : {analyzed.filename}")
        arcname = _zip_arcname(analyzed.filename)
        storage_key = f"{bundle_prefix}files/{arcname}"
        storage.upload_bytes(storage_key, data, content_type=_content_type(arcname))
        code = _template_code(package_type, version, arcname)
        field_analysis = field_by_name.get(analyzed.filename, {})

        meta = {
            "bundle_id": str(bundle.id),
            "bundle_version": version,
            "package_type": package_type,
            "package_file_order": analyzed.order,
            "source_file": arcname,
            "source_kind": "ao_package_zip",
            "file_format": analyzed.file_format,
            "document_role": analyzed.document_role,
            "replaceable": analyzed.replaceable,
            "highlight_samples": analyzed.highlight_samples,
            "replacement_fields": field_analysis.get("fields") or [],
            "field_analysis_classifier": field_analysis.get("classifier"),
            "field_samples": field_analysis.get("samples") or [],
            "section_count": field_analysis.get("section_count"),
            "document_sections": (field_analysis.get("fields") or [])[:40],
        }
        template = PackageTemplate(
            code=code,
            name=arcname,
            document_type=analyzed.document_role,
            file_path=storage_key,
            version=version,
            placeholders=meta,
            preparation_themes=[spec.preparation_theme],
            is_active=True,
        )
        db.add(template)
        await db.flush()
        created_templates.append(template)

    if activate:
        await db.execute(
            update(PackageBundle)
            .where(PackageBundle.package_type == package_type)
            .values(is_active=False)
        )
        bundle.is_active = True
        all_templates = (
            await db.execute(select(PackageTemplate).where(PackageTemplate.is_active.is_(True)))
        ).scalars().all()
        for tpl in all_templates:
            meta = tpl.placeholders or {}
            if meta.get("package_type") == package_type and meta.get("bundle_id") != str(bundle.id):
                tpl.is_active = False

        await _sync_profile_for_bundle(db, bundle, created_templates)

    await db.commit()
    await _invalidate_templates_cache(settings)
    logger.info(
        "Paquet importé : %s v%s (%s fichiers, activate=%s)",
        package_type,
        version,
        len(entries),
        activate,
    )
    return {
        "bundle_id": str(bundle.id),
        "package_type": package_type,
        "version": version,
        "file_count": len(entries),
        "is_active": bundle.is_active,
        "analysis": analysis.to_dict(),
        "templates_created": len(created_templates),
    }


def _candidate_package_roots() -> list[Path]:
    """Chemins possibles vers package-zips/ et Packages/ (Docker ou dépôt local)."""
    file_path = Path(__file__).resolve()
    candidates: list[Path] = [
        Path("/app/package-zips"),
        Path("/app/Packages"),
    ]
    for depth in range(2, min(6, len(file_path.parents))):
        root = file_path.parents[depth]
        candidates.extend([root / "package-zips", root / "Packages"])

    seen: set[str] = set()
    unique: list[Path] = []
    for path in candidates:
        key = str(path)
        if key not in seen:
            seen.add(key)
            unique.append(path)
    return unique


def _resolve_package_roots() -> tuple[Path | None, Path | None]:
    zips_dir: Path | None = None
    packages_dir: Path | None = None
    for path in _candidate_package_roots():
        if not path.is_dir():
            continue
        if path.name == "package-zips" and zips_dir is None:
            zips_dir = path
        if path.name == "Packages" and packages_dir is None:
            packages_dir = path
    return zips_dir, packages_dir


def _zip_package_folder(folder: Path) -> bytes:
    """Crée un ZIP en mémoire depuis Packages/{TYPE}/ (sans fichier .zip sur disque)."""
    files = [p for p in folder.iterdir() if p.is_file() and not p.name.startswith("~$")]
    if not files:
        raise ValueError(f"Aucun fichier dans {folder}")
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(files, key=lambda item: item.name):
            zf.write(path, arcname=path.name)
    return buffer.getvalue()


async def _bootstrap_import_type(
    db: AsyncSession,
    settings: Settings,
    *,
    package_type: str,
    zip_bytes: bytes,
    filename: str,
    notes: str,
    uploaded_by_id: int | None,
    force: bool,
) -> dict | None:
    if not force:
        existing = await db.execute(
            select(PackageBundle.id).where(PackageBundle.package_type == package_type).limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            return None
    return await import_package_zip(
        db,
        settings,
        zip_bytes=zip_bytes,
        filename=filename,
        uploaded_by_id=uploaded_by_id,
        package_type_hint=package_type,
        notes=notes,
        activate=True,
        scan_use_ai=False,
    )


async def bootstrap_system_packages(
    db: AsyncSession,
    settings: Settings,
    *,
    uploaded_by_id: int | None,
    force: bool = False,
) -> list[dict]:
    """Importe les paquets depuis package-zips/*.zip et/ou Packages/{TYPE}/ (ZIP généré à la volée)."""
    zips_dir, packages_dir = _resolve_package_roots()
    if zips_dir is None and packages_dir is None:
        raise ValueError(
            "Dossiers package-zips/ et Packages/ introuvables. "
            "Vérifiez les volumes Docker ou la racine du dépôt."
        )

    summaries: list[dict] = []
    imported_types: set[str] = set()

    if zips_dir is not None:
        for zip_path in sorted(zips_dir.glob("*.zip")):
            package_type = normalize_package_type(zip_path.stem.upper().replace("-", "_")) or ""
            summary = await _bootstrap_import_type(
                db,
                settings,
                package_type=package_type,
                zip_bytes=zip_path.read_bytes(),
                filename=zip_path.name,
                notes="Import automatique depuis package-zips/",
                uploaded_by_id=uploaded_by_id,
                force=force,
            )
            if summary:
                summaries.append(summary)
                imported_types.add(package_type)

    if packages_dir is not None:
        for folder in sorted(packages_dir.iterdir()):
            if not folder.is_dir() or folder.name.startswith("."):
                continue
            folder_code = folder.name.upper().replace("-", "_")
            if folder_code in _BOOTSTRAP_SKIP_FOLDERS:
                logger.info("Bootstrap : dossier %s ignoré (legacy/doublon)", folder.name)
                continue
            package_type = normalize_package_type(folder_code) or ""
            if package_type in imported_types and not force:
                continue
            try:
                raw = _zip_package_folder(folder)
            except ValueError:
                continue
            summary = await _bootstrap_import_type(
                db,
                settings,
                package_type=package_type,
                zip_bytes=raw,
                filename=f"{folder.name}.zip",
                notes=f"Import automatique depuis Packages/{folder.name}/",
                uploaded_by_id=uploaded_by_id,
                force=force,
            )
            if summary:
                summaries.append(summary)
                imported_types.add(package_type)

    return summaries


async def export_package_type_zip(
    db: AsyncSession,
    settings: Settings,
    package_type: str,
) -> tuple[bytes, str]:
    """Export ZIP pour un type — bundle actif ou templates du profil système."""
    code = package_type.upper().replace("-", "_")
    bundle_result = await db.execute(
        select(PackageBundle)
        .where(PackageBundle.package_type == code, PackageBundle.is_active.is_(True))
        .limit(1)
    )
    bundle = bundle_result.scalar_one_or_none()
    if bundle is not None:
        return await export_bundle_zip(db, settings, bundle.id)

    profile_result = await db.execute(
        select(EventProfile).where(
            EventProfile.package_type == code,
            EventProfile.is_active.is_(True),
        )
    )
    profile = profile_result.scalar_one_or_none()
    if profile is None or not profile.package_template_ids:
        raise ValueError(f"Aucun paquet actif pour {code}.")

    storage = get_object_storage(settings)
    template_ids = [UUID(str(tid)) for tid in profile.package_template_ids]
    tpl_result = await db.execute(
        select(PackageTemplate).where(
            PackageTemplate.id.in_(template_ids),
            PackageTemplate.is_active.is_(True),
        )
    )
    templates = list(tpl_result.scalars().all())
    if not templates:
        raise ValueError(f"Aucun fichier actif pour {code}.")

    order = {str(tid): idx for idx, tid in enumerate(profile.package_template_ids)}
    templates.sort(key=lambda t: order.get(str(t.id), 999))

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for tpl in templates:
            meta = tpl.placeholders or {}
            arcname = meta.get("source_file") or tpl.name
            data = storage.download_bytes(tpl.file_path)
            archive.writestr(arcname, data)

    return buffer.getvalue(), f"{code}.zip"


async def export_bundle_zip(
    db: AsyncSession,
    settings: Settings,
    bundle_id: UUID,
) -> tuple[bytes, str]:
    """Reconstruit un ZIP à partir des fichiers actuels du bundle (après éditions manuelles)."""
    bundle = await db.get(PackageBundle, bundle_id)
    if bundle is None:
        raise ValueError("Version de paquet introuvable.")

    storage = get_object_storage(settings)
    all_templates = (await db.execute(select(PackageTemplate))).scalars().all()
    bundle_templates = [
        tpl
        for tpl in all_templates
        if tpl.is_active
        and str((tpl.placeholders or {}).get("bundle_id")) == str(bundle_id)
    ]
    if not bundle_templates:
        raise ValueError("Aucun fichier actif pour cette version.")

    bundle_templates.sort(
        key=lambda t: (t.placeholders or {}).get("package_file_order", 0),
    )

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for tpl in bundle_templates:
            meta = tpl.placeholders or {}
            arcname = meta.get("source_file") or tpl.name
            data = storage.download_bytes(tpl.file_path)
            archive.writestr(arcname, data)

    filename = bundle.source_zip_name or f"{bundle.package_type}_v{bundle.version}.zip"
    return buffer.getvalue(), filename


async def delete_package_bundle(
    db: AsyncSession,
    settings: Settings,
    bundle_id: UUID,
) -> None:
    bundle = await db.get(PackageBundle, bundle_id)
    if bundle is None:
        raise ValueError("Version de paquet introuvable.")
    if bundle.is_active:
        raise ValueError("Impossible de supprimer la version active. Activez une autre version d'abord.")

    storage = get_object_storage(settings)
    templates = (await db.execute(select(PackageTemplate))).scalars().all()
    for tpl in templates:
        meta = tpl.placeholders or {}
        if str(meta.get("bundle_id")) != str(bundle_id):
            continue
        try:
            storage.delete(tpl.file_path)
        except Exception:
            logger.warning("Suppression stockage échouée : %s", tpl.file_path)
        await db.delete(tpl)

    try:
        storage.delete(bundle.zip_path)
    except Exception:
        logger.warning("Suppression ZIP échouée : %s", bundle.zip_path)

    await db.delete(bundle)
    await db.commit()
    await _invalidate_templates_cache(settings)
