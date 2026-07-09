namespace ClinicFlow.Api.DTOs.Dashboard;

/// <summary>Compact invoice row for the financial dashboard lists.</summary>
public class RecentInvoiceDto
{
    public required Guid Id { get; init; }
    public required string InvoiceNumber { get; init; }
    public required string PatientFullName { get; init; }
    public required DateOnly IssueDate { get; init; }
    public required decimal TotalAmount { get; init; }
    public required decimal PaidAmount { get; init; }
    public required decimal RemainingAmount { get; init; }
    public required string Status { get; init; }
}
