namespace ClinicFlow.Api.DTOs.Appointments;

/// <summary>Bound from query string parameters on GET /api/appointments/calendar.</summary>
public class CalendarQueryDto
{
    public DateOnly? StartDate { get; init; }
    public DateOnly? EndDate { get; init; }
    public Guid? DoctorId { get; init; }
    public string? Status { get; init; }
}
