namespace ClinicFlow.Api.DTOs.Appointments;

/// <summary>Lightweight projection for the appointments table/list.</summary>
public class AppointmentListItemDto
{
    public required Guid Id { get; init; }
    public required Guid PatientId { get; init; }
    public required string PatientFullName { get; init; }
    public required string PatientPhoneNumber { get; init; }
    public required Guid DoctorProfileId { get; init; }
    public required string DoctorFullName { get; init; }
    public required Guid DentalServiceId { get; init; }
    public required string ServiceName { get; init; }
    public required DateOnly AppointmentDate { get; init; }
    public required string StartTime { get; init; }
    public required string EndTime { get; init; }
    public required string Status { get; init; }
    public string? Reason { get; init; }
}
