namespace ClinicFlow.Api.DTOs.Reports;

/// <summary>
/// One patient registered within the report range. Contact/registration data
/// only — medical notes and allergies never appear in reports.
/// </summary>
public class PatientReportRowDto
{
    public required Guid Id { get; init; }
    public required string FullName { get; init; }
    public required string PhoneNumber { get; init; }
    public required string Gender { get; init; }
    public required bool IsActive { get; init; }
    public required DateOnly RegisteredDate { get; init; }
}
