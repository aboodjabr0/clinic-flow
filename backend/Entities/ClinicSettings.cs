namespace ClinicFlow.Api.Entities;

/// <summary>
/// Single-row clinic configuration. There is only ever one settings record.
/// </summary>
public class ClinicSettings
{
    public Guid Id { get; set; }
    public required string ClinicName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public TimeOnly? OpeningTime { get; set; }
    public TimeOnly? ClosingTime { get; set; }
    public required string DefaultCurrency { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
