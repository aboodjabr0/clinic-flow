namespace ClinicFlow.Api.DTOs.Appointments;

/// <summary>Lightweight projection for calendar day/week views. Excludes Notes/CancellationReason.</summary>
public class CalendarAppointmentDto
{
    public required Guid Id { get; init; }
    public required Guid PatientId { get; init; }
    public required string PatientFullName { get; init; }
    public required Guid DoctorProfileId { get; init; }
    public required string DoctorFullName { get; init; }
    public required Guid DentalServiceId { get; init; }
    public required string ServiceName { get; init; }
    public required DateOnly AppointmentDate { get; init; }
    public required string StartTime { get; init; }
    public required string EndTime { get; init; }
    public required string Status { get; init; }
    public string? Reason { get; init; }
    public required bool HasVisit { get; init; }
    public string? InvoiceStatus { get; init; }
}
