import { useEffect, useState } from "react";
import { Link } from "react-router";
import ComponentCard from "../../../components/common/ComponentCard";
import Switch from "../../../components/form/switch/Switch";
import Badge from "../../../components/ui/badge/Badge";
import Button from "../../../components/ui/button/Button";
import type { Utilisateur } from "../../auth/types";
import { roleLabel } from "../../auth/types";
import { useTipAuth } from "../../../context/TipAuthContext";

interface UtilisateurDetailCardProps {
  user: Utilisateur;
  isToggling: boolean;
  isResending: boolean;
  onToggle: (user: Utilisateur) => Promise<boolean>;
  onResend: (user: Utilisateur) => Promise<boolean>;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-gray-100 py-4 last:border-0 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-theme-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <div className="text-theme-sm text-gray-800 dark:text-white/90">{children}</div>
    </div>
  );
}

export default function UtilisateurDetailCard({
  user,
  isToggling,
  isResending,
  onToggle,
  onResend,
}: UtilisateurDetailCardProps) {
  const { tipUser } = useTipAuth();
  const isSelf = tipUser?.id === user.id;
  const [active, setActive] = useState(user.est_actif);

  useEffect(() => {
    setActive(user.est_actif);
  }, [user.est_actif]);

  const handleSwitch = async () => {
    const previous = active;
    setActive(!previous);
    const ok = await onToggle(user);
    if (!ok) {
      setActive(previous);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <ComponentCard title="Profil" desc="Informations du compte invité" className="xl:col-span-2">
        <DetailRow label="Nom complet">
          {user.prenom} {user.nom}
        </DetailRow>
        <DetailRow label="Email">{user.email}</DetailRow>
        <DetailRow label="Rôle">
          <Badge color="primary" size="sm">
            {roleLabel(user.role)}
          </Badge>
        </DetailRow>
        <DetailRow label="Identifiant Clerk">
          <span className="font-mono text-theme-xs">{user.clerk_id ?? "—"}</span>
        </DetailRow>
        <DetailRow label="Créé le">
          {new Date(user.created_at).toLocaleString("fr-FR")}
        </DetailRow>
      </ComponentCard>

      <ComponentCard title="Accès" desc="Activation et invitation">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">Compte actif</p>
              <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                {active ? "L'utilisateur peut se connecter" : "Accès suspendu"}
              </p>
            </div>
            <Switch
              checked={active}
              disabled={isToggling || isSelf}
              aria-label={`Statut de ${user.email}`}
              onChange={() => void handleSwitch()}
            />
          </div>

          {isSelf && (
            <p className="text-theme-xs text-warning-600 dark:text-orange-400">
              Vous ne pouvez pas désactiver votre propre compte.
            </p>
          )}

          <Badge color={active ? "success" : "light"} size="sm">
            {active ? "Actif" : "Inactif"}
          </Badge>

          <Button
            className="w-full"
            variant="outline"
            size="sm"
            disabled={!active || isResending}
            onClick={() => void onResend(user)}
          >
            {isResending ? "Envoi..." : "Renvoyer l'invitation"}
          </Button>

          <Link to="/admin/utilisateurs">
            <Button className="w-full" variant="outline" size="sm">
              Retour à la liste
            </Button>
          </Link>
        </div>
      </ComponentCard>
    </div>
  );
}
