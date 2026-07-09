using ClinicFlow.Api.DTOs.Auth;

namespace ClinicFlow.Api.Services;

public interface IAuthService
{
    Task<LoginResponseDto?> LoginAsync(string email, string password);
    Task<AuthUserDto?> GetUserByIdAsync(Guid userId);
}
