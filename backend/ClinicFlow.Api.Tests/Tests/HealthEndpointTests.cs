using ClinicFlow.Api.DTOs;
using ClinicFlow.Api.Tests.Helpers;
using ClinicFlow.Api.Tests.Infrastructure;

namespace ClinicFlow.Api.Tests.Tests;

[Collection(ApiTestCollection.Name)]
public class HealthEndpointTests
{
    private readonly ClinicFlowWebApplicationFactory _factory;

    public HealthEndpointTests(ClinicFlowWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Get_ReturnsOk_WithHealthyStatus()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var envelope = await response.ReadApiResponseAsync<HealthResponseDto>();
        Assert.True(envelope.Success);
        Assert.Equal("Healthy", envelope.Data!.Status);
    }

    [Fact]
    public async Task Get_ReportsAppNameAndTestingEnvironment()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        var health = await response.ReadDataAsync<HealthResponseDto>();
        Assert.Equal("ClinicFlow.Api", health.AppName);
        Assert.Equal("Testing", health.Environment);
    }
}
