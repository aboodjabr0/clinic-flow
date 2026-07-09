namespace ClinicFlow.Api.DTOs.Appointments;

public class AppointmentStatsDto
{
    public required int TotalAppointments { get; init; }
    public required int TodayAppointments { get; init; }
    public required int ScheduledAppointments { get; init; }
    public required int CompletedAppointments { get; init; }
    public required int CancelledOrNoShowAppointments { get; init; }
}
