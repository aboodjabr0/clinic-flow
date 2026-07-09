using ClinicFlow.Api.Entities;

namespace ClinicFlow.Api.Services;

public interface IJwtTokenService
{
    string GenerateToken(AppUser user);
}
