import { useEffect, useState } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { Textarea } from "../common/Textarea";
import { clinicSettingsApi } from "../../api/clinicSettingsApi";
import { useTranslation } from "../../i18n/useTranslation";
import { formatDate } from "../../utils/patient";
import { buildReminderMessage, buildWhatsAppUrl, normalizeJordanPhone } from "../../utils/whatsapp";
import "./WhatsAppReminderModal.css";

interface WhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientPhone: string;
  doctorName?: string | null;
  appointmentDate: string;
  appointmentTime: string;
}

export function WhatsAppReminderModal({
  isOpen,
  onClose,
  patientName,
  patientPhone,
  doctorName,
  appointmentDate,
  appointmentTime,
}: WhatsAppReminderModalProps) {
  const { t } = useTranslation();
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const normalizedPhone = normalizeJordanPhone(patientPhone);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    clinicSettingsApi
      .get()
      .then((response) => {
        if (isMounted) setClinicName(response.data.clinicName);
      })
      .catch(() => {
        // Clinic name is a nice-to-have in the message — fall back silently.
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setMessage(
      buildReminderMessage(t, {
        patientName,
        clinicName,
        date: formatDate(appointmentDate),
        time: appointmentTime,
        doctorName,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, patientName, doctorName, clinicName, appointmentDate, appointmentTime]);

  function handleOpenWhatsApp() {
    const url = buildWhatsAppUrl(patientPhone, message);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <Modal isOpen={isOpen} title={t("whatsapp.previewReminder")} onClose={onClose}>
      <div className="modal-form">
        <p className="whatsapp-reminder-subtitle">{t("whatsapp.reminderForAppointment")}</p>

        {!normalizedPhone ? (
          <p className="whatsapp-reminder-error">
            {patientPhone.trim() === "" ? t("whatsapp.phoneMissing") : t("whatsapp.phoneInvalid")}
          </p>
        ) : (
          <>
            <div className="whatsapp-reminder-summary">
              <div className="whatsapp-reminder-field">
                <span className="whatsapp-reminder-label">{t("table.patient")}</span>
                <span className="whatsapp-reminder-value">{patientName}</span>
              </div>
              <div className="whatsapp-reminder-field">
                <span className="whatsapp-reminder-label">{t("table.phone")}</span>
                <span className="whatsapp-reminder-value">{patientPhone}</span>
              </div>
              {doctorName && (
                <div className="whatsapp-reminder-field">
                  <span className="whatsapp-reminder-label">{t("table.doctor")}</span>
                  <span className="whatsapp-reminder-value">{doctorName}</span>
                </div>
              )}
              <div className="whatsapp-reminder-field">
                <span className="whatsapp-reminder-label">{t("table.date")}</span>
                <span className="whatsapp-reminder-value">{formatDate(appointmentDate)}</span>
              </div>
              <div className="whatsapp-reminder-field">
                <span className="whatsapp-reminder-label">{t("table.time")}</span>
                <span className="whatsapp-reminder-value">{appointmentTime}</span>
              </div>
              <div className="whatsapp-reminder-field">
                <span className="whatsapp-reminder-label">{t("whatsapp.clinicLabel")}</span>
                <span className="whatsapp-reminder-value">{clinicName ?? t("whatsapp.defaultClinicName")}</span>
              </div>
            </div>

            <div>
              <h3 className="whatsapp-reminder-message-title">{t("whatsapp.reminderMessage")}</h3>
              <Textarea
                label={t("whatsapp.editMessageBeforeSending")}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={7}
              />
            </div>

            <p className="whatsapp-reminder-hint">{t("whatsapp.opensNewTabHint")}</p>
          </>
        )}

        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          {normalizedPhone && (
            <Button type="button" onClick={handleOpenWhatsApp}>
              {t("whatsapp.openWhatsApp")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
