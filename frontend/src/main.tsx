import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import ClerkRootProvider from "./components/auth/ClerkRootProvider.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { LanguageProvider } from "./context/LanguageContext.tsx";
import { TipAuthProvider } from "./context/TipAuthContext.tsx";

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
            <TipAuthProvider>
              <App />
            </TipAuthProvider>
          </AppWrapper>
        </LanguageProvider>
      </ThemeProvider>
    </ClerkRootProvider>
  </StrictMode>,
);
