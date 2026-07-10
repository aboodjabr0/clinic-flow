using ClinicFlow.Api.Common;
using ClinicFlow.Api.DTOs.Common;
using ClinicFlow.Api.DTOs.Users;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ClinicFlow.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Policy = "AdminOnly")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<UserDto>>>> GetAll([FromQuery] UserQueryDto query)
    {
        var users = await _userService.GetAllAsync(query);
        return Ok(ApiResponse<List<UserDto>>.Ok(users));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetById(Guid id)
    {
        var user = await _userService.GetByIdAsync(id);
        if (user is null)
        {
            return NotFound(new ErrorResponse { Message = "User not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<UserDto>.Ok(user));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<UserDto>>> Create([FromBody] CreateUserDto request)
    {
        var (user, error) = await _userService.CreateAsync(request);
        if (error is not null)
        {
            return Conflict(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<UserDto>.Ok(user!, "User created"));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<UserDto>>> Update(Guid id, [FromBody] UpdateUserDto request)
    {
        var (user, error) = await _userService.UpdateAsync(id, request);
        if (error is not null)
        {
            return Conflict(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        if (user is null)
        {
            return NotFound(new ErrorResponse { Message = "User not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<UserDto>.Ok(user, "User updated"));
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<UserDto>>> SetStatus(Guid id, [FromBody] SetActiveStatusDto request)
    {
        var (user, error) = await _userService.SetActiveStatusAsync(id, request.IsActive);
        if (error is not null)
        {
            return Conflict(new ErrorResponse { Message = error, TraceId = HttpContext.TraceIdentifier });
        }

        if (user is null)
        {
            return NotFound(new ErrorResponse { Message = "User not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<UserDto>.Ok(user, "User status updated"));
    }

    [HttpPost("{id:guid}/reset-password")]
    public async Task<ActionResult<ApiResponse<UserDto>>> ResetPassword(Guid id, [FromBody] ResetPasswordDto request)
    {
        var user = await _userService.ResetPasswordAsync(id, request.NewPassword);
        if (user is null)
        {
            return NotFound(new ErrorResponse { Message = "User not found.", TraceId = HttpContext.TraceIdentifier });
        }

        return Ok(ApiResponse<UserDto>.Ok(user, "Password reset"));
    }
}
