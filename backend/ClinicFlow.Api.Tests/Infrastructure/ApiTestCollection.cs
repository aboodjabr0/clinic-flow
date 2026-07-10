namespace ClinicFlow.Api.Tests.Infrastructure;

/// <summary>
/// Single xUnit collection so every test class shares one factory (one
/// PostgreSQL container, one host) and classes never run in parallel against
/// the same database.
/// </summary>
[CollectionDefinition(Name)]
public class ApiTestCollection : ICollectionFixture<ClinicFlowWebApplicationFactory>
{
    public const string Name = "ClinicFlow API";
}
