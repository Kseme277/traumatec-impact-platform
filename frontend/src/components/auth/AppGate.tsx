import { useAuth } from "@clerk/clerk-react";
import App from "../../App";
import { TipAuthProvider } from "../../context/TipAuthContext";
import AuthLoadingScreen from "./AuthLoadingScreen";

/** Loader global au démarrage du site (initialisation Clerk). */
export default function AppGate() {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return <AuthLoadingScreen />;
  }

  return (
    <TipAuthProvider>
      <App />
    </TipAuthProvider>
  );
}
