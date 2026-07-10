import { useEffect, useState } from "react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { Textarea } from "../common/Textarea";
import { Modal } from "../common/Modal";
import { invoicesApi } from "../../api/invoicesApi";
import { patientsApi } from "../../api/patientsApi";
import { dentalServicesApi } from "../../api/dentalServicesApi";
import { ApiError } from "../../api/apiClient";
import { useTranslation } from "../../i18n/useTranslation";
import type { DentalService } from "../../types/dentalService";
import type { Invoice } from "../../types/invoice";
import type { PatientListItem } from "../../types/patient";
import "./invoices.css";

/**
 * When set, the invoice is created against an existing appointment or visit:
 * the patient/service pickers are locked and the linked ids are sent as-is.
 */
export interface CreateInvoicePrefill {
  patientId: string;
  patientName: string;
  appointmentId?: string;
  visitId?: string;
  serviceName?: string;
  subtotalAmount?: number;
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (invoice: Invoice) => void;
  prefill?: CreateInvoicePrefill;
}

export function CreateInvoiceModal({ isOpen, onClose, onCreated, prefill }: CreateInvoiceModalProps) {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [services, setServices] = useState<DentalService[]>([]);

  const [patientId, setPatientId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [discount, setDiscount] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setPatientId(prefill?.patientId ?? "");
    setServiceId("");
    setSubtotal(prefill?.subtotalAmount !== undefined ? prefill.subtotalAmount.toFixed(2) : "");
    setDiscount("0");
    setDueDate("");
    setNotes("");
    setFormError(null);

    if (!prefill) {
      Promise.all([
        patientsApi.getPatients({ isActive: true, pageNumber: 1, pageSize: 100 }),
        dentalServicesApi.getAll(),
      ])
        .then(([patientsResponse, servicesResponse]) => {
          setPatients(patientsResponse.data.items);
          setServices(servicesResponse.data.filter((service) => service.isActive));
        })
        .catch(() => {
          setFormError(t("createInvoiceModal.errorReachApi"));
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prefill]);

  function closeModal() {
    if (isSaving) return;
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const subtotalValue = subtotal.trim() === "" ? undefined : Number(subtotal);
    const discountValue = discount.trim() === "" ? 0 : Number(discount);

    if (!prefill && !patientId) {
      setFormError(t("createInvoiceModal.errorSelectPatient"));
      return;
    }
    if (subtotalValue !== undefined && (Number.isNaN(subtotalValue) || subtotalValue < 0)) {
      setFormError(t("createInvoiceModal.errorSubtotalPositive"));
      return;
    }
    if (subtotalValue === undefined && !prefill?.serviceName && !serviceId) {
      setFormError(t("createInvoiceModal.errorSubtotalOrService"));
      return;
    }
    if (Number.isNaN(discountValue) || discountValue < 0) {
      setFormError(t("createInvoiceModal.errorDiscountNegative"));
      return;
    }
    if (subtotalValue !== undefined && discountValue > subtotalValue) {
      setFormError(t("createInvoiceModal.errorDiscountExceeds"));
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const response = await invoicesApi.createInvoice({
        patientId: prefill?.patientId ?? patientId,
        appointmentId: prefill?.appointmentId,
        visitId: prefill?.visitId,
        dentalServiceId: serviceId || undefined,
        subtotalAmount: subtotalValue,
        discountAmount: discountValue,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated(response.data);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("createInvoiceModal.errorUnableToCreate"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} title={t("createInvoiceModal.title")} onClose={closeModal}>
      <form className="modal-form" onSubmit={handleSubmit}>
        {prefill ? (
          <div className="invoice-form-prefill">
            <span className="invoice-form-prefill-label">{t("createInvoiceModal.patient")}</span>
            <span className="invoice-form-prefill-value">{prefill.patientName}</span>
            {prefill.serviceName && (
              <>
                <span className="invoice-form-prefill-label">{t("createInvoiceModal.service")}</span>
                <span className="invoice-form-prefill-value">{prefill.serviceName}</span>
              </>
            )}
          </div>
        ) : (
          <>
            <Select label={t("createInvoiceModal.patient")} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">{t("createInvoiceModal.selectPatient")}</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {t("createInvoiceModal.patientOption", { name: patient.fullName, phone: patient.phoneNumber })}
                </option>
              ))}
            </Select>
            <Select
              label={t("createInvoiceModal.serviceOptional")}
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">{t("createInvoiceModal.noLinkedService")}</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {t("createInvoiceModal.serviceOption", { name: service.name, price: service.defaultPrice.toFixed(2) })}
                </option>
              ))}
            </Select>
          </>
        )}

        <Input
          label={t("createInvoiceModal.subtotalAmount")}
          type="number"
          min="0"
          step="0.01"
          placeholder={t("createInvoiceModal.subtotalPlaceholder")}
          value={subtotal}
          onChange={(e) => setSubtotal(e.target.value)}
        />
        <Input
          label={t("createInvoiceModal.discountAmount")}
          type="number"
          min="0"
          step="0.01"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />
        <Input
          label={t("createInvoiceModal.dueDateOptional")}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <Textarea
          label={t("createInvoiceModal.notesOptional")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {formError && <p className="invoice-form-error">{formError}</p>}

        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? t("createInvoiceModal.creating") : t("createInvoiceModal.title")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
