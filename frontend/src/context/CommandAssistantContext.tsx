import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface CommandAssistantContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  openWithMessage: (message: string) => void;
  consumeSeedMessage: () => string | null;
}

const CommandAssistantContext = createContext<CommandAssistantContextValue | null>(null);

export function CommandAssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const seedRef = useRef<string | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  const openWithMessage = useCallback((message: string) => {
    seedRef.current = message.trim();
    setIsOpen(true);
  }, []);

  const consumeSeedMessage = useCallback(() => {
    const message = seedRef.current;
    seedRef.current = null;
    return message;
  }, []);

  const value = useMemo(
    () => ({ isOpen, open, close, toggle, openWithMessage, consumeSeedMessage }),
    [close, consumeSeedMessage, isOpen, open, openWithMessage, toggle],
  );

  return <CommandAssistantContext.Provider value={value}>{children}</CommandAssistantContext.Provider>;
}

export function useCommandAssistant() {
  const context = useContext(CommandAssistantContext);
  if (!context) {
    throw new Error("useCommandAssistant must be used within CommandAssistantProvider");
  }
  return context;
}
