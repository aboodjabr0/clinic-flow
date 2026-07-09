namespace ClinicFlow.Api.DTOs.Dashboard;

/// <summary>Today's clinic activity: status counts plus the full schedule.</summary>
public class TodayClinicDto
{
    public required DateOnly Date { get; init; }
    public required int TotalAppointments { get; init; }
    public required int Arrived { get; init; }
    public required int InProgress { get; init; }
    public required int CompletedToday { get; init; }
    public required int CancelledOrNoShowToday { get; init; }
    public required List<RecentAppointmentDto> Appointments { get; init; }
}
