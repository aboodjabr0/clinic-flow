import { useCallback } from "react";
import { useLanguage, translate } from "./LanguageContext";
import type { TranslationKey } from "./translations";

export function useTranslation() {
  const { language, setLanguage, isRtl } = useLanguage();

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars),
    [language],
  );

  return { t, language, setLanguage, isRtl };
}
