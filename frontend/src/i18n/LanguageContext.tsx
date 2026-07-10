import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Language } from "./translations";

const LANGUAGE_STORAGE_KEY = "clinicflow.language";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

/**
 * Reads the language already resolved by the inline script in index.html
 * (which runs before first paint to avoid a flash of the wrong direction).
 */
function getInitialLanguage(): Language {
  const current = document.documentElement.lang;
  if (current === "en" || current === "ar") {
    return current;
  }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore storage failures (e.g. private mode); language still applies for the session.
    }
  }, [language]);

  const setLanguage = useCallback((next: Language) => setLanguageState(next), []);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, isRtl: language === "ar" }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function translate(language: Language, key: keyof typeof translations["en"], vars?: Record<string, string | number>): string {
  let text = translations[language][key] ?? translations.en[key] ?? key;
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      text = text.replace(new RegExp(`{{${name}}}`, "g"), String(replacement));
    }
  }
  return text;
}
