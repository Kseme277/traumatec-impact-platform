import TipSplashLoader from "../brand/TipSplashLoader";
import SpinnerLoader from "../common/SpinnerLoader";

interface AuthLoadingScreenProps {
  message?: string;
  /** Plein écran Traumatec — réservé au démarrage et à la session post-connexion. */
  splash?: boolean;
}

export default function AuthLoadingScreen({ message, splash = true }: AuthLoadingScreenProps) {
  if (!splash) {
    return <SpinnerLoader message={message} className="min-h-[40vh]" />;
  }
  return <TipSplashLoader message={message} />;
}
