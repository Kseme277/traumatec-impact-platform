import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import AppGate from "./components/auth/AppGate.tsx";
import ClerkRootProvider from "./components/auth/ClerkRootProvider.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { LanguageProvider } from "./context/LanguageContext.tsx";
import { purgeLegacyAuthTokens } from "./lib/tokenStorage.ts";

purgeLegacyAuthTokens();
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY est requis dans .env");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkRootProvider publishableKey={clerkPublishableKey}>
      <ThemeProvider>
        <LanguageProvider>
          <AppWrapper>
            <AppGate />
          </AppWrapper>
        </LanguageProvider>
      </ThemeProvider>
    </ClerkRootProvider>
  </StrictMode>,
);
