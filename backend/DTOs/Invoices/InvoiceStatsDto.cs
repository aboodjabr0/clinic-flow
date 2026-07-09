namespace ClinicFlow.Api.DTOs.Invoices;

public class InvoiceStatsDto
{
    public required int TotalInvoices { get; init; }
    public required int UnpaidInvoices { get; init; }
    public required int PartiallyPaidInvoices { get; init; }
    public required int PaidInvoices { get; init; }

    /// <summary>Sum of PaidAmount across all invoices.</summary>
    public required decimal TotalRevenue { get; init; }

    /// <summary>Sum of RemainingAmount across all invoices.</summary>
    public required decimal OutstandingBalance { get; init; }
}
