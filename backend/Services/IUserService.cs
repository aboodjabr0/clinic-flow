using ClinicFlow.Api.DTOs.Users;

namespace ClinicFlow.Api.Services;

public interface IUserService
{
    Task<List<UserDto>> GetAllAsync(UserQueryDto query);

    Task<UserDto?> GetByIdAsync(Guid id);

    Task<(UserDto? User, string? Error)> CreateAsync(CreateUserDto request);

    Task<(UserDto? User, string? Error)> UpdateAsync(Guid id, UpdateUserDto request);

    Task<(UserDto? User, string? Error)> SetActiveStatusAsync(Guid id, bool isActive);

    Task<UserDto?> ResetPasswordAsync(Guid id, string newPassword);
}
