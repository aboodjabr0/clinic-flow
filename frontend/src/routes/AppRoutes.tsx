import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { LoginPage } from "../pages/Login/LoginPage";
import { DashboardPage } from "../pages/Dashboard/DashboardPage";
import { PatientsPage } from "../pages/Patients/PatientsPage";
import { PatientDetailsPage } from "../pages/Patients/PatientDetailsPage";
import { AppointmentsPage } from "../pages/Appointments/AppointmentsPage";
import { AppointmentDetailsPage } from "../pages/Appointments/AppointmentDetailsPage";
import { DoctorsPage } from "../pages/Doctors/DoctorsPage";
import { ServicesPage } from "../pages/Services/ServicesPage";
import { VisitsPage } from "../pages/Visits/VisitsPage";
import { VisitDetailsPage } from "../pages/Visits/VisitDetailsPage";
import { InvoicesPage } from "../pages/Invoices/InvoicesPage";
import { InvoiceDetailsPage } from "../pages/Invoices/InvoiceDetailsPage";
import { ReportsPage } from "../pages/Reports/ReportsPage";
import { SettingsPage } from "../pages/Settings/SettingsPage";
import { AuditLogsPage } from "../pages/AuditLogs/AuditLogsPage";
import { AccessDeniedPage } from "../pages/AccessDenied/AccessDeniedPage";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/access-denied" element={<AccessDeniedPage />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/:id" element={<PatientDetailsPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/appointments/:id" element={<AppointmentDetailsPage />} />
        <Route path="/doctors" element={<DoctorsPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/visits" element={<VisitsPage />} />
        <Route path="/visits/:id" element={<VisitDetailsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
