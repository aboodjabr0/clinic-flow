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
import { useTranslation } from "../../i18n/useTranslation";
import { formatDate } from "../../utils/patient";
import { ALL_VISIT_STATUSES, VISIT_STATUS_LABEL_KEYS, VISIT_STATUS_VARIANTS } from "../../utils/visit";
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
  const { t } = useTranslation();
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
      const message = error instanceof ApiError ? error.message : t("visits.errorReachApi");
      setView({ status: "error", message });
    }
  }, [search, fromDate, toDate, doctorFilter, statusFilter, patientIdFilter, pageNumber, t]);

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
      setFormError(error instanceof ApiError ? error.message : t("visits.errorLoadExisting"));
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
      setFormError(error instanceof ApiError ? error.message : t("visits.errorUnableToSave"));
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
      <PageHeader title={t("visits.title")} subtitle={t("visits.subtitle")} />

      {stats && (
        <div className="visits-stats">
          <StatCard label={t("visits.statTotal")} value={stats.totalVisits} />
          <StatCard label={t("visits.statInProgress")} value={stats.inProgressVisits} />
          <StatCard label={t("visits.statCompleted")} value={stats.completedVisits} />
          <StatCard label={t("visits.statFollowUpsScheduled")} value={stats.followUpsScheduled} />
        </div>
      )}

      <Card>
        {patientIdFilter && (
          <div className="visits-patient-filter-banner">
            <span>
              {t("visits.showingFor")}{" "}
              <strong>{patients.find((p) => p.id === patientIdFilter)?.fullName ?? t("visits.selectedPatient")}</strong>
            </span>
            <Button variant="ghost" onClick={clearFilters}>
              {t("common.clear")}
            </Button>
          </div>
        )}
        <div className="visits-filters">
          <Input
            placeholder={t("visits.searchPlaceholder")}
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
            <option value="all">{t("visits.allStatuses")}</option>
            {ALL_VISIT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(VISIT_STATUS_LABEL_KEYS[status])}
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
            <option value="all">{t("visits.allDoctors")}</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.fullName}
              </option>
            ))}
          </Select>
          <Button type="button" variant="ghost" onClick={clearFilters}>
            {t("common.clear")}
          </Button>
        </div>

        {view.status === "loading" && <LoadingState label={t("visits.loading")} />}

        {view.status === "error" && <EmptyState title={t("visits.unableToLoad")} description={view.message} />}

        {view.status === "loaded" && visits.length === 0 && (
          <EmptyState
            title={t("visits.noneFoundTitle")}
            description={t("visits.noneFoundDescription")}
          />
        )}

        {view.status === "loaded" && visits.length > 0 && (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("table.visitDate")}</th>
                    <th>{t("table.patient")}</th>
                    <th>{t("table.phone")}</th>
                    <th>{t("table.doctor")}</th>
                    <th>{t("table.service")}</th>
                    <th>{t("table.status")}</th>
                    <th>{t("table.followUp")}</th>
                    <th aria-label={t("common.actions")} />
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
                          label={t(VISIT_STATUS_LABEL_KEYS[visit.status])}
                          variant={VISIT_STATUS_VARIANTS[visit.status]}
                        />
                      </td>
                      <td>{visit.followUpDate ? formatDate(visit.followUpDate) : "—"}</td>
                      <td className="visits-table-actions">
                        <Button variant="ghost" onClick={() => navigate(`/visits/${visit.id}`)}>
                          {t("common.view")}
                        </Button>
                        {canManageVisits && (
                          <Button variant="ghost" onClick={() => openVisitModal(visit, "edit")}>
                            {t("common.edit")}
                          </Button>
                        )}
                        {canManageVisits && visit.status === "InProgress" && (
                          <Button variant="primary" onClick={() => openVisitModal(visit, "complete")}>
                            {t("visits.complete")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="visits-result-count">{t("visits.countFound", { count: totalCount })}</p>
            <Pagination pageNumber={pageNumber} totalPages={totalPages} onPageChange={setPageNumber} />
          </>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        title={modalMode === "complete" ? t("visits.completeTitle") : t("visits.editTitle")}
        onClose={closeModal}
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <p className="visits-form-note">{t("visits.doctorNoteDisclaimer")}</p>

          <Textarea
            label={t("visits.chiefComplaint")}
            value={form.chiefComplaint}
            onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
          />
          <Textarea
            label={t("visits.diagnosisNote")}
            value={form.diagnosisNote}
            onChange={(e) => setForm({ ...form, diagnosisNote: e.target.value })}
          />
          <Textarea
            label={t("visits.treatmentNote")}
            value={form.treatmentNote}
            onChange={(e) => setForm({ ...form, treatmentNote: e.target.value })}
          />
          <Input
            label={t("visits.toothNumbers")}
            value={form.toothNumbers}
            onChange={(e) => setForm({ ...form, toothNumbers: e.target.value })}
          />
          <Textarea
            label={t("visits.prescription")}
            value={form.prescriptionNote}
            onChange={(e) => setForm({ ...form, prescriptionNote: e.target.value })}
          />
          <Input
            label={t("visits.followUpDate")}
            type="date"
            value={form.followUpDate}
            onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
          />
          <Textarea
            label={t("visits.internalNotes")}
            value={form.internalNotes}
            onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
          />

          {formError && <p className="visits-form-error">{formError}</p>}

          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={closeModal} disabled={isSaving}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("common.saving") : modalMode === "complete" ? t("visits.completeTitle") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
