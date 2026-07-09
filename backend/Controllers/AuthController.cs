using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs.Auth;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // TODO: add login rate limiting (e.g. per-IP/per-email) before production.
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<LoginResponseDto>>> Login([FromBody] LoginRequestDto request)
    {
        var result = await _authService.LoginAsync(request.Email, request.Password);

        if (result is null)
        {
            return Unauthorized(new ErrorResponse
            {
                Message = "Invalid email or password.",
                TraceId = HttpContext.TraceIdentifier
            });
        }

        return Ok(ApiResponse<LoginResponseDto>.Ok(result, "Login successful"));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<AuthUserDto>>> Me()
    {
        var userId = GetUserId();
        if (userId is null)
        {
            return Unauthorized(new ErrorResponse { Message = "Invalid token.", TraceId = HttpContext.TraceIdentifier });
        }

        var user = await _authService.GetUserByIdAsync(userId.Value);
        if (user is null)
        {
            return Unauthorized(new ErrorResponse { Message = "Account is no longer active.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<AuthUserDto>.Ok(user));
    }

    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        return Ok(ApiResponse<object>.Ok(new { }, "Logged out"));
    }

    [HttpGet("protected-test")]
    [Authorize]
    public IActionResult ProtectedTest()
    {
        return Ok(ApiResponse<object>.Ok(new { }, "You are authenticated."));
    }

    [HttpGet("admin-test")]
    [Authorize(Policy = "AdminOnly")]
    public IActionResult AdminTest()
    {
        return Ok(ApiResponse<object>.Ok(new { }, "You have Admin access."));
    }

    private Guid? GetUserId()
    {
        var subject = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return Guid.TryParse(subject, out var userId) ? userId : null;
    }
}
