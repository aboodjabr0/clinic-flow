namespace ClinicFlow.Api.DTOs.Reports;

/// <summary>
/// Invoice/payment summary for a date range. Totals are computed over
/// invoices issued within the range.
/// </summary>
public class RevenueReportDto
{
    public required DateOnly FromDate { get; init; }
    public required DateOnly ToDate { get; init; }
    public required int InvoiceCount { get; init; }
    public required decimal TotalInvoiced { get; init; }
    public required decimal TotalPaid { get; init; }
    public required decimal TotalOutstanding { get; init; }
    public required List<RevenueReportRowDto> Rows { get; init; }
}
