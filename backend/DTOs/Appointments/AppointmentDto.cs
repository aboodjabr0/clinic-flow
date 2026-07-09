namespace ClinicFlow.Api.DTOs.Appointments;

public class AppointmentDto
{
    public required Guid Id { get; init; }

    public required Guid PatientId { get; init; }
    public required string PatientFullName { get; init; }
    public required string PatientPhoneNumber { get; init; }

    public required Guid DoctorProfileId { get; init; }
    public required string DoctorFullName { get; init; }

    public required Guid DentalServiceId { get; init; }
    public required string ServiceName { get; init; }
    public required decimal ServicePrice { get; init; }

    public required DateOnly AppointmentDate { get; init; }

    /// <summary>"HH:mm" form, matching an HTML time input.</summary>
    public required string StartTime { get; init; }
    public required string EndTime { get; init; }

    public required string Status { get; init; }
    public string? Reason { get; init; }
    public string? Notes { get; init; }
    public string? CancellationReason { get; init; }

    public required DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}
