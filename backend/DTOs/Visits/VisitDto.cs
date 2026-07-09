namespace ClinicFlow.Api.DTOs.Visits;

public class VisitDto
{
    public required Guid Id { get; init; }

    public required Guid AppointmentId { get; init; }
    public required DateOnly AppointmentDate { get; init; }

    /// <summary>"HH:mm" form, matching an HTML time input.</summary>
    public required string AppointmentStartTime { get; init; }
    public required string AppointmentEndTime { get; init; }

    public required Guid PatientId { get; init; }
    public required string PatientFullName { get; init; }
    public required string PatientPhoneNumber { get; init; }

    public required Guid DoctorProfileId { get; init; }
    public required string DoctorFullName { get; init; }

    public required string ServiceName { get; init; }

    public required DateOnly VisitDate { get; init; }
    public required string Status { get; init; }

    public string? ChiefComplaint { get; init; }
    public string? DiagnosisNote { get; init; }
    public string? TreatmentNote { get; init; }
    public string? ToothNumbers { get; init; }
    public string? PrescriptionNote { get; init; }
    public DateOnly? FollowUpDate { get; init; }
    public string? InternalNotes { get; init; }

    public DateTime? StartedAtUtc { get; init; }
    public DateTime? CompletedAtUtc { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}
