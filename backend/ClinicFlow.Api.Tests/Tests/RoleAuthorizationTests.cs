using ClinicFlow.Api.Tests.Helpers;
using ClinicFlow.Api.Tests.Infrastructure;

namespace ClinicFlow.Api.Tests.Tests;

[Collection(ApiTestCollection.Name)]
public class RoleAuthorizationTests
{
    private readonly ClinicFlowWebApplicationFactory _factory;

    public RoleAuthorizationTests(ClinicFlowWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ProtectedEndpoint_AsAnonymous_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/patients");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task AdminOnlyEndpoint_AsDoctor_Returns403()
    {
        var client = await _factory.CreateClientForAsync(TestUsers.Doctor);

        var response = await client.GetAsync("/api/auth/admin-test");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminOnlyEndpoint_AsAdmin_Returns200()
    {
        var client = await _factory.CreateClientForAsync(TestUsers.Admin);

        var response = await client.GetAsync("/api/auth/admin-test");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task AuditLogs_AsDoctor_Returns403()
    {
        var client = await _factory.CreateClientForAsync(TestUsers.Doctor);

        var response = await client.GetAsync("/api/audit-logs");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AuditLogs_AsAdmin_Returns200()
    {
        var client = await _factory.CreateClientForAsync(TestUsers.Admin);

        var response = await client.GetAsync("/api/audit-logs");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
