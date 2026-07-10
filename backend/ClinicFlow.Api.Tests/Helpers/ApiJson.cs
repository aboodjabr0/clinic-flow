using System.Net.Http.Json;
using System.Text.Json;
using ClinicFlow.Api.Common;

namespace ClinicFlow.Api.Tests.Helpers;

/// <summary>
/// Reads API response envelopes using the same web JSON defaults
/// (camelCase) the API serializes with.
/// </summary>
public static class ApiJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static async Task<ApiResponse<T>> ReadApiResponseAsync<T>(this HttpResponseMessage response)
    {
        var envelope = await response.Content.ReadFromJsonAsync<ApiResponse<T>>(Options);
        Assert.NotNull(envelope);
        return envelope;
    }

    public static async Task<T> ReadDataAsync<T>(this HttpResponseMessage response)
    {
        var envelope = await response.ReadApiResponseAsync<T>();
        Assert.True(envelope.Success);
        Assert.NotNull(envelope.Data);
        return envelope.Data;
    }

    public static async Task<ErrorResponse> ReadErrorAsync(this HttpResponseMessage response)
    {
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>(Options);
        Assert.NotNull(error);
        Assert.False(error.Success);
        return error;
    }
}
