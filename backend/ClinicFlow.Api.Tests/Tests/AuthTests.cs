using System.Net.Http.Json;
using ClinicFlow.Api.DTOs.Auth;
using ClinicFlow.Api.Tests.Helpers;
using ClinicFlow.Api.Tests.Infrastructure;

namespace ClinicFlow.Api.Tests.Tests;

[Collection(ApiTestCollection.Name)]
public class AuthTests
{
    private readonly ClinicFlowWebApplicationFactory _factory;

    public AuthTests(ClinicFlowWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Login_WithValidAdminCredentials_ReturnsTokenAndUser()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = TestUsers.Admin.Email,
            password = TestUsers.Admin.Password
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var login = await response.ReadDataAsync<LoginResponseDto>();
        Assert.False(string.IsNullOrWhiteSpace(login.Token));
        Assert.Equal(TestUsers.Admin.Email, login.User.Email);
        Assert.Equal("Admin", login.User.Role);
    }

    [Fact]
    public async Task Login_WithWrongPassword_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = TestUsers.Admin.Email,
            password = "definitely-wrong-password"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var error = await response.ReadErrorAsync();
        Assert.Equal("Invalid email or password.", error.Message);
    }

    [Fact]
    public async Task Me_WithoutToken_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithValidToken_ReturnsCurrentUser()
    {
        var client = await _factory.CreateClientForAsync(TestUsers.Receptionist);

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var user = await response.ReadDataAsync<AuthUserDto>();
        Assert.Equal(TestUsers.Receptionist.Email, user.Email);
        Assert.Equal("Receptionist", user.Role);
    }
}
