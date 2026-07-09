namespace ClinicFlow.Api.Entities;

/// <summary>
/// The clinical record for a single appointment: chief complaint,
/// doctor-entered diagnosis/treatment notes, a manually typed prescription,
/// and an optional follow-up date. The doctor writes every clinical field —
/// nothing here is system-generated or AI-assisted. At most one Visit exists
/// per Appointment.
/// </summary>
public class Visit
{
    public Guid Id { get; set; }

    public Guid AppointmentId { get; set; }
    public Appointment? Appointment { get; set; }

    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }

    public Guid DoctorProfileId { get; set; }
    public DoctorProfile? DoctorProfile { get; set; }

    public DateOnly VisitDate { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }

    public VisitStatus Status { get; set; } = VisitStatus.InProgress;

    public string? ChiefComplaint { get; set; }
    public string? DiagnosisNote { get; set; }
    public string? TreatmentNote { get; set; }
    public string? ToothNumbers { get; set; }
    public string? PrescriptionNote { get; set; }
    public DateOnly? FollowUpDate { get; set; }
    public string? InternalNotes { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
