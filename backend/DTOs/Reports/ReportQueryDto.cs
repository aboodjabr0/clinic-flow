namespace ClinicFlow.Api.DTOs.Reports;

/// <summary>
/// Bound from query string parameters on GET /api/reports/*. Each report only
/// reads the filters that apply to it; dates default to the current month
/// when omitted.
/// </summary>
public class ReportQueryDto
{
    public DateOnly? FromDate { get; init; }
    public DateOnly? ToDate { get; init; }

    /// <summary>Appointment report only.</summary>
    public Guid? DoctorId { get; init; }

    /// <summary>Appointment report only.</summary>
    public string? Status { get; init; }

    /// <summary>Patient report only.</summary>
    public bool? IsActive { get; init; }
}
