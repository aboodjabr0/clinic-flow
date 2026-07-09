namespace ClinicFlow.Api.Entities;

/// <summary>
/// A scheduled patient visit with a specific doctor for a specific dental
/// service. See <see cref="Visit"/> for the clinical record created once the
/// visit is started.
/// </summary>
public class Appointment
{
    public Guid Id { get; set; }

    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }

    public Guid DoctorProfileId { get; set; }
    public DoctorProfile? DoctorProfile { get; set; }

    public Guid DentalServiceId { get; set; }
    public DentalService? DentalService { get; set; }

    public DateOnly AppointmentDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;

    public string? Reason { get; set; }
    public string? Notes { get; set; }
    public string? CancellationReason { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
