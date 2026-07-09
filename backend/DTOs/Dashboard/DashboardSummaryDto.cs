namespace ClinicFlow.Api.DTOs.Dashboard;

/// <summary>
/// Headline numbers for the dashboard. Appointment/visit counts are scoped to
/// the doctor's own profile for Doctor logins. The financial fields are null
/// for Doctors — financial visibility is limited to Admin and Receptionist.
/// </summary>
public class DashboardSummaryDto
{
    public required int TotalPatients { get; init; }
    public required int ActivePatients { get; init; }
    public required int NewPatientsThisMonth { get; init; }

    public required int TodayAppointments { get; init; }
    public required int ScheduledAppointments { get; init; }
    public required int CompletedAppointmentsThisMonth { get; init; }

    public required int InProgressVisits { get; init; }
    public required int CompletedVisitsThisMonth { get; init; }

    public int? UnpaidInvoices { get; init; }
    public int? PartiallyPaidInvoices { get; init; }
    public int? PaidInvoicesThisMonth { get; init; }
    public decimal? TotalRevenueThisMonth { get; init; }
    public decimal? OutstandingBalance { get; init; }
}
