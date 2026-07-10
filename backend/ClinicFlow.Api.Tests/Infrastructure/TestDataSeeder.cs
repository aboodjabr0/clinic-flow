using ClinicFlow.Api.Data;
using ClinicFlow.Api.Entities;
using Microsoft.AspNetCore.Identity;

namespace ClinicFlow.Api.Tests.Infrastructure;

/// <summary>
/// Seeds the minimal fixed data every test relies on: one login per role and
/// a DoctorProfile linked to the Doctor login (so doctor-ownership rules can
/// be exercised). Everything else is created per-test through the API via
/// <see cref="Helpers.TestData"/>.
/// </summary>
public static class TestDataSeeder
{
    public static async Task<Guid> SeedAsync(AppDbContext dbContext, IPasswordHasher<AppUser> passwordHasher)
    {
        var adminUser = BuildUser(TestUsers.Admin, passwordHasher);
        var doctorUser = BuildUser(TestUsers.Doctor, passwordHasher);
        var receptionistUser = BuildUser(TestUsers.Receptionist, passwordHasher);

        var doctorProfile = new DoctorProfile
        {
            Id = Guid.NewGuid(),
            AppUserId = doctorUser.Id,
            FullName = TestUsers.Doctor.FullName,
            Email = TestUsers.Doctor.Email,
            Specialty = "General Dentistry",
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        dbContext.AppUsers.AddRange(adminUser, doctorUser, receptionistUser);
        dbContext.DoctorProfiles.Add(doctorProfile);
        await dbContext.SaveChangesAsync();

        return doctorProfile.Id;
    }

    private static AppUser BuildUser(TestUser user, IPasswordHasher<AppUser> passwordHasher)
    {
        var appUser = new AppUser
        {
            Id = Guid.NewGuid(),
            FullName = user.FullName,
            Email = user.Email,
            PasswordHash = string.Empty,
            Role = user.Role,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        appUser.PasswordHash = passwordHasher.HashPassword(appUser, user.Password);
        return appUser;
    }
}
