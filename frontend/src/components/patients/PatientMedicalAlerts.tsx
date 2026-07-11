import { useEffect, useState } from "react";
import { MedicalAlertBanner } from "./MedicalAlertBanner";
import { medicalHistoryApi } from "../../api/medicalHistoryApi";
import type { PatientMedicalHistory } from "../../types/medicalHistory";

interface PatientMedicalAlertsProps {
  patientId: string;
}

/**
 * Compact medical-risk banner for visit/appointment pages. Fetches the
 * patient's history itself and renders nothing while loading, on error, or
 * when the patient has no recorded risks — the host page stays unaffected.
 */
export function PatientMedicalAlerts({ patientId }: PatientMedicalAlertsProps) {
  const [history, setHistory] = useState<PatientMedicalHistory | null>(null);

  useEffect(() => {
    let cancelled = false;
    medicalHistoryApi
      .getMedicalHistory(patientId)
      .then((response) => {
        if (!cancelled) setHistory(response.data);
      })
      .catch(() => {
        // Alerts are supplementary here; the page still works without them.
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (!history) {
    return null;
  }

  return <MedicalAlertBanner history={history} compact />;
}
