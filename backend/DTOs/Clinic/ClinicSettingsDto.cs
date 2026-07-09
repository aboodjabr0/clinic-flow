namespace ClinicFlow.Api.DTOs.Clinic;

public class ClinicSettingsDto
{
    public required Guid Id { get; init; }
    public required string ClinicName { get; init; }
    public string? PhoneNumber { get; init; }
    public string? Email { get; init; }
    public string? Address { get; init; }

    /// <summary>"HH:mm" form, matching an HTML time input.</summary>
    public string? OpeningTime { get; init; }
    public string? ClosingTime { get; init; }

    public required string DefaultCurrency { get; init; }
    public required DateTime CreatedAtUtc { get; init; }
    public DateTime? UpdatedAtUtc { get; init; }
}
