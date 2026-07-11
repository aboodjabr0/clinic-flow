import { useEffect, useState } from "react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { Textarea } from "../common/Textarea";
import { Modal } from "../common/Modal";
import { medicalHistoryApi } from "../../api/medicalHistoryApi";
import { ApiError } from "../../api/apiClient";
import { useTranslation } from "../../i18n/useTranslation";
import {
  DIABETES_STATUS_LABEL_KEYS,
  PREGNANCY_STATUS_LABEL_KEYS,
  SMOKING_STATUS_LABEL_KEYS,
} from "../../utils/medicalHistory";
import type {
  DiabetesStatus,
  PatientMedicalHistory,
  PregnancyStatus,
  SmokingStatus,
} from "../../types/medicalHistory";
import "./medicalHistory.css";

interface MedicalHistoryEditModalProps {
  isOpen: boolean;
  patientId: string;
  history: PatientMedicalHistory;
  onClose: () => void;
  onSaved: (history: PatientMedicalHistory) => void;
}

interface FormState {
  allergies: string;
  chronicDiseases: string;
  currentMedications: string;
  previousSurgeries: string;
  pregnancyStatus: PregnancyStatus;
  smokingStatus: SmokingStatus;
  diabetesStatus: DiabetesStatus;
  bloodPressureNotes: string;
  heartDisease: boolean;
  bloodThinners: boolean;
  anesthesiaSensitivity: boolean;
  medicalAlerts: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

function fillFormFromHistory(history: PatientMedicalHistory): FormState {
  return {
    allergies: history.allergies ?? "",
    chronicDiseases: history.chronicDiseases ?? "",
    currentMedications: history.currentMedications ?? "",
    previousSurgeries: history.previousSurgeries ?? "",
    pregnancyStatus: history.pregnancyStatus,
    smokingStatus: history.smokingStatus,
    diabetesStatus: history.diabetesStatus,
    bloodPressureNotes: history.bloodPressureNotes ?? "",
    heartDisease: history.heartDisease,
    bloodThinners: history.bloodThinners,
    anesthesiaSensitivity: history.anesthesiaSensitivity,
    medicalAlerts: history.medicalAlerts ?? "",
    emergencyContactName: history.emergencyContactName ?? "",
    emergencyContactPhone: history.emergencyContactPhone ?? "",
  };
}

const PREGNANCY_OPTIONS = Object.keys(PREGNANCY_STATUS_LABEL_KEYS) as PregnancyStatus[];
const SMOKING_OPTIONS = Object.keys(SMOKING_STATUS_LABEL_KEYS) as SmokingStatus[];
const DIABETES_OPTIONS = Object.keys(DIABETES_STATUS_LABEL_KEYS) as DiabetesStatus[];

export function MedicalHistoryEditModal({
  isOpen,
  patientId,
  history,
  onClose,
  onSaved,
}: MedicalHistoryEditModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(() => fillFormFromHistory(history));
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(fillFormFromHistory(history));
    setFormError(null);
  }, [isOpen, history]);

  function closeModal() {
    if (isSaving) return;
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setIsSaving(true);
    setFormError(null);
    try {
      const response = await medicalHistoryApi.upsertMedicalHistory(patientId, {
        allergies: form.allergies.trim() || undefined,
        chronicDiseases: form.chronicDiseases.trim() || undefined,
        currentMedications: form.currentMedications.trim() || undefined,
        previousSurgeries: form.previousSurgeries.trim() || undefined,
        pregnancyStatus: form.pregnancyStatus,
        smokingStatus: form.smokingStatus,
        diabetesStatus: form.diabetesStatus,
        bloodPressureNotes: form.bloodPressureNotes.trim() || undefined,
        heartDisease: form.heartDisease,
        bloodThinners: form.bloodThinners,
        anesthesiaSensitivity: form.anesthesiaSensitivity,
        medicalAlerts: form.medicalAlerts.trim() || undefined,
        emergencyContactName: form.emergencyContactName.trim() || undefined,
        emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
      });
      onSaved(response.data);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("medicalHistory.saveError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} title={t("medicalHistory.editTitle")} onClose={closeModal}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <Textarea
          label={t("medicalHistory.allergies")}
          value={form.allergies}
          maxLength={1000}
          onChange={(e) => setForm({ ...form, allergies: e.target.value })}
        />
        <Textarea
          label={t("medicalHistory.medicalAlerts")}
          value={form.medicalAlerts}
          maxLength={1000}
          onChange={(e) => setForm({ ...form, medicalAlerts: e.target.value })}
        />

        <div className="medical-history-flags">
          <label className="medical-history-checkbox">
            <input
              type="checkbox"
              checked={form.heartDisease}
              onChange={(e) => setForm({ ...form, heartDisease: e.target.checked })}
            />
            {t("medicalHistory.heartDisease")}
          </label>
          <label className="medical-history-checkbox">
            <input
              type="checkbox"
              checked={form.bloodThinners}
              onChange={(e) => setForm({ ...form, bloodThinners: e.target.checked })}
            />
            {t("medicalHistory.bloodThinners")}
          </label>
          <label className="medical-history-checkbox">
            <input
              type="checkbox"
              checked={form.anesthesiaSensitivity}
              onChange={(e) => setForm({ ...form, anesthesiaSensitivity: e.target.checked })}
            />
            {t("medicalHistory.anesthesiaSensitivity")}
          </label>
        </div>

        <div className="medical-history-selects">
          <Select
            label={t("medicalHistory.diabetes")}
            value={form.diabetesStatus}
            onChange={(e) => setForm({ ...form, diabetesStatus: e.target.value as DiabetesStatus })}
          >
            {DIABETES_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(DIABETES_STATUS_LABEL_KEYS[option])}
              </option>
            ))}
          </Select>
          <Select
            label={t("medicalHistory.pregnancyStatus")}
            value={form.pregnancyStatus}
            onChange={(e) => setForm({ ...form, pregnancyStatus: e.target.value as PregnancyStatus })}
          >
            {PREGNANCY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(PREGNANCY_STATUS_LABEL_KEYS[option])}
              </option>
            ))}
          </Select>
          <Select
            label={t("medicalHistory.smokingStatus")}
            value={form.smokingStatus}
            onChange={(e) => setForm({ ...form, smokingStatus: e.target.value as SmokingStatus })}
          >
            {SMOKING_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(SMOKING_STATUS_LABEL_KEYS[option])}
              </option>
            ))}
          </Select>
        </div>

        <Textarea
          label={t("medicalHistory.chronicDiseases")}
          value={form.chronicDiseases}
          maxLength={1000}
          onChange={(e) => setForm({ ...form, chronicDiseases: e.target.value })}
        />
        <Textarea
          label={t("medicalHistory.currentMedications")}
          value={form.currentMedications}
          maxLength={1000}
          onChange={(e) => setForm({ ...form, currentMedications: e.target.value })}
        />
        <Textarea
          label={t("medicalHistory.previousSurgeries")}
          value={form.previousSurgeries}
          maxLength={1000}
          onChange={(e) => setForm({ ...form, previousSurgeries: e.target.value })}
        />
        <Textarea
          label={t("medicalHistory.bloodPressureNotes")}
          value={form.bloodPressureNotes}
          maxLength={500}
          onChange={(e) => setForm({ ...form, bloodPressureNotes: e.target.value })}
        />

        <Input
          label={t("medicalHistory.emergencyContactName")}
          value={form.emergencyContactName}
          maxLength={200}
          onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
        />
        <Input
          label={t("medicalHistory.emergencyContactPhone")}
          type="tel"
          value={form.emergencyContactPhone}
          maxLength={30}
          onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
        />

        {formError && <p className="medical-history-form-error">{formError}</p>}

        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? t("common.saving") : t("medicalHistory.saveButton")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
