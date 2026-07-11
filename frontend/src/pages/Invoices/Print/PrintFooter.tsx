import { useTranslation } from "../../../i18n/useTranslation";

export function PrintFooter() {
  const { t } = useTranslation();

  return (
    <div className="print-footer">
      <p className="print-footer-thanks">{t("invoicePrint.thankYou")}</p>
      <p>{t("invoicePrint.generatedOn")}: {new Date().toLocaleString()}</p>
      <p>{t("invoicePrint.generatedByFooter")}</p>
    </div>
  );
}
