import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { clinicSettingsApi } from "../../api/clinicSettingsApi";
import { ApiError } from "../../api/apiClient";
import { useTranslation } from "../../i18n/useTranslation";
import type { UpdateClinicSettingsRequest } from "../../types/clinicSettings";
import "./SettingsPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

const EMPTY_FORM: UpdateClinicSettingsRequest = {
  clinicName: "",
  phoneNumber: "",
  email: "",
  address: "",
  openingTime: "",
  closingTime: "",
  defaultCurrency: "",
};

export function SettingsPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<ViewState>({ status: "loading" });
  const [form, setForm] = useState<UpdateClinicSettingsRequest>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setView({ status: "loading" });
    try {
      const response = await clinicSettingsApi.get();
      const settings = response.data;
      setForm({
        clinicName: settings.clinicName,
        phoneNumber: settings.phoneNumber ?? "",
        email: settings.email ?? "",
        address: settings.address ?? "",
        openingTime: settings.openingTime ?? "",
        closingTime: settings.closingTime ?? "",
        defaultCurrency: settings.defaultCurrency,
      });
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("settings.errorReachApi");
      setView({ status: "error", message });
    }
  }, [t]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.clinicName.trim() || !form.defaultCurrency.trim()) {
      setFormError(t("settings.errorRequired"));
      return;
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setFormError(t("settings.errorInvalidEmail"));
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setSuccessMessage(null);
    try {
      await clinicSettingsApi.update({
        ...form,
        phoneNumber: form.phoneNumber?.trim() || undefined,
        email: form.email?.trim() || undefined,
        address: form.address?.trim() || undefined,
        openingTime: form.openingTime || undefined,
        closingTime: form.closingTime || undefined,
      });
      setSuccessMessage(t("settings.saveSuccess"));
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("settings.errorUnableToSave"));
    } finally {
      setIsSaving(false);
    }
  }

  const workingHours =
    form.openingTime && form.closingTime
      ? `${form.openingTime} – ${form.closingTime}`
      : form.openingTime || form.closingTime || t("settings.notSet");

  return (
    <>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      {view.status === "loading" && (
        <Card title={t("settings.clinicProfile")}>
          <LoadingState label={t("settings.loading")} />
        </Card>
      )}

      {view.status === "error" && (
        <Card title={t("settings.clinicProfile")}>
          <EmptyState title={t("settings.unableToLoad")} description={view.message} />
        </Card>
      )}

      {view.status === "loaded" && (
        <div className="settings-layout">
          <form className="settings-form" onSubmit={handleSubmit}>
            <Card title={t("settings.clinicInformation")}>
              <div className="settings-fields">
                <Input
                  label={t("settings.clinicName")}
                  required
                  value={form.clinicName}
                  onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
                />
                <Input
                  label={t("settings.phoneNumber")}
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                />
                <Input
                  label={t("settings.email")}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  label={t("settings.address")}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </Card>

            <Card title={t("settings.workingHours")}>
              <div className="settings-form-row">
                <Input
                  label={t("settings.openingTime")}
                  type="time"
                  value={form.openingTime}
                  onChange={(e) => setForm({ ...form, openingTime: e.target.value })}
                />
                <Input
                  label={t("settings.closingTime")}
                  type="time"
                  value={form.closingTime}
                  onChange={(e) => setForm({ ...form, closingTime: e.target.value })}
                />
              </div>
            </Card>

            <Card title={t("settings.billingSettings")}>
              <div className="settings-fields">
                <Input
                  label={t("settings.defaultCurrency")}
                  required
                  value={form.defaultCurrency}
                  onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}
                />
                <p className="settings-field-hint">{t("settings.currencyHint")}</p>
              </div>
            </Card>

            {formError && <p className="settings-form-error">{formError}</p>}
            {successMessage && <p className="settings-form-success">{successMessage}</p>}

            <div className="settings-form-actions">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? t("common.saving") : t("settings.saveChanges")}
              </Button>
            </div>
          </form>

          <aside className="settings-preview">
            <Card title={t("settings.clinicProfile")}>
              <div className="settings-preview-body">
                <div className="settings-preview-header">
                  <span className="settings-preview-name">
                    {form.clinicName.trim() || t("settings.clinicName")}
                  </span>
                  <span className="settings-preview-caption">{t("settings.previewCaption")}</span>
                </div>
                <dl className="settings-preview-list">
                  <div className="settings-preview-row">
                    <dt>{t("table.phone")}</dt>
                    <dd>{form.phoneNumber?.trim() || "—"}</dd>
                  </div>
                  <div className="settings-preview-row">
                    <dt>{t("settings.email")}</dt>
                    <dd>{form.email?.trim() || "—"}</dd>
                  </div>
                  <div className="settings-preview-row">
                    <dt>{t("settings.address")}</dt>
                    <dd>{form.address?.trim() || "—"}</dd>
                  </div>
                  <div className="settings-preview-row">
                    <dt>{t("settings.hours")}</dt>
                    <dd>{workingHours}</dd>
                  </div>
                  <div className="settings-preview-row">
                    <dt>{t("settings.currency")}</dt>
                    <dd>{form.defaultCurrency.trim() || "—"}</dd>
                  </div>
                </dl>
              </div>
            </Card>
          </aside>
        </div>
      )}
    </>
  );
}
