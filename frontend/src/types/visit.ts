import type { VisitStatus } from "./enums";

export type { VisitStatus };

export interface Visit {
  id: string;
  appointmentId: string;
  appointmentDate: string;
  appointmentStartTime: string;
  appointmentEndTime: string;
  patientId: string;
  patientFullName: string;
  patientPhoneNumber: string;
  doctorProfileId: string;
  doctorFullName: string;
  serviceName: string;
  visitDate: string;
  status: VisitStatus;
  chiefComplaint: string | null;
  diagnosisNote: string | null;
  treatmentNote: string | null;
  toothNumbers: string | null;
  prescriptionNote: string | null;
  followUpDate: string | null;
  internalNotes: string | null;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface VisitListItem {
  id: string;
  appointmentId: string;
  patientId: string;
  patientFullName: string;
  patientPhoneNumber: string;
  doctorProfileId: string;
  doctorFullName: string;
  serviceName: string;
  visitDate: string;
  status: VisitStatus;
  followUpDate: string | null;
}

export interface StartVisitRequest {
  chiefComplaint?: string;
}

export interface UpdateVisitRequest {
  chiefComplaint?: string;
  diagnosisNote?: string;
  treatmentNote?: string;
  toothNumbers?: string;
  prescriptionNote?: string;
  followUpDate?: string;
  internalNotes?: string;
}

export interface CompleteVisitRequest extends UpdateVisitRequest {}

export interface VisitQuery {
  search?: string;
  patientId?: string;
  doctorId?: string;
  status?: VisitStatus;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface VisitStats {
  totalVisits: number;
  inProgressVisits: number;
  completedVisits: number;
  followUpsScheduled: number;
}
