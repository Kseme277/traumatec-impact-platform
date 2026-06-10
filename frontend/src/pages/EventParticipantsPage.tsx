import { Navigate, useParams } from "react-router";

/** Redirection vers la page dédiée Certificats (sidebar). */
export default function EventParticipantsPage() {
  const { id } = useParams();
  if (!id) return <Navigate to="/certificats" replace />;
  return <Navigate to={`/certificats?event=${id}`} replace />;
}
