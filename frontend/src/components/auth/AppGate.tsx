import { useAuth } from "@clerk/clerk-react";
import { SWRConfig } from "swr";
import App from "../../App";
import { TipAuthProvider } from "../../context/TipAuthContext";
import { tipSwrDefaults } from "../../lib/swr";
import AuthLoadingScreen from "./AuthLoadingScreen";

/** Loader global au démarrage du site (initialisation Clerk). */
export default function AppGate() {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return <AuthLoadingScreen />;
  }

  return (
    <SWRConfig value={tipSwrDefaults}>
      <TipAuthProvider>
        <App />
      </TipAuthProvider>
    </SWRConfig>
  );
}
