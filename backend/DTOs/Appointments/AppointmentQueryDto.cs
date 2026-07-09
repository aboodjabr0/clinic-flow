namespace ClinicFlow.Api.DTOs.Appointments;

/// <summary>Bound from query string parameters on GET /api/appointments.</summary>
public class AppointmentQueryDto
{
    public string? Search { get; init; }
    public DateOnly? Date { get; init; }
    public DateOnly? FromDate { get; init; }
    public DateOnly? ToDate { get; init; }
    public Guid? DoctorId { get; init; }
    public Guid? PatientId { get; init; }
    public Guid? ServiceId { get; init; }
    public string? Status { get; init; }
    public int PageNumber { get; init; } = 1;
    public int PageSize { get; init; } = 10;
}
