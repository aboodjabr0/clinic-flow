namespace ClinicFlow.Api.DTOs.Users;

/// <summary>Bound from query string parameters on GET /api/users.</summary>
public class UserQueryDto
{
    public string? Search { get; init; }
    public string? Role { get; init; }
    public bool? IsActive { get; init; }
}
