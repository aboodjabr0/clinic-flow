import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/common/PageHeader";
import { Card } from "../../components/common/Card";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingState } from "../../components/common/LoadingState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { Textarea } from "../../components/common/Textarea";
import { Modal } from "../../components/common/Modal";
import { Pagination } from "../../components/common/Pagination";
import { StatCard } from "../../components/dashboard/StatCard";
import { patientsApi } from "../../api/patientsApi";
import { ApiError } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../i18n/useTranslation";
import { calculateAge, formatDate, GENDER_LABEL_KEYS } from "../../utils/patient";
import type { CreatePatientRequest, Patient, PatientGender, PatientListItem, PatientStats } from "../../types/patient";
import "./PatientsPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

type StatusFilter = "all" | "active" | "inactive";
type GenderFilter = "all" | PatientGender;

interface PatientFormState {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  gender: PatientGender | "";
  dateOfBirth: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  allergies: string;
  medicalNotes: string;
}

const PAGE_SIZE = 10;

const EMPTY_FORM: PatientFormState = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  email: "",
  gender: "",
  dateOfBirth: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  allergies: "",
  medicalNotes: "",
};

export function PatientsPage() {
  const { hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const canManagePatients = hasAnyRole(["Admin", "Receptionist"]);

  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [view, setView] = useState<ViewState>({ status: "loading" });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<PatientFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPageNumber(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadPatients = useCallback(async () => {
    setView({ status: "loading" });
    try {
      const response = await patientsApi.getPatients({
        search: search || undefined,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
        gender: genderFilter === "all" ? undefined : genderFilter,
        pageNumber,
        pageSize: PAGE_SIZE,
      });
      setPatients(response.data.items);
      setTotalPages(response.data.totalPages);
      setTotalCount(response.data.totalCount);
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t("common.unableToReachApi");
      setView({ status: "error", message });
    }
  }, [search, statusFilter, genderFilter, pageNumber, t]);

  const loadStats = useCallback(async () => {
    try {
      const response = await patientsApi.getPatientStats();
      setStats(response.data);
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  function openCreateModal() {
    setEditingPatient(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(patient: Patient) {
    setEditingPatient(patient);
    setForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      phoneNumber: patient.phoneNumber,
      email: patient.email ?? "",
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth ?? "",
      address: patient.address ?? "",
      emergencyContactName: patient.emergencyContactName ?? "",
      emergencyContactPhone: patient.emergencyContactPhone ?? "",
      allergies: patient.allergies ?? "",
      medicalNotes: patient.medicalNotes ?? "",
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  async function openEditModalFor(id: string) {
    try {
      const response = await patientsApi.getPatientById(id);
      openEditModal(response.data);
    } catch (error) {
      setView({
        status: "error",
        message: error instanceof ApiError ? error.message : t("patients.errorUnableToLoad"),
      });
    }
  }

  function closeModal() {
    if (isSaving) return;
    setIsModalOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim() || !form.phoneNumber.trim()) {
      setFormError(t("patients.errorRequired"));
      return;
    }
    if (!form.gender) {
      setFormError(t("patients.errorGenderRequired"));
      return;
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setFormError(t("patients.errorInvalidEmail"));
      return;
    }
    if (form.dateOfBirth && form.dateOfBirth > new Date().toISOString().slice(0, 10)) {
      setFormError(t("patients.errorFutureDob"));
      return;
    }

    const payload: CreatePatientRequest = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      email: form.email.trim() || undefined,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth || undefined,
      address: form.address.trim() || undefined,
      emergencyContactName: form.emergencyContactName.trim() || undefined,
      emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
      allergies: form.allergies.trim() || undefined,
      medicalNotes: form.medicalNotes.trim() || undefined,
    };

    setIsSaving(true);
    setFormError(null);
    try {
      if (editingPatient) {
        await patientsApi.updatePatient(editingPatient.id, payload);
      } else {
        await patientsApi.createPatient(payload);
      }
      setIsModalOpen(false);
      await loadPatients();
      await loadStats();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("patients.errorUnableToSave"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(patient: PatientListItem) {
    try {
      await patientsApi.setPatientStatus(patient.id, !patient.isActive);
      await loadPatients();
      await loadStats();
    } catch {
      // Ignored — the table simply keeps its last known state on failure.
    }
  }

  return (
    <>
      <PageHeader
        title={t("patients.title")}
        subtitle={t("patients.subtitle")}
        actions={canManagePatients ? <Button onClick={openCreateModal}>{t("patients.addPatient")}</Button> : undefined}
      />

      {stats && (
        <div className="patients-stats">
          <StatCard label={t("patients.statTotal")} value={stats.totalPatients} />
          <StatCard label={t("patients.statActive")} value={stats.activePatients} />
          <StatCard label={t("patients.statInactive")} value={stats.inactivePatients} />
          <StatCard label={t("patients.statNewThisMonth")} value={stats.newPatientsThisMonth} />
        </div>
      )}

      <Card>
        <div className="patients-filters">
          <Input
            placeholder={t("patients.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPageNumber(1);
            }}
          >
            <option value="all">{t("patients.allStatuses")}</option>
            <option value="active">{t("common.active")}</option>
            <option value="inactive">{t("common.inactive")}</option>
          </Select>
          <Select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value as GenderFilter);
              setPageNumber(1);
            }}
          >
            <option value="all">{t("patients.allGenders")}</option>
            {(Object.keys(GENDER_LABEL_KEYS) as PatientGender[]).map((gender) => (
              <option key={gender} value={gender}>
                {t(GENDER_LABEL_KEYS[gender])}
              </option>
            ))}
          </Select>
        </div>

        {view.status === "loading" && <LoadingState label={t("patients.loading")} />}

        {view.status === "error" && (
          <EmptyState title={t("patients.unableToLoad")} description={view.message} />
        )}

        {view.status === "loaded" && patients.length === 0 && (
          <EmptyState
            title={t("patients.noneFoundTitle")}
            description={t("patients.noneFoundDescription")}
          />
        )}

        {view.status === "loaded" && patients.length > 0 && (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("table.name")}</th>
                    <th>{t("table.phone")}</th>
                    <th>{t("table.email")}</th>
                    <th>{t("table.gender")}</th>
                    <th>{t("table.age")}</th>
                    <th>{t("table.status")}</th>
                    <th>{t("table.created")}</th>
                    <th aria-label={t("common.actions")} />
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => {
                    const age = calculateAge(patient.dateOfBirth);
                    return (
                      <tr key={patient.id}>
                        <td>{patient.fullName}</td>
                        <td>{patient.phoneNumber}</td>
                        <td>{patient.email ?? "—"}</td>
                        <td>{t(GENDER_LABEL_KEYS[patient.gender])}</td>
                        <td>{age !== null ? age : "—"}</td>
                        <td>
                          <StatusBadge
                            label={patient.isActive ? t("common.active") : t("common.inactive")}
                            variant={patient.isActive ? "success" : "neutral"}
                          />
                        </td>
                        <td>{formatDate(patient.createdAtUtc)}</td>
                        <td className="patients-table-actions">
                          <Button variant="ghost" onClick={() => navigate(`/patients/${patient.id}`)}>
                            {t("common.view")}
                          </Button>
                          {canManagePatients && (
                            <>
                              <Button variant="ghost" onClick={() => openEditModalFor(patient.id)}>
                                {t("common.edit")}
                              </Button>
                              <Button
                                variant={patient.isActive ? "danger" : "secondary"}
                                onClick={() => handleToggleStatus(patient)}
                              >
                                {patient.isActive ? t("users.deactivate") : t("users.activate")}
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="patients-result-count">{t("patients.countFound", { count: totalCount })}</p>
            <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
          </>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        title={editingPatient ? t("patients.editTitle") : t("patients.addTitle")}
        onClose={closeModal}
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <fieldset className="patients-form-section">
            <legend>{t("patients.sectionBasicInfo")}</legend>
            <Input
              label={t("patients.firstName")}
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
            <Input
              label={t("patients.lastName")}
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
            <Select
              label={t("patients.gender")}
              required
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as PatientGender })}
            >
              <option value="" disabled>
                {t("patients.selectGender")}
              </option>
              {(Object.keys(GENDER_LABEL_KEYS) as PatientGender[]).map((gender) => (
                <option key={gender} value={gender}>
                  {t(GENDER_LABEL_KEYS[gender])}
                </option>
              ))}
            </Select>
            <Input
              label={t("patients.dateOfBirth")}
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
          </fieldset>

          <fieldset className="patients-form-section">
            <legend>{t("patients.sectionContactInfo")}</legend>
            <Input
              label={t("patients.phoneNumber")}
              required
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            />
            <Input
              label={t("patients.email")}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label={t("patients.address")}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <Input
              label={t("patients.emergencyContactName")}
              value={form.emergencyContactName}
              onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
            />
            <Input
              label={t("patients.emergencyContactPhone")}
              value={form.emergencyContactPhone}
              onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
            />
          </fieldset>

          <fieldset className="patients-form-section">
            <legend>{t("patients.sectionMedicalNotes")}</legend>
            <Textarea
              label={t("patients.allergies")}
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
            />
            <Textarea
              label={t("patients.medicalNotes")}
              value={form.medicalNotes}
              onChange={(e) => setForm({ ...form, medicalNotes: e.target.value })}
            />
          </fieldset>

          {formError && <p className="patients-form-error">{formError}</p>}

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
