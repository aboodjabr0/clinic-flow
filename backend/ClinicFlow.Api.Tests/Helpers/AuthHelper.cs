using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ClinicFlow.Api.DTOs.Auth;
using ClinicFlow.Api.Tests.Infrastructure;

namespace ClinicFlow.Api.Tests.Helpers;

public static class AuthHelper
{
    private static readonly ConcurrentDictionary<string, string> TokenCache = new();

    /// <summary>Creates an HttpClient authenticated as the given test user.</summary>
    public static async Task<HttpClient> CreateClientForAsync(
        this ClinicFlowWebApplicationFactory factory, TestUser user)
    {
        var client = factory.CreateClient();
        var token = await GetTokenAsync(client, user.Email, user.Password);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    /// <summary>
    /// Logs in through /api/auth/login and returns the JWT. Tokens are cached
    /// per email for the test run to keep the suite fast.
    /// </summary>
    public static async Task<string> GetTokenAsync(HttpClient client, string email, string password)
    {
        if (TokenCache.TryGetValue(email, out var cached))
        {
            return cached;
        }

        var token = await LoginAsync(client, email, password);
        TokenCache[email] = token;
        return token;
    }

    /// <summary>Uncached login for tests that assert on the login itself.</summary>
    public static async Task<string> LoginAsync(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();

        var login = await response.ReadDataAsync<LoginResponseDto>();
        return login.Token;
    }
}
