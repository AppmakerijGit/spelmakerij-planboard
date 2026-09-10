using System.Net;
using System.Net.Http.Json;

namespace planboard.Services;

internal static class HttpClientJsonExtensions
{
    public static async Task<T?> GetFromJsonOrDefaultOnUnauthorizedAsync<T>(this HttpClient http, string requestUri)
    {
        using var response = await http.GetAsync(requestUri);
        if (response.StatusCode == HttpStatusCode.Unauthorized)
            return default;

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<T>();
    }
}
