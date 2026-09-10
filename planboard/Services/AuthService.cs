using System.Net.Http.Json;
using Microsoft.AspNetCore.Components.WebAssembly.Http;
using planboard.Auth;
using planboard.Models;

namespace planboard.Services;

public class AuthService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly JwtAuthStateProvider _authState;

    public AuthService(IHttpClientFactory httpClientFactory, JwtAuthStateProvider authState)
    {
        _httpClientFactory = httpClientFactory;
        _authState = authState;
    }

    public virtual User? CurrentUser => _authState.CurrentUser;

    public event Action? UserStateChanged;
    public void NotifyUserStateChanged() => UserStateChanged?.Invoke();

    public virtual async Task<bool> Login(string username, string password, bool rememberMe = false)
    {
        var client = _httpClientFactory.CreateClient("Auth");
        var request = new HttpRequestMessage(HttpMethod.Post, "auth/login");
        request.SetBrowserRequestCredentials(BrowserRequestCredentials.Include);
        request.Content = JsonContent.Create(new { username, password, rememberMe });

        var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode) return false;

        var result = await response.Content.ReadFromJsonAsync<LoginResponse>();
        if (result is null) return false;

        _authState.SetToken(result.Token, result.User);
        return true;
    }

    public async Task Logout()
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Auth");
            var request = new HttpRequestMessage(HttpMethod.Post, "auth/logout");
            request.SetBrowserRequestCredentials(BrowserRequestCredentials.Include);
            await client.SendAsync(request);
        }
        catch { }
        _authState.ClearToken();
    }

    private record LoginResponse(string Token, User User);
}
