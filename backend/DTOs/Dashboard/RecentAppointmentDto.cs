namespace ClinicFlow.Api.DTOs.Dashboard;

/// <summary>
/// Compact appointment row used by the today-schedule and recent-activity
/// dashboard lists. Deliberately excludes reason/notes — the dashboard shows
/// operational data only.
/// </summary>
public class RecentAppointmentDto
{
    public required Guid Id { get; init; }
    public required string PatientFullName { get; init; }
    public required string DoctorFullName { get; init; }
    public required string ServiceName { get; init; }
    public required DateOnly AppointmentDate { get; init; }
    public required string StartTime { get; init; }
    public required string EndTime { get; init; }
    public required string Status { get; init; }
}
