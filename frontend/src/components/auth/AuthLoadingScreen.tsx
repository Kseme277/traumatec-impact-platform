import TipSplashLoader from "../brand/TipSplashLoader";

interface AuthLoadingScreenProps {
  message?: string;
}

export default function AuthLoadingScreen({ message }: AuthLoadingScreenProps) {
  return <TipSplashLoader message={message} />;
}
