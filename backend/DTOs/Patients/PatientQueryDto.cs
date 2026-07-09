namespace ClinicFlow.Api.DTOs.Patients;

/// <summary>Bound from query string parameters on GET /api/patients.</summary>
public class PatientQueryDto
{
    public string? Search { get; init; }
    public bool? IsActive { get; init; }
    public string? Gender { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 10;
}
