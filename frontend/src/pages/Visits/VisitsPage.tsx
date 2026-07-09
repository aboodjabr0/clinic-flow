import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { visitsApi } from "../../api/visitsApi";
import { doctorsApi } from "../../api/doctorsApi";
import { patientsApi } from "../../api/patientsApi";
import { ApiError } from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../utils/patient";
import { ALL_VISIT_STATUSES, VISIT_STATUS_LABELS, VISIT_STATUS_VARIANTS } from "../../utils/visit";
import type { Doctor } from "../../types/doctor";
import type { PatientListItem } from "../../types/patient";
import type { UpdateVisitRequest, Visit, VisitListItem, VisitStats, VisitStatus } from "../../types/visit";
import "./VisitsPage.css";

type ViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded" };

type StatusFilter = "all" | VisitStatus;

interface VisitFormState {
  chiefComplaint: string;
  diagnosisNote: string;
  treatmentNote: string;
  toothNumbers: string;
  prescriptionNote: string;
  followUpDate: string;
  internalNotes: string;
}

const PAGE_SIZE = 10;

const EMPTY_FORM: VisitFormState = {
  chiefComplaint: "",
  diagnosisNote: "",
  treatmentNote: "",
  toothNumbers: "",
  prescriptionNote: "",
  followUpDate: "",
  internalNotes: "",
};

export function VisitsPage() {
  const { hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManageVisits = hasAnyRole(["Admin", "Doctor"]);
  const patientIdFilter = searchParams.get("patientId");

  const [visits, setVisits] = useState<VisitListItem[]>([]);
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [view, setView] = useState<ViewState>({ status: "loading" });

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<PatientListItem[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [editingVisit, setEditingVisit] = useState<VisitListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"edit" | "complete">("edit");
  const [form, setForm] = useState<VisitFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPageNumber(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadVisits = useCallback(async () => {
    setView({ status: "loading" });
    try {
      const response = await visitsApi.getVisits({
        search: search || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        doctorId: doctorFilter === "all" ? undefined : doctorFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
        patientId: patientIdFilter ?? undefined,
        pageNumber,
        pageSize: PAGE_SIZE,
      });
      setVisits(response.data.items);
      setTotalPages(response.data.totalPages);
      setTotalCount(response.data.totalCount);
      setView({ status: "loaded" });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Unable to reach the API.";
      setView({ status: "error", message });
    }
  }, [search, fromDate, toDate, doctorFilter, statusFilter, patientIdFilter, pageNumber]);

  const loadStats = useCallback(async () => {
    try {
      const response = await visitsApi.getVisitStats();
      setStats(response.data);
    } catch {
      setStats(null);
    }
  }, []);

  const loadReferenceData = useCallback(async () => {
    try {
      const [doctorsResponse, patientsResponse] = await Promise.all([
        doctorsApi.getAll(),
        patientsApi.getPatients({ isActive: true, pageNumber: 1, pageSize: 100 }),
      ]);
      setDoctors(doctorsResponse.data);
      setPatients(patientsResponse.data.items);
    } catch {
      // Reference data is only needed for filters/banners — the table can still load without it.
    }
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  function fillFormFromVisit(visit: Visit): VisitFormState {
    return {
      chiefComplaint: visit.chiefComplaint ?? "",
      diagnosisNote: visit.diagnosisNote ?? "",
      treatmentNote: visit.treatmentNote ?? "",
      toothNumbers: visit.toothNumbers ?? "",
      prescriptionNote: visit.prescriptionNote ?? "",
      followUpDate: visit.followUpDate ?? "",
      internalNotes: visit.internalNotes ?? "",
    };
  }

  async function openVisitModal(visit: VisitListItem, mode: "edit" | "complete") {
    setEditingVisit(visit);
    setModalMode(mode);
    setFormError(null);
    try {
      const response = await visitsApi.getVisitById(visit.id);
      setForm(fillFormFromVisit(response.data));
    } catch (error) {
      setForm(EMPTY_FORM);
      setFormError(error instanceof ApiError ? error.message : "Unable to load existing visit notes.");
    }
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;
    setIsModalOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingVisit) return;

    const payload: UpdateVisitRequest = {
      chiefComplaint: form.chiefComplaint.trim() || undefined,
      diagnosisNote: form.diagnosisNote.trim() || undefined,
      treatmentNote: form.treatmentNote.trim() || undefined,
      toothNumbers: form.toothNumbers.trim() || undefined,
      prescriptionNote: form.prescriptionNote.trim() || undefined,
      followUpDate: form.followUpDate || undefined,
      internalNotes: form.internalNotes.trim() || undefined,
    };

    setIsSaving(true);
    setFormError(null);
    try {
      if (modalMode === "complete") {
        await visitsApi.completeVisit(editingVisit.id, payload);
      } else {
        await visitsApi.updateVisit(editingVisit.id, payload);
      }
      setIsModalOpen(false);
      await loadVisits();
      await loadStats();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Unable to save visit.");
    } finally {
      setIsSaving(false);
    }
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
    setDoctorFilter("all");
    setPageNumber(1);
    if (patientIdFilter) {
      setSearchParams((params) => {
        params.delete("patientId");
        return params;
      });
    }
  }

  return (
    <>
      <PageHeader title="Visits" subtitle="Review dental visit notes and prescriptions." />

      {stats && (
        <div className="visits-stats">
          <StatCard label="Total" value={stats.totalVisits} />
          <StatCard label="In Progress" value={stats.inProgressVisits} />
          <StatCard label="Completed" value={stats.completedVisits} />
          <StatCard label="Follow-ups Scheduled" value={stats.followUpsScheduled} />
        </div>
      )}

      <Card>
        {patientIdFilter && (
          <div className="visits-patient-filter-banner">
            <span>
              Showing visits for{" "}
              <strong>{patients.find((p) => p.id === patientIdFilter)?.fullName ?? "selected patient"}</strong>
            </span>
            <Button variant="ghost" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        )}
        <div className="visits-filters">
          <Input
            placeholder="Search by patient, doctor, service, notes..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPageNumber(1);
            }}
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPageNumber(1);
            }}
          />
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPageNumber(1);
            }}
          >
            <option value="all">All statuses</option>
            {ALL_VISIT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {VISIT_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
          <Select
            value={doctorFilter}
            onChange={(e) => {
              setDoctorFilter(e.target.value);
              setPageNumber(1);
            }}
          >
            <option value="all">All doctors</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.fullName}
              </option>
            ))}
          </Select>
          <Button type="button" variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        </div>

        {view.status === "loading" && <LoadingState label="Loading visits..." />}

        {view.status === "error" && <EmptyState title="Unable to load visits" description={view.message} />}

        {view.status === "loaded" && visits.length === 0 && (
          <EmptyState
            title="No visits found"
            description="Try adjusting your search or filters. Visits are created by starting one from an appointment."
          />
        )}

        {view.status === "loaded" && visits.length > 0 && (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Visit Date</th>
                    <th>Patient</th>
                    <th>Phone</th>
                    <th>Doctor</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Follow-up</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{formatDate(visit.visitDate)}</td>
                      <td>{visit.patientFullName}</td>
                      <td>{visit.patientPhoneNumber}</td>
                      <td>{visit.doctorFullName}</td>
                      <td>{visit.serviceName}</td>
                      <td>
                        <StatusBadge
                          label={VISIT_STATUS_LABELS[visit.status]}
                          variant={VISIT_STATUS_VARIANTS[visit.status]}
                        />
                      </td>
                      <td>{visit.followUpDate ? formatDate(visit.followUpDate) : "—"}</td>
                      <td className="visits-table-actions">
                        <Button variant="ghost" onClick={() => navigate(`/visits/${visit.id}`)}>
                          View
                        </Button>
                        {canManageVisits && (
                          <Button variant="ghost" onClick={() => openVisitModal(visit, "edit")}>
                            Edit
                          </Button>
                        )}
                        {canManageVisits && visit.status === "InProgress" && (
                          <Button variant="primary" onClick={() => openVisitModal(visit, "complete")}>
                            Complete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="visits-result-count">{totalCount} visit(s) found</p>
            <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
          </>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        title={modalMode === "complete" ? "Complete Visit" : "Edit Visit"}
        onClose={closeModal}
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <p className="visits-form-note">
            Doctor-entered notes. The system does not generate diagnosis or treatment suggestions.
          </p>

          <Textarea
            label="Chief complaint"
            value={form.chiefComplaint}
            onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
          />
          <Textarea
            label="Diagnosis note"
            value={form.diagnosisNote}
            onChange={(e) => setForm({ ...form, diagnosisNote: e.target.value })}
          />
          <Textarea
            label="Treatment note"
            value={form.treatmentNote}
            onChange={(e) => setForm({ ...form, treatmentNote: e.target.value })}
          />
          <Input
            label="Tooth numbers"
            value={form.toothNumbers}
            onChange={(e) => setForm({ ...form, toothNumbers: e.target.value })}
          />
          <Textarea
            label="Prescription (entered manually by doctor)"
            value={form.prescriptionNote}
            onChange={(e) => setForm({ ...form, prescriptionNote: e.target.value })}
          />
          <Input
            label="Follow-up date"
            type="date"
            value={form.followUpDate}
            onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
          />
          <Textarea
            label="Internal notes"
            value={form.internalNotes}
            onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
          />

          {formError && <p className="visits-form-error">{formError}</p>}

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : modalMode === "complete" ? "Complete Visit" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
