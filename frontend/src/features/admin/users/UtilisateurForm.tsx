import { FormEvent, useState } from "react";
import Label from "../../../components/form/Label";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import Button from "../../../components/ui/button/Button";
import type { RoleUtilisateur, UtilisateurCreatePayload } from "../../auth/types";

const roleOptions = [
  { value: "preparateur", label: "Préparateur" },
  { value: "administrateur", label: "Administrateur" },
];

interface UtilisateurFormProps {
  initial?: UtilisateurCreatePayload;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: (payload: UtilisateurCreatePayload) => Promise<void>;
  onCancel?: () => void;
}

export default function UtilisateurForm({
  initial = { email: "", nom: "", prenom: "", role: "preparateur" },
  isSubmitting = false,
  submitLabel = "Créer et inviter",
  onSubmit,
  onCancel,
}: UtilisateurFormProps) {
  const [form, setForm] = useState<UtilisateurCreatePayload>(initial);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <Label>
            Prénom <span className="text-error-500">*</span>
          </Label>
          <Input
            required
            value={form.prenom}
            onChange={(e) => setForm({ ...form, prenom: e.target.value })}
            placeholder="Prénom"
          />
        </div>
        <div>
          <Label>
            Nom <span className="text-error-500">*</span>
          </Label>
          <Input
            required
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            placeholder="Nom"
          />
        </div>
      </div>

      <div>
        <Label>
          Email <span className="text-error-500">*</span>
        </Label>
        <Input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="vous@traumatec.org"
        />
      </div>

      <div>
        <Label>
          Rôle <span className="text-error-500">*</span>
        </Label>
        <Select
          options={roleOptions}
          defaultValue={form.role}
          onChange={(value) => setForm({ ...form, role: value as RoleUtilisateur })}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
            Annuler
          </Button>
        )}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Envoi..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
