import AdminBreadcrumb from "../components/common/AdminBreadcrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageMeta from "../components/common/PageMeta";
import PackageTemplatesManager from "../features/documents/PackageTemplatesManager";
import { useTipAuth } from "../context/TipAuthContext";
import { useTranslation } from "../i18n/useTranslation";

export default function DocumentsTemplatesPage() {
  const { t } = useTranslation();
  const { isAdmin } = useTipAuth();

  return (
    <>
      <PageMeta
        title={`${t("documents.templatesTitle")} | TIP`}
        description={t("documents.templatesMeta")}
      />
      <AdminBreadcrumb
        pageTitle={t("documents.templatesTitle")}
        crumbs={[{ label: t("nav.documents"), to: "/documents/templates" }]}
      />

      <ComponentCard title={t("documents.templatesManageTitle")} desc={t("documents.templatesManageDesc")}>
        <PackageTemplatesManager isAdmin={isAdmin} />
      </ComponentCard>

      <ComponentCard title={t("documents.variablesTitle")} desc={t("documents.variablesDesc")} className="mt-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("documents.variablesHint")}</p>
      </ComponentCard>
    </>
  );
}
