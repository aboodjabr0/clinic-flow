using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Appointments;

public class UpdateAppointmentStatusDto
{
    [Required, EnumDataType(typeof(Entities.AppointmentStatus))]
    public required string Status { get; init; }
}
