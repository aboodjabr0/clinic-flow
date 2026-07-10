import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Modal } from "../../components/common/Modal";
import { dentalServicesApi } from "../../api/dentalServicesApi";
import { ApiError } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import type { CreateDentalServiceRequest, DentalService } from "../../types/dentalService";
import "./ServicesPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

const EMPTY_FORM = {
  name: "",
  description: "",
  defaultPrice: "0",
  durationMinutes: "30",
};

type FormState = typeof EMPTY_FORM;

export function ServicesPage() {
  const { hasRole } = useAuth();
  const { t } = useTranslation();
  const isAdmin = hasRole("Admin");

  const [services, setServices] = useState<DentalService[]>([]);
  const [view, setView] = useState<ViewState>({ status: "loading" });

  const [editingService, setEditingService] = useState<DentalService | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadServices = useCallback(async () => {
    setView({ status: "loading" });
    try {
      const response = await dentalServicesApi.getAll();
      setServices(response.data);
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("services.errorReachApi");
      setView({ status: "error", message });
    }
  }, [t]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  function openCreateModal() {
    setEditingService(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(service: DentalService) {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description ?? "",
      defaultPrice: String(service.defaultPrice),
      durationMinutes: String(service.durationMinutes),
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setIsModalOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const price = Number(form.defaultPrice);
    const duration = Number(form.durationMinutes);

    if (!form.name.trim()) {
      setFormError(t("services.errorNameRequired"));
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setFormError(t("services.errorPriceMin"));
      return;
    }
    if (Number.isNaN(duration) || duration <= 0) {
      setFormError(t("services.errorDurationMin"));
      return;
    }

    const request: CreateDentalServiceRequest = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      defaultPrice: price,
      durationMinutes: duration,
    };

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingService) {
        await dentalServicesApi.update(editingService.id, request);
      } else {
        await dentalServicesApi.create(request);
      }
      setIsModalOpen(false);
      await loadServices();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("services.errorUnableToSave"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(service: DentalService) {
    try {
      await dentalServicesApi.setActiveStatus(service.id, !service.isActive);
      await loadServices();
    } catch {
      // Ignored — the table simply keeps its last known state on failure.
    }
  }

  return (
    <>
      <PageHeader
        title={t("services.title")}
        subtitle={t("services.subtitle")}
        actions={isAdmin ? <Button onClick={openCreateModal}>{t("services.addService")}</Button> : undefined}
      />

      <Card>
        {view.status === "loading" && <LoadingState label={t("services.loading")} />}

        {view.status === "error" && (
          <EmptyState title={t("services.unableToLoad")} description={view.message} />
        )}

        {view.status === "loaded" && services.length === 0 && (
          <EmptyState
            title={t("services.noneTitle")}
            description={t("services.noneDescription")}
          />
        )}

        {view.status === "loaded" && services.length > 0 && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("table.name")}</th>
                  <th>{t("table.description")}</th>
                  <th>{t("table.price")}</th>
                  <th>{t("table.duration")}</th>
                  <th>{t("table.status")}</th>
                  {isAdmin && <th aria-label={t("common.actions")} />}
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>{service.name}</td>
                    <td>{service.description ?? "—"}</td>
                    <td>{t("services.priceCurrency", { price: service.defaultPrice.toFixed(2) })}</td>
                    <td>{t("services.durationMinutes", { count: service.durationMinutes })}</td>
                    <td>
                      <StatusBadge
                        label={service.isActive ? t("common.active") : t("common.inactive")}
                        variant={service.isActive ? "success" : "neutral"}
                      />
                    </td>
                    {isAdmin && (
                      <td className="services-table-actions">
                        <Button variant="ghost" onClick={() => openEditModal(service)}>
                          {t("common.edit")}
                        </Button>
                        <Button
                          variant={service.isActive ? "danger" : "secondary"}
                          onClick={() => handleToggleStatus(service)}
                        >
                          {service.isActive ? t("users.deactivate") : t("users.activate")}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        title={editingService ? t("services.editTitle") : t("services.addTitle")}
        onClose={closeModal}
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <Input
            label={t("services.name")}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label={t("services.description")}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label={t("services.defaultPrice")}
            type="number"
            min="0"
            step="0.01"
            required
            value={form.defaultPrice}
            onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })}
          />
          <Input
            label={t("services.durationLabel")}
            type="number"
            min="1"
            required
            value={form.durationMinutes}
            onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
          />

          {formError && <p className="services-form-error">{formError}</p>}

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
