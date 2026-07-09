namespace ClinicFlow.Api.DTOs.Visits;

public class VisitStatsDto
{
    public required int TotalVisits { get; init; }
    public required int InProgressVisits { get; init; }
    public required int CompletedVisits { get; init; }

    /// <summary>Visits with a follow-up date scheduled today or later.</summary>
    public required int FollowUpsScheduled { get; init; }
}
