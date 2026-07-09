namespace ClinicFlow.Api.Entities;

/// <summary>
/// A real dental doctor in the clinic. Linking to an <see cref="AppUser"/> is
/// optional — not every doctor needs a login account, but when one exists,
/// AppUserId ties the profile to that login (Role = Doctor).
/// </summary>
public class DoctorProfile
{
    public Guid Id { get; set; }
    public Guid? AppUserId { get; set; }
    public AppUser? AppUser { get; set; }
    public required string FullName { get; set; }
    public required string Email { get; set; }
    public string? PhoneNumber { get; set; }
    public required string Specialty { get; set; }
    public string? LicenseNumber { get; set; }
    public string? Bio { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
