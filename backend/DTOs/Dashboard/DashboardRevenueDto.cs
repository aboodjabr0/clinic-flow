namespace ClinicFlow.Api.DTOs.Dashboard;

/// <summary>
/// Financial dashboard data (Admin/Receptionist only). "Revenue" means money
/// actually received (payments), while outstanding/unpaid amounts come from
/// invoice remaining balances.
/// </summary>
public class DashboardRevenueDto
{
    /// <summary>Sum of payments received this calendar month.</summary>
    public required decimal CurrentMonthRevenue { get; init; }

    /// <summary>Sum of RemainingAmount on invoices issued this month.</summary>
    public required decimal CurrentMonthOutstanding { get; init; }

    /// <summary>Sum of PaidAmount across all invoices.</summary>
    public required decimal TotalPaidAmount { get; init; }

    /// <summary>Sum of RemainingAmount across all invoices.</summary>
    public required decimal TotalUnpaidAmount { get; init; }

    public required List<RecentInvoiceDto> RecentPaidInvoices { get; init; }

    /// <summary>Payments received per month for the last 6 months (oldest first).</summary>
    public required List<MonthlyRevenuePointDto> MonthlyRevenue { get; init; }
}
