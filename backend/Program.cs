using System.IdentityModel.Tokens.Jwt;
using System.Text;
using ClinicFlow.Api.Common;
using ClinicFlow.Api.Data;
using ClinicFlow.Api.Entities;
using ClinicFlow.Api.Middleware;
using ClinicFlow.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCorsPolicy";

var frontendUrl = builder.Configuration["Frontend:Url"] ?? "http://localhost:5173";
var connectionString = ResolveConnectionString(builder.Configuration);
var jwtSigningKey = JwtKeyResolver.Resolve(builder.Configuration, builder.Environment);

var corsAllowedOriginsSetting = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS");
var corsAllowedOrigins = string.IsNullOrWhiteSpace(corsAllowedOriginsSetting)
    ? new[] { frontendUrl }
    : corsAllowedOriginsSetting.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var message = context.ModelState
                .SelectMany(entry => entry.Value?.Errors ?? [])
                .Select(error => error.ErrorMessage)
                .FirstOrDefault() ?? "Invalid request.";

            return new BadRequestObjectResult(new ErrorResponse
            {
                Message = message,
                TraceId = context.HttpContext.TraceIdentifier
            });
        };
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ClinicFlow API",
        Version = "v1",
        Description = "Backend API for ClinicFlow — dental clinic management system (Phase 2: authentication & roles)."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter a JWT token. Example: eyJhbGciOi..."
    });

    options.AddSecurityRequirement(_ => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", null, "Bearer"),
            new List<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins(corsAllowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("Jwt"));
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();

builder.Services.AddHttpContextAccessor();

builder.Services.AddSingleton<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IDoctorService, DoctorService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IDentalServiceCatalogService, DentalServiceCatalogService>();
builder.Services.AddScoped<IClinicSettingsService, ClinicSettingsService>();
builder.Services.AddScoped<IPatientService, PatientService>();
builder.Services.AddScoped<IPatientMedicalHistoryService, PatientMedicalHistoryService>();
builder.Services.AddScoped<IAppointmentService, AppointmentService>();
builder.Services.AddScoped<IVisitService, VisitService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IReportService, ReportService>();

JwtSecurityTokenHandler.DefaultMapInboundClaims = false;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtSettings.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole(nameof(UserRole.Admin)));
    options.AddPolicy("DoctorOnly", policy => policy.RequireRole(nameof(UserRole.Doctor)));
    options.AddPolicy("ReceptionistOnly", policy => policy.RequireRole(nameof(UserRole.Receptionist)));
    options.AddPolicy("StaffOnly", policy => policy.RequireRole(
        nameof(UserRole.Admin), nameof(UserRole.Doctor), nameof(UserRole.Receptionist)));
    options.AddPolicy("AdminOrReceptionist", policy => policy.RequireRole(
        nameof(UserRole.Admin), nameof(UserRole.Receptionist)));
    options.AddPolicy("AdminOrDoctor", policy => policy.RequireRole(
        nameof(UserRole.Admin), nameof(UserRole.Doctor)));
});

var app = builder.Build();

app.UseMiddleware<ErrorHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "ClinicFlow API v1");
});

var applyMigrationsOnStartup = Environment.GetEnvironmentVariable("APPLY_MIGRATIONS_ON_STARTUP") == "true";
var enableDemoSeeding = app.Environment.IsDevelopment()
    || Environment.GetEnvironmentVariable("ENABLE_DEMO_SEEDING") == "true";

if (applyMigrationsOnStartup || enableDemoSeeding)
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    if (applyMigrationsOnStartup)
    {
        await dbContext.Database.MigrateAsync();
    }

    if (enableDemoSeeding)
    {
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
        await DbSeeder.SeedDevelopmentAdminAsync(dbContext, passwordHasher);
        await DbSeeder.SeedDentalClinicCoreSetupAsync(dbContext, passwordHasher);
        await DbSeeder.SeedDemoPatientsAsync(dbContext);
        await DbSeeder.SeedDemoAppointmentsAsync(dbContext);
        await DbSeeder.SeedDemoVisitsAsync(dbContext);
        await DbSeeder.SeedDemoInvoicesAsync(dbContext);
    }
}

app.UseCors(FrontendCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

/// <summary>
/// Resolves the Postgres connection string, preferring a full connection
/// string from ConnectionStrings__DefaultConnection, then individual
/// environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD),
/// then ConnectionStrings:Default from appsettings.
/// </summary>
static string ResolveConnectionString(IConfiguration configuration)
{
    var directConnectionString = configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrWhiteSpace(directConnectionString))
    {
        return directConnectionString;
    }

    var host = Environment.GetEnvironmentVariable("DB_HOST");
    var port = Environment.GetEnvironmentVariable("DB_PORT");
    var name = Environment.GetEnvironmentVariable("DB_NAME");
    var user = Environment.GetEnvironmentVariable("DB_USER");
    var password = Environment.GetEnvironmentVariable("DB_PASSWORD");

    if (!string.IsNullOrWhiteSpace(host) && !string.IsNullOrWhiteSpace(name) && !string.IsNullOrWhiteSpace(user))
    {
        return $"Host={host};Port={port ?? "5432"};Database={name};Username={user};Password={password}";
    }

    return configuration.GetConnectionString("Default")
        ?? throw new InvalidOperationException(
            "No database connection configured. Set DB_HOST/DB_NAME/DB_USER/DB_PASSWORD environment variables, or ConnectionStrings:Default in appsettings.");
}

/// <summary>
/// Makes the implicit Program class visible to WebApplicationFactory&lt;Program&gt;
/// in the integration test project. No runtime behavior change.
/// </summary>
public partial class Program;
