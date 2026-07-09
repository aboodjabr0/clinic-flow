using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Appointments;

public class CreateAppointmentDto
{
    [Required]
    public required Guid PatientId { get; init; }

    [Required]
    public required Guid DoctorProfileId { get; init; }

    [Required]
    public required Guid DentalServiceId { get; init; }

    [Required]
    public required DateOnly AppointmentDate { get; init; }

    /// <summary>"HH:mm" form, e.g. "09:00".</summary>
    [Required, StringLength(5)]
    public required string StartTime { get; init; }

    [Required, StringLength(5)]
    public required string EndTime { get; init; }

    [StringLength(500)]
    public string? Reason { get; init; }

    [StringLength(2000)]
    public string? Notes { get; init; }
}
