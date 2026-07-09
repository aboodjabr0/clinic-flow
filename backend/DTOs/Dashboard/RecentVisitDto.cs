namespace ClinicFlow.Api.DTOs.Dashboard;

/// <summary>
/// Compact visit row for the recent-activity list. Clinical notes are
/// deliberately excluded from dashboard summaries.
/// </summary>
public class RecentVisitDto
{
    public required Guid Id { get; init; }
    public required string PatientFullName { get; init; }
    public required string DoctorFullName { get; init; }
    public required string ServiceName { get; init; }
    public required DateOnly VisitDate { get; init; }
    public required string Status { get; init; }
    public DateOnly? FollowUpDate { get; init; }
}
