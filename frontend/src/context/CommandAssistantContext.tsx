import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface CommandAssistantContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandAssistantContext = createContext<CommandAssistantContextValue | null>(null);

export function CommandAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  const value = useMemo(() => ({ isOpen, open, close, toggle }), [close, isOpen, open, toggle]);

  return <CommandAssistantContext.Provider value={value}>{children}</CommandAssistantContext.Provider>;
}

export function useCommandAssistant() {
  const context = useContext(CommandAssistantContext);
  if (!context) {
    throw new Error("useCommandAssistant must be used within CommandAssistantProvider");
  }
  return context;
}
