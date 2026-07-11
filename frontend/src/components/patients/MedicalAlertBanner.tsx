import { useTranslation } from "../../i18n/useTranslation";
import { getMedicalRisks } from "../../utils/medicalHistory";
import type { PatientMedicalHistory } from "../../types/medicalHistory";
import "./medicalHistory.css";

interface MedicalAlertBannerProps {
  history: PatientMedicalHistory;
  /** Compact form used on visit/appointment pages: flags only, no free text. */
  compact?: boolean;
}

/**
 * Red risk banner shown before treatment. Renders nothing when the patient
 * has no high-risk flags recorded.
 */
export function MedicalAlertBanner({ history, compact = false }: MedicalAlertBannerProps) {
  const { t } = useTranslation();
  const risks = getMedicalRisks(history);

  if (risks.length === 0) {
    return null;
  }

  return (
    <div className={`medical-alert-banner${compact ? " medical-alert-banner-compact" : ""}`} role="alert">
      <span className="medical-alert-banner-icon" aria-hidden="true">
        ⚠
      </span>
      <div className="medical-alert-banner-content">
        <span className="medical-alert-banner-title">{t("medicalHistory.riskAlertsTitle")}</span>
        <ul className="medical-alert-banner-list">
          {risks.map((risk) => (
            <li key={risk.labelKey} className="medical-alert-banner-item">
              <span className="medical-alert-banner-item-label">{t(risk.labelKey)}</span>
              {!compact && risk.detail && (
                <span className="medical-alert-banner-item-detail">{risk.detail}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
