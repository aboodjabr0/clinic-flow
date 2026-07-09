namespace ClinicFlow.Api.DTOs.Reports;

/// <summary>Operational appointment row — no clinical notes or reasons.</summary>
public class AppointmentReportRowDto
{
    public required Guid Id { get; init; }
    public required DateOnly AppointmentDate { get; init; }
    public required string StartTime { get; init; }
    public required string EndTime { get; init; }
    public required string PatientFullName { get; init; }
    public required string DoctorFullName { get; init; }
    public required string ServiceName { get; init; }
    public required string Status { get; init; }
}
