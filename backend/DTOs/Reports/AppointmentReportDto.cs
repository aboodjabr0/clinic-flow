namespace ClinicFlow.Api.DTOs.Reports;

/// <summary>Appointment report for a date range, echoing the applied range.</summary>
public class AppointmentReportDto
{
    public required DateOnly FromDate { get; init; }
    public required DateOnly ToDate { get; init; }
    public required int TotalCount { get; init; }
    public required int CompletedCount { get; init; }
    public required int CancelledOrNoShowCount { get; init; }
    public required List<AppointmentReportRowDto> Rows { get; init; }
}
