namespace ClinicFlow.Api.DTOs.Dashboard;

/// <summary>All-time appointment counts by status (doctor-scoped for Doctors).</summary>
public class AppointmentStatusBreakdownDto
{
    public required int Scheduled { get; init; }
    public required int Arrived { get; init; }
    public required int InProgress { get; init; }
    public required int Completed { get; init; }
    public required int Cancelled { get; init; }
    public required int NoShow { get; init; }
}
