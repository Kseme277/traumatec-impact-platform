import { FormEvent, useState } from "react";
import { Link } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { isClerkAPIResponseError } from "@clerk/clerk-react/errors";

export default function ModifMotDePasse() {
  const { user, isLoaded } = useUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    try {
      await user.updatePassword({ currentPassword, newPassword });
      setSuccess("Mot de passe mis à jour avec succès.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Échec de la mise à jour");
      } else {
        setError("Impossible de modifier le mot de passe.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6">
        <Link to="/profil" className="text-sm text-brand-500 hover:underline">
          ← Retour au profil
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
          Modifier mon mot de passe
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Utilisez un mot de passe fort d&apos;au moins 8 caractères.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="current" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Mot de passe actuel
          </label>
          <input
            id="current"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div>
          <label htmlFor="new" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nouveau mot de passe
          </label>
          <input
            id="new"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Confirmer le mot de passe
          </label>
          <input
            id="confirm"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={!isLoaded || isSubmitting}
          className="h-11 w-full rounded-lg bg-brand-500 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-slate-900"
        >
          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
