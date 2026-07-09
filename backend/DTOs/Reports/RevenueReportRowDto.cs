namespace ClinicFlow.Api.DTOs.Reports;

/// <summary>One invoice issued within the report range.</summary>
public class RevenueReportRowDto
{
    public required Guid InvoiceId { get; init; }
    public required string InvoiceNumber { get; init; }
    public required DateOnly IssueDate { get; init; }
    public required string PatientFullName { get; init; }
    public string? ServiceName { get; init; }
    public required decimal TotalAmount { get; init; }
    public required decimal PaidAmount { get; init; }
    public required decimal RemainingAmount { get; init; }
    public required string Status { get; init; }
}
