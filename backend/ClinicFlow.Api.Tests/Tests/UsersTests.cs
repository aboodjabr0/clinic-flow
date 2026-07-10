using System.Net.Http.Json;
using ClinicFlow.Api.DTOs.Users;
using ClinicFlow.Api.Entities;
using ClinicFlow.Api.Tests.Helpers;
using ClinicFlow.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace ClinicFlow.Api.Tests.Tests;

[Collection(ApiTestCollection.Name)]
public class UsersTests
{
    private readonly ClinicFlowWebApplicationFactory _factory;

    public UsersTests(ClinicFlowWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private static CreateUserDto NewReceptionistDto(string? email = null)
    {
        var suffix = TestData.UniqueSuffix();
        return new CreateUserDto
        {
            FullName = $"Test Receptionist {suffix}",
            Email = email ?? $"receptionist.{suffix}@clinicflow.test",
            Password = $"Recep-Pass-{suffix}-1!",
            Role = nameof(UserRole.Receptionist)
        };
    }

    private async Task<UserDto> CreateUserAsync(HttpClient adminClient, CreateUserDto request)
    {
        var response = await adminClient.PostAsJsonAsync("/api/users", request);
        response.EnsureSuccessStatusCode();
        return await response.ReadDataAsync<UserDto>();
    }

    [Fact]
    public async Task List_AsAdmin_Returns200()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);

        var response = await admin.GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var users = await response.ReadDataAsync<List<UserDto>>();
        Assert.Contains(users, u => u.Email == TestUsers.Admin.Email);
    }

    [Fact]
    public async Task List_AsNonAdmin_Returns403()
    {
        var doctor = await _factory.CreateClientForAsync(TestUsers.Doctor);

        var response = await doctor.GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task List_AsAnonymous_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetById_UnknownId_Returns404()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);

        var response = await admin.GetAsync($"/api/users/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Create_ReceptionistAsAdmin_Returns200()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);

        var user = await CreateUserAsync(admin, NewReceptionistDto());

        Assert.Equal(nameof(UserRole.Receptionist), user.Role);
        Assert.True(user.IsActive);
    }

    [Fact]
    public async Task Create_DoctorLinkedToProfile_Returns200()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var profile = await TestData.CreateDoctorProfileAsync(admin);
        var suffix = TestData.UniqueSuffix();

        var request = new CreateUserDto
        {
            FullName = $"Dr. User {suffix}",
            Email = $"dr.user.{suffix}@clinicflow.test",
            Password = $"Doctor-Pass-{suffix}-1!",
            Role = nameof(UserRole.Doctor),
            DoctorProfileId = profile.Id
        };

        var user = await CreateUserAsync(admin, request);

        Assert.Equal(profile.Id, user.DoctorProfileId);
        Assert.Equal(profile.FullName, user.DoctorProfileName);
    }

    [Fact]
    public async Task Create_DuplicateEmail_Returns409()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var dto = NewReceptionistDto();
        await CreateUserAsync(admin, dto);

        var response = await admin.PostAsJsonAsync("/api/users", NewReceptionistDto(email: dto.Email));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Create_DoctorProfileAlreadyLinked_Returns409()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);

        var response = await admin.PostAsJsonAsync("/api/users", new CreateUserDto
        {
            FullName = "Duplicate Link",
            Email = $"duplicate.link.{TestData.UniqueSuffix()}@clinicflow.test",
            Password = "Duplicate-Pass-1!",
            Role = nameof(UserRole.Doctor),
            DoctorProfileId = _factory.SeededDoctorProfileId // already linked to TestUsers.Doctor
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Create_InvalidRole_Returns400()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var suffix = TestData.UniqueSuffix();

        var response = await admin.PostAsJsonAsync("/api/users", new
        {
            fullName = "Invalid Role User",
            email = $"invalid.role.{suffix}@clinicflow.test",
            password = "Valid-Pass-1!",
            role = "SuperAdmin"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_WeakPassword_Returns400()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var dto = NewReceptionistDto();

        var response = await admin.PostAsJsonAsync("/api/users", new
        {
            fullName = dto.FullName,
            email = dto.Email,
            password = "short",
            role = dto.Role
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsNonAdmin_Returns403()
    {
        var receptionist = await _factory.CreateClientForAsync(TestUsers.Receptionist);

        var response = await receptionist.PostAsJsonAsync("/api/users", NewReceptionistDto());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Update_AsAdmin_Returns200()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var user = await CreateUserAsync(admin, NewReceptionistDto());
        var newFullName = $"Updated Name {TestData.UniqueSuffix()}";

        var response = await admin.PutAsJsonAsync($"/api/users/{user.Id}", new UpdateUserDto
        {
            FullName = newFullName,
            Email = user.Email,
            Role = user.Role,
            IsActive = user.IsActive
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.ReadDataAsync<UserDto>();
        Assert.Equal(newFullName, updated.FullName);
    }

    [Fact]
    public async Task Deactivate_AsAdmin_Returns200AndBlocksLogin()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var dto = NewReceptionistDto();
        var user = await CreateUserAsync(admin, dto);

        var statusResponse = await admin.PatchAsJsonAsync($"/api/users/{user.Id}/status", new { isActive = false });

        Assert.Equal(HttpStatusCode.OK, statusResponse.StatusCode);
        var updated = await statusResponse.ReadDataAsync<UserDto>();
        Assert.False(updated.IsActive);

        // Deactivated user cannot login.
        var loginResponse = await _factory.CreateClient().PostAsJsonAsync("/api/auth/login", new
        {
            email = dto.Email,
            password = dto.Password
        });
        Assert.Equal(HttpStatusCode.Unauthorized, loginResponse.StatusCode);
    }

    [Fact]
    public async Task Deactivate_LastActiveAdmin_Returns409()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var adminId = await _factory.QueryDbAsync(db => db.AppUsers
            .Where(u => u.Email.ToLower() == TestUsers.Admin.Email.ToLower())
            .Select(u => u.Id)
            .SingleAsync());

        var response = await admin.PatchAsJsonAsync($"/api/users/{adminId}/status", new { isActive = false });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task ResetPassword_AsAdmin_OldPasswordFailsNewPasswordWorks()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var dto = NewReceptionistDto();
        var user = await CreateUserAsync(admin, dto);
        var newPassword = $"New-Pass-{TestData.UniqueSuffix()}-1!";

        var resetResponse = await admin.PostAsJsonAsync(
            $"/api/users/{user.Id}/reset-password", new ResetPasswordDto { NewPassword = newPassword });
        Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

        var anonymous = _factory.CreateClient();

        var oldPasswordLogin = await anonymous.PostAsJsonAsync("/api/auth/login", new
        {
            email = dto.Email,
            password = dto.Password
        });
        Assert.Equal(HttpStatusCode.Unauthorized, oldPasswordLogin.StatusCode);

        var newPasswordLogin = await anonymous.PostAsJsonAsync("/api/auth/login", new
        {
            email = dto.Email,
            password = newPassword
        });
        Assert.Equal(HttpStatusCode.OK, newPasswordLogin.StatusCode);
    }

    [Fact]
    public async Task UserManagementActions_CreateAuditLogEntries()
    {
        var admin = await _factory.CreateClientForAsync(TestUsers.Admin);
        var dto = NewReceptionistDto();
        var user = await CreateUserAsync(admin, dto);
        await admin.PutAsJsonAsync($"/api/users/{user.Id}", new UpdateUserDto
        {
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            IsActive = user.IsActive
        });
        await admin.PatchAsJsonAsync($"/api/users/{user.Id}/status", new { isActive = false });
        await admin.PostAsJsonAsync(
            $"/api/users/{user.Id}/reset-password", new ResetPasswordDto { NewPassword = "Another-Pass-1!" });

        var logs = await _factory.QueryDbAsync(db => db.AuditLogs
            .Where(l => l.EntityType == "User" && l.EntityId == user.Id)
            .ToListAsync());

        Assert.Contains(logs, l => l.Action == "Created");
        Assert.Contains(logs, l => l.Action == "Updated");
        Assert.Contains(logs, l => l.Action == "Deactivated");

        // No log for this user's actions may contain the plaintext password anywhere.
        Assert.DoesNotContain(logs, l =>
            (l.Summary.Contains(dto.Password) ) ||
            (l.Summary.Contains("Another-Pass-1!")));
    }
}
