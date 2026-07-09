using ClinicFlow.Api.DTOs.Reports;

namespace ClinicFlow.Api.Services;

/// <summary>
/// Read-only JSON reports. Dates default to the current month when omitted.
/// The appointment report accepts <c>restrictToDoctorProfileId</c> so Doctor
/// logins only see their own appointments (null = no restriction).
/// </summary>
public interface IReportService
{
    Task<Guid?> GetDoctorProfileIdForAppUserAsync(Guid appUserId);
    Task<(AppointmentReportDto? Report, string? Error)> GetAppointmentReportAsync(ReportQueryDto query, Guid? restrictToDoctorProfileId);
    Task<(RevenueReportDto? Report, string? Error)> GetRevenueReportAsync(ReportQueryDto query);
    Task<(PatientReportDto? Report, string? Error)> GetPatientReportAsync(ReportQueryDto query);
}
