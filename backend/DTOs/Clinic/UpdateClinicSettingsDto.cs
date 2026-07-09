using System.ComponentModel.DataAnnotations;

namespace ClinicFlow.Api.DTOs.Clinic;

public class UpdateClinicSettingsDto
{
    [Required, StringLength(200)]
    public required string ClinicName { get; init; }

    [StringLength(30)]
    public string? PhoneNumber { get; init; }

    [EmailAddress, StringLength(256)]
    public string? Email { get; init; }

    [StringLength(300)]
    public string? Address { get; init; }

    /// <summary>"HH:mm" form, e.g. "09:00". Validated against that exact format.</summary>
    public string? OpeningTime { get; init; }
    public string? ClosingTime { get; init; }

    [Required, StringLength(10)]
    public required string DefaultCurrency { get; init; }
}
