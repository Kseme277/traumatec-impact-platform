from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.catalog import EventProfile, PackageTemplate
from app.schemas.catalog import ParcoursResponse, ParcoursStepResponse
from tip_common.package_types import PACKAGE_TYPE_SPECS


async def list_parcours(db: AsyncSession) -> list[ParcoursResponse]:
    result = await db.execute(
        select(EventProfile)
        .where(EventProfile.is_active.is_(True))
        .order_by(EventProfile.preparation_theme)
    )
    profiles = result.scalars().all()
    out: list[ParcoursResponse] = []

    for profile in profiles:
        theme = profile.preparation_theme or ""
        pkg_type = profile.package_type or ""
        spec = PACKAGE_TYPE_SPECS.get(pkg_type)
        default_name = spec.title if spec else profile.name
        template_ids: list[UUID] = []
        for tid in profile.package_template_ids or []:
            try:
                template_ids.append(UUID(str(tid)))
            except (ValueError, TypeError):
                continue
        steps: list[ParcoursStepResponse] = []

        if template_ids:
            tpl_result = await db.execute(
                select(PackageTemplate).where(PackageTemplate.id.in_(template_ids))
            )
            templates = {
                t.id: t
                for t in sorted(
                    tpl_result.scalars().all(),
                    key=lambda t: (t.placeholders or {}).get(
                    "package_file_order", (t.placeholders or {}).get("seminar_step", 0)
                ),
                )
            }
            for tid in template_ids:
                tpl = templates.get(tid)
                if not tpl:
                    continue
                meta = tpl.placeholders or {}
                order = int(meta.get("package_file_order", meta.get("seminar_step", 0)))
                steps.append(
                    ParcoursStepResponse(
                        step=order,
                        code=tpl.code,
                        name=tpl.name,
                        template_id=tpl.id,
                        file_format=str(meta.get("file_format", "docx")),
                    )
                )

        pkg_code = profile.package_type or theme
        out.append(
            ParcoursResponse(
                code=pkg_code,
                name=profile.name or default_name,
                preparation_theme=theme,
                package_type=profile.package_type,
                event_type_label=profile.event_type_label,
                activity_kind=spec.activity_kind if spec else None,
                activity_label=spec.activity_label if spec else None,
                file_count=len(steps),
                seminar_count=len(steps),
                steps=steps,
            )
        )
    return out
