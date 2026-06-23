import { useAuth } from "@clerk/clerk-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminBreadcrumb from "../../components/common/AdminBreadcrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import TableLoader from "../../components/common/TableLoader";
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
  updateTeacher,
  type Teacher,
  type TeacherPayload,
} from "../../api/teachers";
import { getApiToken } from "../../lib/clerkToken";
import { showError, showSuccess } from "../../lib/swal";
import { useTranslation } from "../../i18n/useTranslation";

type Tab = "nationals" | "teachers";

const emptyNational: NationalContactPayload = {
  full_name: "",
  email: "",
  phone: "",
  country: "",
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
      country: contact.country ?? "",
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
        ...nationalForm,
        full_name: nationalForm.full_name.trim(),
        email: nationalForm.email?.trim() || null,
        phone: nationalForm.phone?.trim() || null,
        country: nationalForm.country?.trim() || null,
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

  return (
    <>
      <PageMeta title="Référentiels | TIP" description="Responsables nationaux et enseignants" />
      <AdminBreadcrumb
        pageTitle="Référentiels"
        crumbs={[{ label: t("nav.admin"), to: "/admin/utilisateurs" }]}
      />

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "nationals" ? "bg-brand-500 text-white" : "border border-gray-200 dark:border-gray-700"
          }`}
          onClick={() => setTab("nationals")}
        >
          Responsables nationaux
        </button>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "teachers" ? "bg-brand-500 text-white" : "border border-gray-200 dark:border-gray-700"
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
              <div>
                <Label>Pays</Label>
                <Input
                  value={nationalForm.country ?? ""}
                  onChange={(e) => setNationalForm({ ...nationalForm, country: e.target.value })}
                  placeholder="Sénégal"
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
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-3 py-2 text-left">Nom</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Téléphone</th>
                      <th className="px-3 py-2 text-left">Pays</th>
                      <th className="px-3 py-2 text-left">Statut</th>
                      <th className="px-3 py-2 text-left" />
                    </tr>
                  </thead>
                  <tbody>
                    {nationals.map((c) => (
                      <tr key={c.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-3 py-2">{c.full_name}</td>
                        <td className="px-3 py-2">{c.email ?? "—"}</td>
                        <td className="px-3 py-2">{c.phone ?? "—"}</td>
                        <td className="px-3 py-2">{c.country ?? "—"}</td>
                        <td className="px-3 py-2">
                          <Badge color={c.is_active ? "success" : "light"} size="sm">
                            {c.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => startEditNational(c)}>
                            Modifier
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            {loading ? (
              <TableLoader message={t("common.loading")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-3 py-2 text-left">Nom</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Téléphone</th>
                      <th className="px-3 py-2 text-left">Statut</th>
                      <th className="px-3 py-2 text-left" />
                    </tr>
                  </thead>
                  <tbody>
                    {teachers.map((teacher) => (
                      <tr key={teacher.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-3 py-2">
                          {teacher.first_name} {teacher.last_name}
                        </td>
                        <td className="px-3 py-2">{teacher.email ?? "—"}</td>
                        <td className="px-3 py-2">{teacher.phone ?? "—"}</td>
                        <td className="px-3 py-2">
                          <Badge color={teacher.is_active ? "success" : "light"} size="sm">
                            {teacher.is_active ? "Actif" : "Inactif"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => startEditTeacher(teacher)}>
                            Modifier
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ComponentCard>
        </div>
      )}
    </>
  );
}
