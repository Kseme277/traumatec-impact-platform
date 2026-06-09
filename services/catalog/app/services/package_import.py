"""Import versionné de paquets templates AO Alliance (upload ZIP)."""

from __future__ import annotations

import io
import logging
import mimetypes
import re
import zipfile
from pathlib import Path, PurePosixPath
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models.catalog import EventProfile, PackageBundle, PackageTemplate
from tip_common.package_analyzer import analyze_package_zip
from tip_common.package_types import PACKAGE_TYPE_SPECS
from tip_common.storage import PACKAGES_BUNDLES_PREFIX, get_object_storage

logger = logging.getLogger(__name__)


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


async def activate_package_bundle(db: AsyncSession, bundle_id: UUID) -> PackageBundle:
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
) -> dict:
    if not zip_bytes:
        raise ValueError("Fichier ZIP vide.")
    if not filename.lower().endswith(".zip"):
        raise ValueError("Seuls les fichiers .zip sont acceptés.")

    analysis, entries = analyze_package_zip(
        zip_bytes,
        source_name=filename,
        package_type_hint=package_type_hint,
    )
    package_type = analysis.package_type
    version = await _next_bundle_version(db, package_type)
    spec = PACKAGE_TYPE_SPECS[package_type]
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
    created_templates: list[PackageTemplate] = []
    for analyzed in sorted(analysis.files, key=lambda f: f.order):
        data = entry_map.get(analyzed.filename)
        if data is None:
            raise ValueError(f"Fichier manquant dans le ZIP : {analyzed.filename}")
        arcname = analyzed.filename
        storage_key = f"{bundle_prefix}files/{arcname}"
        storage.upload_bytes(storage_key, data, content_type=_content_type(arcname))
        code = _template_code(package_type, version, arcname)
        field_analysis: dict = {}
        if analyzed.replaceable:
            try:
                from tip_common.document_section_scanner import scan_document_sections

                scan = await scan_document_sections(
                    filename=arcname,
                    file_bytes=data,
                    document_role=analyzed.document_role,
                    use_ai=True,
                )
                field_analysis = {
                    "fields": scan.get("replacement_fields") or [],
                    "classifier": scan.get("classifier"),
                    "section_count": scan.get("section_count"),
                    "samples": [
                        f.get("sample") for f in (scan.get("replacement_fields") or []) if f.get("sample")
                    ],
                }
            except Exception as exc:
                logger.warning("Analyse champs %s : %s", arcname, exc)

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


def _resolve_package_zips_dir() -> Path:
    """Repère package-zips/ (Docker : /app/package-zips, local : racine du dépôt)."""
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

    for zips_dir in unique:
        if zips_dir.is_dir() and any(zips_dir.glob("*.zip")):
            return zips_dir
    for packages_dir in unique:
        if packages_dir.is_dir() and packages_dir.name == "Packages":
            if any(p.is_dir() for p in packages_dir.iterdir()):
                return packages_dir
    raise ValueError(
        "Dossier package-zips/ introuvable. "
        "Vérifiez le volume Docker (package-zips) ou exécutez scripts/build_package_zips.py."
    )


async def bootstrap_system_packages(
    db: AsyncSession,
    settings: Settings,
    *,
    uploaded_by_id: int | None,
    force: bool = False,
) -> list[dict]:
    """Importe les ZIP de package-zips/ (ou crée depuis Packages/) si absent."""
    zips_dir = _resolve_package_zips_dir()
    if not zips_dir.is_dir():
        raise ValueError(f"Dossier introuvable : {zips_dir}")

    zip_files = sorted(zips_dir.glob("*.zip"))
    if not zip_files:
        raise ValueError(f"Aucun fichier .zip dans {zips_dir}")

    summaries: list[dict] = []
    for zip_path in zip_files:
        package_type = zip_path.stem.upper().replace("-", "_")
        if not force:
            existing = await db.execute(
                select(PackageBundle.id)
                .where(PackageBundle.package_type == package_type)
                .limit(1)
            )
            if existing.scalar_one_or_none() is not None:
                continue

        raw = zip_path.read_bytes()
        summary = await import_package_zip(
            db,
            settings,
            zip_bytes=raw,
            filename=zip_path.name,
            uploaded_by_id=uploaded_by_id,
            package_type_hint=package_type,
            notes="Import automatique depuis package-zips/",
            activate=True,
        )
        summaries.append(summary)
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

