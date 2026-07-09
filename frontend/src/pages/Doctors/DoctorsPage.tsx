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
      const message = error instanceof ApiError ? error.message : "Unable to reach the API.";
      setView({ status: "error", message });
    }
  }, []);

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
      setFormError("Full name and specialty are required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setFormError("Enter a valid email address.");
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
      setFormError(error instanceof ApiError ? error.message : "Unable to save doctor.");
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
        title="Doctors"
        subtitle="Manage the clinic's dental practitioners."
        actions={isAdmin ? <Button onClick={openCreateModal}>Add Doctor</Button> : undefined}
      />

      <Card>
        {view.status === "loading" && <LoadingState label="Loading doctors..." />}

        {view.status === "error" && (
          <EmptyState title="Unable to load doctors" description={view.message} />
        )}

        {view.status === "loaded" && doctors.length === 0 && (
          <EmptyState
            title="No doctors yet"
            description="Add the clinic's dental practitioners to get started."
          />
        )}

        {view.status === "loaded" && doctors.length > 0 && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Specialty</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  {isAdmin && <th aria-label="Actions" />}
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
                        label={doctor.isActive ? "Active" : "Inactive"}
                        variant={doctor.isActive ? "success" : "neutral"}
                      />
                    </td>
                    {isAdmin && (
                      <td className="doctors-table-actions">
                        <Button variant="ghost" onClick={() => openEditModal(doctor)}>
                          Edit
                        </Button>
                        <Button
                          variant={doctor.isActive ? "danger" : "secondary"}
                          onClick={() => handleToggleStatus(doctor)}
                        >
                          {doctor.isActive ? "Deactivate" : "Activate"}
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
        title={editingDoctor ? "Edit Doctor" : "Add Doctor"}
        onClose={closeModal}
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <Input
            label="Full name"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Phone number"
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          />
          <Input
            label="Specialty"
            required
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
          />
          <Input
            label="License number"
            value={form.licenseNumber}
            onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
          />
          <Input
            label="Bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />

          {formError && <p className="doctors-form-error">{formError}</p>}

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
