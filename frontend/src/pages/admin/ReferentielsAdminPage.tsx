import { useAuth } from "@clerk/clerk-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import AdminBreadcrumb from "../../components/common/AdminBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import DataTablePagination from "../../components/common/DataTablePagination";
import PageMeta from "../../components/common/PageMeta";
import TableLoader from "../../components/common/TableLoader";
import {
  DATA_TABLE,
  DATA_TABLE_HEAD,
  DATA_TABLE_ROW,
  DATA_TABLE_TD,
  DATA_TABLE_TH,
} from "../../components/common/dataTableClasses";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Switch from "../../components/form/switch/Switch";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import { ApiError } from "../../api/client";
import {
  createNationalContact,
  fetchNationalContacts,
  updateNationalContact,
  type NationalContact,
  type NationalContactPayload,
} from "../../api/nationalContacts";
import {
  createTeacher,
  fetchTeachers,
  syncTeachersFromParticipants,
  updateTeacher,
  type Teacher,
  type TeacherPayload,
} from "../../api/teachers";
import { getApiToken } from "../../lib/clerkToken";
import { confirmAction, showError, showSuccess } from "../../lib/swal";
import { usePagination } from "../../hooks/usePagination";
import { useTranslation } from "../../i18n/useTranslation";

const REFERENTIALS_PAGE_SIZE = 10;

type Tab = "nationals" | "teachers";

const emptyNational: NationalContactPayload = {
  full_name: "",
  email: "",
  phone: "",
  is_active: true,
};

const emptyTeacher: TeacherPayload = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  is_active: true,
};

export default function ReferentielsAdminPage() {
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("nationals");
  const [loading, setLoading] = useState(true);
  const [nationals, setNationals] = useState<NationalContact[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [editingNationalId, setEditingNationalId] = useState<string | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [nationalForm, setNationalForm] = useState<NationalContactPayload>(emptyNational);
  const [teacherForm, setTeacherForm] = useState<TeacherPayload>(emptyTeacher);
  const [saving, setSaving] = useState(false);
  const [syncingTeachers, setSyncingTeachers] = useState(false);

  const nationalsPagination = usePagination(nationals, REFERENTIALS_PAGE_SIZE, `nationals-${nationals.length}`);
  const teachersPagination = usePagination(teachers, REFERENTIALS_PAGE_SIZE, `teachers-${teachers.length}`);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getApiToken(getToken);
      const [nationalRes, teacherRes] = await Promise.all([
        fetchNationalContacts(token, { activeOnly: false }),
        fetchTeachers(token, { activeOnly: false }),
      ]);
      setNationals(nationalRes.items);
      setTeachers(teacherRes.items);
    } catch (err) {
      showError(t("common.error"), err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [getToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function resetNationalForm() {
    setEditingNationalId(null);
    setNationalForm(emptyNational);
  }

  function resetTeacherForm() {
    setEditingTeacherId(null);
    setTeacherForm(emptyTeacher);
  }

  function startEditNational(contact: NationalContact) {
    setEditingNationalId(contact.id);
    setNationalForm({
      full_name: contact.full_name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      is_active: contact.is_active,
    });
  }

  function startEditTeacher(teacher: Teacher) {
    setEditingTeacherId(teacher.id);
    setTeacherForm({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email ?? "",
      phone: teacher.phone ?? "",
      is_active: teacher.is_active,
    });
  }

  async function handleNationalSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nationalForm.full_name.trim()) return;
    setSaving(true);
    try {
      const token = await getApiToken(getToken);
      const payload = {
        full_name: nationalForm.full_name.trim(),
        email: nationalForm.email?.trim() || null,
        phone: nationalForm.phone?.trim() || null,
        country: null,
        is_active: nationalForm.is_active ?? true,
      };
      if (editingNationalId) {
        await updateNationalContact(token, editingNationalId, payload);
        showSuccess("Responsable national mis à jour");
      } else {
        await createNationalContact(token, payload);
        showSuccess("Responsable national ajouté");
      }
      resetNationalForm();
      await load();
    } catch (err) {
      showError(t("common.error"), err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTeacherSubmit(e: FormEvent) {
    e.preventDefault();
    if (!teacherForm.first_name.trim() || !teacherForm.last_name.trim()) return;
    setSaving(true);
    try {
      const token = await getApiToken(getToken);
      const payload = {
        ...teacherForm,
        first_name: teacherForm.first_name.trim(),
        last_name: teacherForm.last_name.trim(),
        email: teacherForm.email?.trim() || null,
        phone: teacherForm.phone?.trim() || null,
      };
      if (editingTeacherId) {
        await updateTeacher(token, editingTeacherId, payload);
        showSuccess("Enseignant mis à jour");
      } else {
        await createTeacher(token, payload);
        showSuccess("Enseignant ajouté");
      }
      resetTeacherForm();
      await load();
    } catch (err) {
      showError(t("common.error"), err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncTeachersFromCertificates() {
    const confirmed = await confirmAction({
      title: "Importer les enseignants des certificats ?",
      text: "Les enseignants détectés lors des imports d'inscriptions seront ajoutés au référentiel (nom, email, téléphone) et reliés aux événements concernés.",
      confirmText: t("confirm.proceed"),
      cancelText: t("common.cancel"),
    });
    if (!confirmed.isConfirmed) return;
    setSyncingTeachers(true);
    try {
      const token = await getApiToken(getToken);
      const result = await syncTeachersFromParticipants(token);
      await load();
      await showSuccess(
        "Synchronisation terminée",
        `${result.processed} enseignant(s) traité(s) — ${result.teachers_created} créé(s), ${result.event_links_created} lien(s) événement ajouté(s).`,
      );
    } catch (err) {
      showError(t("common.error"), err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setSyncingTeachers(false);
    }
  }

  return (
    <>
      <PageMeta title="Référentiels | TIP" description="Responsables nationaux et enseignants" />
      <AdminBreadcrumb
        pageTitle="Référentiels"
        crumbs={[{ label: t("nav.admin"), to: "/admin/utilisateurs" }]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{t("documents.catalogAdminTitle")}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("documents.catalogAdminDesc")}</p>
        </div>
        <Link to="/admin/referentiels/types-paquets">
          <Button size="sm" variant="outline">{t("documents.manageCatalog")}</Button>
        </Link>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "nationals"
              ? "bg-brand-500 text-white"
              : "border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          }`}
          onClick={() => setTab("nationals")}
        >
          Responsables nationaux
        </button>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab === "teachers"
              ? "bg-brand-500 text-white"
              : "border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          }`}
          onClick={() => setTab("teachers")}
        >
          Enseignants
        </button>
      </div>

      {tab === "nationals" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <ComponentCard
            className="lg:col-span-1"
            title={editingNationalId ? "Modifier le contact" : "Nouveau responsable national"}
            desc="Acteur externe — ne se connecte pas au TIP"
          >
            <form onSubmit={(e) => void handleNationalSubmit(e)} className="space-y-4">
              <div>
                <Label>Nom complet *</Label>
                <Input
                  value={nationalForm.full_name}
                  onChange={(e) => setNationalForm({ ...nationalForm, full_name: e.target.value })}
                  placeholder="Dominique Nkoa"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={nationalForm.email ?? ""}
                  onChange={(e) => setNationalForm({ ...nationalForm, email: e.target.value })}
                  placeholder="national@exemple.org"
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={nationalForm.phone ?? ""}
                  onChange={(e) => setNationalForm({ ...nationalForm, phone: e.target.value })}
                  placeholder="+221 77 000 00 00"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  label="Actif"
                  checked={nationalForm.is_active ?? true}
                  onChange={(checked) => setNationalForm({ ...nationalForm, is_active: checked })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? t("common.saving") : editingNationalId ? t("common.save") : "Ajouter"}
                </Button>
                {editingNationalId ? (
                  <Button type="button" size="sm" variant="outline" onClick={resetNationalForm}>
                    {t("common.cancel")}
                  </Button>
                ) : null}
              </div>
            </form>
          </ComponentCard>

          <ComponentCard className="lg:col-span-2" title="Liste des responsables nationaux">
            {loading ? (
              <TableLoader message={t("common.loading")} />
            ) : (
              <div className="overflow-x-auto">
                <table className={DATA_TABLE}>
                  <thead className={DATA_TABLE_HEAD}>
                    <tr>
                      <th className={DATA_TABLE_TH}>Nom</th>
                      <th className={DATA_TABLE_TH}>Email</th>
                      <th className={DATA_TABLE_TH}>Téléphone</th>
                      <th className={DATA_TABLE_TH}>Statut</th>
                      <th className={DATA_TABLE_TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {nationalsPagination.paginatedItems.map((c) => (
                      <tr key={c.id} className={DATA_TABLE_ROW}>
                        <td className={DATA_TABLE_TD}>{c.full_name}</td>
                        <td className={DATA_TABLE_TD}>{c.email ?? "—"}</td>
                        <td className={DATA_TABLE_TD}>{c.phone ?? "—"}</td>
                        <td className={DATA_TABLE_TD}>
                          <Badge color={c.is_active ? "success" : "light"} size="sm">
                            {c.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </td>
                        <td className={DATA_TABLE_TD}>
                          <Button type="button" size="sm" variant="outline" onClick={() => startEditNational(c)}>
                            Modifier
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <DataTablePagination
                  page={nationalsPagination.page}
                  totalPages={nationalsPagination.totalPages}
                  totalItems={nationalsPagination.totalItems}
                  rangeStart={nationalsPagination.rangeStart}
                  rangeEnd={nationalsPagination.rangeEnd}
                  onPageChange={nationalsPagination.setPage}
                />
              </div>
            )}
          </ComponentCard>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <ComponentCard
            className="lg:col-span-1"
            title={editingTeacherId ? "Modifier l'enseignant" : "Nouvel enseignant"}
          >
            <form onSubmit={(e) => void handleTeacherSubmit(e)} className="space-y-4">
              <div>
                <Label>Prénom *</Label>
                <Input
                  value={teacherForm.first_name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input
                  value={teacherForm.last_name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, last_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={teacherForm.email ?? ""}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={teacherForm.phone ?? ""}
                  onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  label="Actif"
                  checked={teacherForm.is_active ?? true}
                  onChange={(checked) => setTeacherForm({ ...teacherForm, is_active: checked })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? t("common.saving") : editingTeacherId ? t("common.save") : "Ajouter"}
                </Button>
                {editingTeacherId ? (
                  <Button type="button" size="sm" variant="outline" onClick={resetTeacherForm}>
                    {t("common.cancel")}
                  </Button>
                ) : null}
              </div>
            </form>
          </ComponentCard>

          <ComponentCard className="lg:col-span-2" title="Liste des enseignants">
            <div className="mb-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={syncingTeachers || loading}
                onClick={() => void handleSyncTeachersFromCertificates()}
              >
                {syncingTeachers ? t("common.loading") : "Importer depuis les certificats"}
              </Button>
            </div>
            {loading ? (
              <TableLoader message={t("common.loading")} />
            ) : (
              <div className="overflow-x-auto">
                <table className={DATA_TABLE}>
                  <thead className={DATA_TABLE_HEAD}>
                    <tr>
                      <th className={DATA_TABLE_TH}>Nom</th>
                      <th className={DATA_TABLE_TH}>Email</th>
                      <th className={DATA_TABLE_TH}>Téléphone</th>
                      <th className={DATA_TABLE_TH}>Statut</th>
                      <th className={DATA_TABLE_TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {teachersPagination.paginatedItems.map((teacher) => (
                      <tr key={teacher.id} className={DATA_TABLE_ROW}>
                        <td className={DATA_TABLE_TD}>
                          {teacher.first_name} {teacher.last_name}
                        </td>
                        <td className={DATA_TABLE_TD}>{teacher.email ?? "—"}</td>
                        <td className={DATA_TABLE_TD}>{teacher.phone ?? "—"}</td>
                        <td className={DATA_TABLE_TD}>
                          <Badge color={teacher.is_active ? "success" : "light"} size="sm">
                            {teacher.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </td>
                        <td className={DATA_TABLE_TD}>
                          <Button type="button" size="sm" variant="outline" onClick={() => startEditTeacher(teacher)}>
                            Modifier
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <DataTablePagination
                  page={teachersPagination.page}
                  totalPages={teachersPagination.totalPages}
                  totalItems={teachersPagination.totalItems}
                  rangeStart={teachersPagination.rangeStart}
                  rangeEnd={teachersPagination.rangeEnd}
                  onPageChange={teachersPagination.setPage}
                />
              </div>
            )}
          </ComponentCard>
        </div>
      )}
    </>
  );
}
