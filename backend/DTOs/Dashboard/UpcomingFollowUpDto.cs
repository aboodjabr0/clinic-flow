namespace ClinicFlow.Api.DTOs.Dashboard;

/// <summary>
/// A completed or in-progress visit with a follow-up date from today onward.
/// The phone number is included so reception can call the patient.
/// </summary>
public class UpcomingFollowUpDto
{
    public required Guid VisitId { get; init; }
    public required Guid PatientId { get; init; }
    public required string PatientFullName { get; init; }
    public required string PatientPhoneNumber { get; init; }
    public required string DoctorFullName { get; init; }
    public required DateOnly FollowUpDate { get; init; }
}
