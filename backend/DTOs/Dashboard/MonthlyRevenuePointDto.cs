namespace ClinicFlow.Api.DTOs.Dashboard;

/// <summary>One month's received payments, e.g. label "Feb 2026".</summary>
public class MonthlyRevenuePointDto
{
    public required int Year { get; init; }
    public required int Month { get; init; }
    public required string Label { get; init; }
    public required decimal TotalPaid { get; init; }
}
