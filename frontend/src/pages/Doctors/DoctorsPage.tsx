import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Modal } from "../../components/common/Modal";
import { doctorsApi } from "../../api/doctorsApi";
import { ApiError } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import type { CreateDoctorRequest, Doctor } from "../../types/doctor";
import "./DoctorsPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

const EMPTY_FORM: CreateDoctorRequest = {
  fullName: "",
  email: "",
  phoneNumber: "",
  specialty: "",
  licenseNumber: "",
  bio: "",
};

export function DoctorsPage() {
  const { hasRole } = useAuth();
  const { t } = useTranslation();
  const isAdmin = hasRole("Admin");

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [view, setView] = useState<ViewState>({ status: "loading" });

  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<CreateDoctorRequest>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadDoctors = useCallback(async () => {
    setView({ status: "loading" });
    try {
      const response = await doctorsApi.getAll();
      setDoctors(response.data);
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("doctors.errorReachApi");
      setView({ status: "error", message });
    }
  }, [t]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  function openCreateModal() {
    setEditingDoctor(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(doctor: Doctor) {
    setEditingDoctor(doctor);
    setForm({
      fullName: doctor.fullName,
      email: doctor.email,
      phoneNumber: doctor.phoneNumber ?? "",
      specialty: doctor.specialty,
      licenseNumber: doctor.licenseNumber ?? "",
      bio: doctor.bio ?? "",
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

    if (!form.fullName.trim() || !form.specialty.trim()) {
      setFormError(t("doctors.errorRequired"));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setFormError(t("doctors.errorInvalidEmail"));
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingDoctor) {
        await doctorsApi.update(editingDoctor.id, form);
      } else {
        await doctorsApi.create(form);
      }
      setIsModalOpen(false);
      await loadDoctors();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("doctors.errorUnableToSave"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(doctor: Doctor) {
    try {
      await doctorsApi.setActiveStatus(doctor.id, !doctor.isActive);
      await loadDoctors();
    } catch {
      // Ignored — the table simply keeps its last known state on failure.
    }
  }

  return (
    <>
      <PageHeader
        title={t("doctors.title")}
        subtitle={t("doctors.subtitle")}
        actions={isAdmin ? <Button onClick={openCreateModal}>{t("doctors.addDoctor")}</Button> : undefined}
      />

      <Card>
        {view.status === "loading" && <LoadingState label={t("doctors.loading")} />}

        {view.status === "error" && (
          <EmptyState title={t("doctors.unableToLoad")} description={view.message} />
        )}

        {view.status === "loaded" && doctors.length === 0 && (
          <EmptyState
            title={t("doctors.noneTitle")}
            description={t("doctors.noneDescription")}
          />
        )}

        {view.status === "loaded" && doctors.length > 0 && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("table.name")}</th>
                  <th>{t("table.specialty")}</th>
                  <th>{t("table.email")}</th>
                  <th>{t("table.phone")}</th>
                  <th>{t("table.status")}</th>
                  {isAdmin && <th aria-label={t("common.actions")} />}
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.id}>
                    <td>{doctor.fullName}</td>
                    <td>{doctor.specialty}</td>
                    <td>{doctor.email}</td>
                    <td>{doctor.phoneNumber ?? "—"}</td>
                    <td>
                      <StatusBadge
                        label={doctor.isActive ? t("common.active") : t("common.inactive")}
                        variant={doctor.isActive ? "success" : "neutral"}
                      />
                    </td>
                    {isAdmin && (
                      <td className="doctors-table-actions">
                        <Button variant="ghost" onClick={() => openEditModal(doctor)}>
                          {t("common.edit")}
                        </Button>
                        <Button
                          variant={doctor.isActive ? "danger" : "secondary"}
                          onClick={() => handleToggleStatus(doctor)}
                        >
                          {doctor.isActive ? t("users.deactivate") : t("users.activate")}
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
        title={editingDoctor ? t("doctors.editTitle") : t("doctors.addTitle")}
        onClose={closeModal}
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <Input
            label={t("doctors.fullName")}
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <Input
            label={t("doctors.email")}
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label={t("doctors.phoneNumber")}
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          />
          <Input
            label={t("doctors.specialty")}
            required
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
          />
          <Input
            label={t("doctors.licenseNumber")}
            value={form.licenseNumber}
            onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
          />
          <Input
            label={t("doctors.bio")}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />

          {formError && <p className="doctors-form-error">{formError}</p>}

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
