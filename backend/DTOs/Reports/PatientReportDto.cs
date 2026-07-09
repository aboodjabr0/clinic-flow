namespace ClinicFlow.Api.DTOs.Reports;

/// <summary>Patients registered within a date range.</summary>
public class PatientReportDto
{
    public required DateOnly FromDate { get; init; }
    public required DateOnly ToDate { get; init; }
    public required int TotalCount { get; init; }
    public required int ActiveCount { get; init; }
    public required List<PatientReportRowDto> Rows { get; init; }
}
