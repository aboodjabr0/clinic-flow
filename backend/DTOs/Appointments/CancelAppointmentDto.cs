using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Appointments;

public class CancelAppointmentDto
{
    [StringLength(500)]
    public string? CancellationReason { get; init; }
}
