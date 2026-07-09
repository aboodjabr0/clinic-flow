namespace ClinicFlow.Api.DTOs.Patients;

public class PatientStatsDto
{
    public required int TotalPatients { get; init; }
    public required int ActivePatients { get; init; }
    public required int InactivePatients { get; init; }
    public required int NewPatientsThisMonth { get; init; }
}
