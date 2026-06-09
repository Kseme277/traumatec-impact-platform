import { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useLanguage, type AppLocale } from "../../context/LanguageContext";

const LANGUAGES: { code: AppLocale; label: string; flagSrc: string }[] = [
  { code: "fr", label: "Français", flagSrc: "/images/country/country-02.svg" },
  { code: "en", label: "English", flagSrc: "/images/country/country-04.svg" },
];

function FlagAvatar({ src, label, size = "md" }: { src: string; label: string; size?: "md" | "sm" }) {
  const sizeClass = size === "md" ? "size-11" : "size-8";

  return (
    <span
      className={`${sizeClass} shrink-0 overflow-hidden rounded-full border border-gray-200 dark:border-gray-700`}
      aria-hidden={size === "sm"}
    >
      <img src={src} alt={size === "md" ? label : ""} className="size-full object-cover" />
    </span>
  );
}

export default function LanguageDropdown() {
  const { locale, setLocale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Changer de langue"
        aria-expanded={isOpen ? "true" : "false"}
        className="relative flex size-11 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2 active:scale-[0.98] motion-safe:transition-transform dark:border-gray-800 dark:bg-gray-900"
        onClick={() => setIsOpen((open) => !open)}
      >
        <img
          src={current.flagSrc}
          alt=""
          className="size-full object-cover"
          aria-hidden="true"
        />
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <p className="px-3 py-2 text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Langue
        </p>
        {LANGUAGES.map((lang) => (
          <DropdownItem
            key={lang.code}
            onClick={() => {
              setLocale(lang.code);
              setIsOpen(false);
            }}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
              locale === lang.code
                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
            }`}
          >
            <FlagAvatar src={lang.flagSrc} label={lang.label} size="sm" />
            <span>{lang.label}</span>
          </DropdownItem>
        ))}
      </Dropdown>
    </div>
  );
}
