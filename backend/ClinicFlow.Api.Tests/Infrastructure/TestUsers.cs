using ClinicFlow.Api.Entities;

namespace ClinicFlow.Api.Tests.Infrastructure;

/// <summary>
/// Test-only login accounts seeded into the throwaway Testcontainers
/// database. None of these values are real secrets — they never exist
/// outside a disposable test container.
/// </summary>
public static class TestUsers
{
    /// <summary>
    /// Test-only JWT signing key (HS256 needs at least 32 bytes). Injected
    /// via configuration by the test factory; never used outside tests.
    /// </summary>
    public const string TestJwtSigningKey =
        "clinicflow-tests-only-jwt-signing-key-not-a-real-secret-0123456789";

    public static readonly TestUser Admin =
        new("Test Admin", "admin.tests@clinicflow.test", "Admin-Tests-Pass-1!", UserRole.Admin);

    public static readonly TestUser Doctor =
        new("Dr. Test Doctor", "doctor.tests@clinicflow.test", "Doctor-Tests-Pass-1!", UserRole.Doctor);

    public static readonly TestUser Receptionist =
        new("Test Receptionist", "receptionist.tests@clinicflow.test", "Reception-Tests-Pass-1!", UserRole.Receptionist);
}

public sealed record TestUser(string FullName, string Email, string Password, UserRole Role);
