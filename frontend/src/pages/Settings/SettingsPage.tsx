import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { clinicSettingsApi } from "../../api/clinicSettingsApi";
import { ApiError } from "../../api/apiClient";
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
      const message = error instanceof ApiError ? error.message : "Unable to reach the API.";
      setView({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.clinicName.trim() || !form.defaultCurrency.trim()) {
      setFormError("Clinic name and currency are required.");
      return;
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setFormError("Enter a valid email address.");
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
      setSuccessMessage("Clinic settings saved.");
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Unable to save clinic settings.");
    } finally {
      setIsSaving(false);
    }
  }

  const workingHours =
    form.openingTime && form.closingTime
      ? `${form.openingTime} – ${form.closingTime}`
      : form.openingTime || form.closingTime || "Not set";

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your clinic profile and billing preferences." />

      {view.status === "loading" && (
        <Card title="Clinic Profile">
          <LoadingState label="Loading settings..." />
        </Card>
      )}

      {view.status === "error" && (
        <Card title="Clinic Profile">
          <EmptyState title="Unable to load settings" description={view.message} />
        </Card>
      )}

      {view.status === "loaded" && (
        <div className="settings-layout">
          <form className="settings-form" onSubmit={handleSubmit}>
            <Card title="Clinic Information">
              <div className="settings-fields">
                <Input
                  label="Clinic name"
                  required
                  value={form.clinicName}
                  onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
                />
                <Input
                  label="Phone number"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <Input
                  label="Address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </Card>

            <Card title="Working Hours">
              <div className="settings-form-row">
                <Input
                  label="Opening time"
                  type="time"
                  value={form.openingTime}
                  onChange={(e) => setForm({ ...form, openingTime: e.target.value })}
                />
                <Input
                  label="Closing time"
                  type="time"
                  value={form.closingTime}
                  onChange={(e) => setForm({ ...form, closingTime: e.target.value })}
                />
              </div>
            </Card>

            <Card title="Billing Settings">
              <div className="settings-fields">
                <Input
                  label="Default currency"
                  required
                  value={form.defaultCurrency}
                  onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}
                />
                <p className="settings-field-hint">
                  Used for invoice totals and financial reports.
                </p>
              </div>
            </Card>

            {formError && <p className="settings-form-error">{formError}</p>}
            {successMessage && <p className="settings-form-success">{successMessage}</p>}

            <div className="settings-form-actions">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>

          <aside className="settings-preview">
            <Card title="Clinic Profile">
              <div className="settings-preview-body">
                <div className="settings-preview-header">
                  <span className="settings-preview-name">
                    {form.clinicName.trim() || "Clinic name"}
                  </span>
                  <span className="settings-preview-caption">Preview for invoices and reports</span>
                </div>
                <dl className="settings-preview-list">
                  <div className="settings-preview-row">
                    <dt>Phone</dt>
                    <dd>{form.phoneNumber?.trim() || "—"}</dd>
                  </div>
                  <div className="settings-preview-row">
                    <dt>Email</dt>
                    <dd>{form.email?.trim() || "—"}</dd>
                  </div>
                  <div className="settings-preview-row">
                    <dt>Address</dt>
                    <dd>{form.address?.trim() || "—"}</dd>
                  </div>
                  <div className="settings-preview-row">
                    <dt>Hours</dt>
                    <dd>{workingHours}</dd>
                  </div>
                  <div className="settings-preview-row">
                    <dt>Currency</dt>
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
