import { useCallback, useEffect, useState } from "react";
import { Card } from "../common/Card";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { LoadingState } from "../common/LoadingState";
import { StatusBadge } from "../common/StatusBadge";
import { MedicalAlertBanner } from "./MedicalAlertBanner";
import { MedicalHistoryEditModal } from "./MedicalHistoryEditModal";
import { medicalHistoryApi } from "../../api/medicalHistoryApi";
import { ApiError } from "../../api/apiClient";
import { useTranslation } from "../../i18n/useTranslation";
import { formatDate } from "../../utils/patient";
import {
  DIABETES_STATUS_LABEL_KEYS,
  PREGNANCY_STATUS_LABEL_KEYS,
  SMOKING_STATUS_LABEL_KEYS,
  hasRecordedHistory,
} from "../../utils/medicalHistory";
import type { PatientMedicalHistory } from "../../types/medicalHistory";
import "./medicalHistory.css";

interface MedicalHistorySectionProps {
  patientId: string;
  /** Admin and Doctor may edit; Receptionist is view-only. */
  canEdit: boolean;
}

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

export function MedicalHistorySection({ patientId, canEdit }: MedicalHistorySectionProps) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<PatientMedicalHistory | null>(null);
  const [view, setView] = useState<ViewState>({ status: "loading" });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadHistory = useCallback(async () => {
    setView({ status: "loading" });
    try {
      const response = await medicalHistoryApi.getMedicalHistory(patientId);
      setHistory(response.data);
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("medicalHistory.errorReachApi");
      setView({ status: "error", message });
    }
  }, [patientId, t]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function handleSaved(saved: PatientMedicalHistory) {
    setHistory(saved);
    setIsModalOpen(false);
  }

  const recorded = history !== null && hasRecordedHistory(history);

  return (
    <Card
      title={t("medicalHistory.title")}
      actions={
        view.status === "loaded" &&
        (canEdit ? (
          <Button variant="ghost" onClick={() => setIsModalOpen(true)}>
            {recorded ? t("medicalHistory.editButton") : t("medicalHistory.addButton")}
          </Button>
        ) : (
          <StatusBadge label={t("medicalHistory.viewOnly")} variant="neutral" />
        ))
      }
    >
      {view.status === "loading" && <LoadingState label={t("medicalHistory.loading")} />}

      {view.status === "error" && (
        <EmptyState title={t("medicalHistory.unableToLoad")} description={view.message} />
      )}

      {view.status === "loaded" && history && !recorded && (
        <EmptyState
          title={t("medicalHistory.emptyTitle")}
          description={t("medicalHistory.emptyDescription")}
        />
      )}

      {view.status === "loaded" && history && recorded && (
        <div className="medical-history-stack">
          <MedicalAlertBanner history={history} />

          <div className="medical-history-groups">
            <section className="medical-history-group">
              <h3 className="medical-history-group-title">{t("medicalHistory.groupAlerts")}</h3>
              <FieldRow label={t("medicalHistory.allergies")} value={history.allergies} t={t} />
              <FieldRow label={t("medicalHistory.medicalAlerts")} value={history.medicalAlerts} t={t} />
              <FieldRow
                label={t("medicalHistory.bloodThinners")}
                value={history.bloodThinners ? t("common.yes") : t("common.no")}
                t={t}
              />
              <FieldRow
                label={t("medicalHistory.anesthesiaSensitivity")}
                value={history.anesthesiaSensitivity ? t("common.yes") : t("common.no")}
                t={t}
              />
            </section>

            <section className="medical-history-group">
              <h3 className="medical-history-group-title">{t("medicalHistory.groupConditions")}</h3>
              <FieldRow
                label={t("medicalHistory.heartDisease")}
                value={history.heartDisease ? t("common.yes") : t("common.no")}
                t={t}
              />
              <FieldRow
                label={t("medicalHistory.diabetes")}
                value={t(DIABETES_STATUS_LABEL_KEYS[history.diabetesStatus])}
                t={t}
              />
              <FieldRow label={t("medicalHistory.chronicDiseases")} value={history.chronicDiseases} t={t} />
              <FieldRow label={t("medicalHistory.bloodPressureNotes")} value={history.bloodPressureNotes} t={t} />
              <FieldRow
                label={t("medicalHistory.pregnancyStatus")}
                value={t(PREGNANCY_STATUS_LABEL_KEYS[history.pregnancyStatus])}
                t={t}
              />
            </section>

            <section className="medical-history-group">
              <h3 className="medical-history-group-title">{t("medicalHistory.groupMedications")}</h3>
              <FieldRow label={t("medicalHistory.currentMedications")} value={history.currentMedications} t={t} />
              <FieldRow label={t("medicalHistory.previousSurgeries")} value={history.previousSurgeries} t={t} />
            </section>

            <section className="medical-history-group">
              <h3 className="medical-history-group-title">{t("medicalHistory.groupLifestyle")}</h3>
              <FieldRow
                label={t("medicalHistory.smokingStatus")}
                value={t(SMOKING_STATUS_LABEL_KEYS[history.smokingStatus])}
                t={t}
              />
            </section>

            <section className="medical-history-group">
              <h3 className="medical-history-group-title">{t("medicalHistory.groupEmergencyContact")}</h3>
              <FieldRow label={t("medicalHistory.emergencyContactName")} value={history.emergencyContactName} t={t} />
              <FieldRow label={t("medicalHistory.emergencyContactPhone")} value={history.emergencyContactPhone} t={t} />
            </section>
          </div>

          <p className="medical-history-meta">
            {t("medicalHistory.lastUpdated", { date: formatDate(history.lastUpdatedAtUtc) })}
            {history.lastUpdatedByUserName
              ? ` · ${t("medicalHistory.updatedBy", { name: history.lastUpdatedByUserName })}`
              : ""}
          </p>
        </div>
      )}

      {history && (
        <MedicalHistoryEditModal
          isOpen={isModalOpen}
          patientId={patientId}
          history={history}
          onClose={() => setIsModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </Card>
  );
}

interface FieldRowProps {
  label: string;
  value: string | null;
  t: (key: "medicalHistory.notSpecified") => string;
}

function FieldRow({ label, value, t }: FieldRowProps) {
  return (
    <div className="medical-history-field">
      <span className="medical-history-field-label">{label}</span>
      <span className={`medical-history-field-value${value ? "" : " medical-history-field-empty"}`}>
        {value ?? t("medicalHistory.notSpecified")}
      </span>
    </div>
  );
}
