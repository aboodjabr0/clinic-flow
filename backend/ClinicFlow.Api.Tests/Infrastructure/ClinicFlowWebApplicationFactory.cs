using ClinicFlow.Api.Data;
using ClinicFlow.Api.Entities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace ClinicFlow.Api.Tests.Infrastructure;

/// <summary>
/// Boots the real API against a throwaway PostgreSQL Testcontainer:
/// - environment is "Testing", so the Development demo seeding in Program.cs
///   never runs and the dev JWT fallback key is never used;
/// - the connection string points at the container (no local DB, no real
///   credentials, no environment secrets);
/// - EF Core migrations are applied and minimal test users are seeded once
///   per factory instance.
/// Shared by all test classes through <see cref="ApiTestCollection"/> so the
/// container starts once per test run.
/// </summary>
public sealed class ClinicFlowWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("clinicflow_tests")
        .WithUsername("clinicflow_tests")
        .WithPassword("clinicflow-tests-container-only")
        .Build();

    /// <summary>DoctorProfile linked to the seeded Doctor login.</summary>
    public Guid SeededDoctorProfileId { get; private set; }

    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();

        // Accessing Services builds the host (ConfigureWebHost runs here,
        // after the container is up, so the connection string is known).
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync();

        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
        SeededDoctorProfileId = await TestDataSeeder.SeedAsync(dbContext, passwordHasher);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:DefaultConnection", _dbContainer.GetConnectionString());
        builder.UseSetting("Jwt:Key", TestUsers.TestJwtSigningKey);
    }

    /// <summary>Runs a short action against the test database directly.</summary>
    public async Task<T> QueryDbAsync<T>(Func<AppDbContext, Task<T>> query)
    {
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await query(dbContext);
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await _dbContainer.DisposeAsync();
    }
}
