namespace ClinicFlow.Api.DTOs.Visits;

/// <summary>Lightweight projection for the visits table/list.</summary>
public class VisitListItemDto
{
    public required Guid Id { get; init; }
    public required Guid AppointmentId { get; init; }
    public required Guid PatientId { get; init; }
    public required string PatientFullName { get; init; }
    public required string PatientPhoneNumber { get; init; }
    public required Guid DoctorProfileId { get; init; }
    public required string DoctorFullName { get; init; }
    public required string ServiceName { get; init; }
    public required DateOnly VisitDate { get; init; }
    public required string Status { get; init; }
    public DateOnly? FollowUpDate { get; init; }
}
