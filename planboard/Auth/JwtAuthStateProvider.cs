using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Components.WebAssembly.Http;
using planboard.Models;

namespace planboard.Auth;

public class JwtAuthStateProvider : AuthenticationStateProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private string? _accessToken;
    private Task<bool>? _pendingRefresh;
    private readonly object _refreshLock = new();

    public User? CurrentUser { get; private set; }

    public JwtAuthStateProvider(IHttpClientFactory httpClientFactory)
        => _httpClientFactory = httpClientFactory;

    public override async Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        if (_accessToken is null && !await TryRefreshAsync())
            return Unauthenticated();

        try
        {
            var claims = ParseClaimsFromJwt(_accessToken!).ToList();
            var expClaim = claims.FirstOrDefault(c => c.Type == "exp")?.Value;
            if (expClaim is not null && long.TryParse(expClaim, out var exp) &&
                DateTimeOffset.FromUnixTimeSeconds(exp) <= DateTimeOffset.UtcNow)
            {
                _accessToken = null;
                if (!await TryRefreshAsync()) return Unauthenticated();
                claims = ParseClaimsFromJwt(_accessToken!).ToList();
            }

            var identity = new ClaimsIdentity(claims, "jwt");
            CurrentUser = BuildUser(identity);
            return new AuthenticationState(new ClaimsPrincipal(identity));
        }
        catch
        {
            return Unauthenticated();
        }
    }

    public Task<bool> TryRefreshAsync()
    {
        lock (_refreshLock)
        {
            _pendingRefresh ??= DoRefreshAsync();
            return _pendingRefresh;
        }
    }

    private async Task<bool> DoRefreshAsync()
    {
        var tokenBeforeRefresh = _accessToken;
        try
        {
            var client = _httpClientFactory.CreateClient("Auth");
            var request = new HttpRequestMessage(HttpMethod.Post, "auth/refresh");
            request.SetBrowserRequestCredentials(BrowserRequestCredentials.Include);
            var response = await client.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                // Don't wipe a token that login wrote while this refresh was in-flight
                if (_accessToken == tokenBeforeRefresh)
                    ClearToken();
                return false;
            }
            var result = await response.Content.ReadFromJsonAsync<TokenResult>();
            if (result is null)
            {
                if (_accessToken == tokenBeforeRefresh)
                    ClearToken();
                return false;
            }
            SetToken(result.Token, result.User);
            return true;
        }
        catch
        {
            if (_accessToken == tokenBeforeRefresh)
                ClearToken();
            return false;
        }
        finally
        {
            lock (_refreshLock) { _pendingRefresh = null; }
        }
    }

    public void SetToken(string token, User user)
    {
        _accessToken = token;
        CurrentUser = user;
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }

    public void ClearToken()
    {
        _accessToken = null;
        CurrentUser = null;
        NotifyAuthenticationStateChanged(Task.FromResult(Unauthenticated()));
    }

    public string? GetToken() => _accessToken;

    private static User BuildUser(ClaimsIdentity identity) => new()
    {
        Id = int.TryParse(identity.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : 0,
        Name = identity.FindFirst(ClaimTypes.Name)?.Value ?? "",
        Role = identity.FindFirst(ClaimTypes.Role)?.Value ?? "",
        Initials = identity.FindFirst("initials")?.Value ?? "",
        EditorEnabled = identity.FindFirst("editor_enabled")?.Value == "True",
    };

    private static AuthenticationState Unauthenticated() =>
        new(new ClaimsPrincipal(new ClaimsIdentity()));

    private static IEnumerable<Claim> ParseClaimsFromJwt(string jwt)
    {
        var payload = jwt.Split('.')[1];
        var padded = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=');
        var jsonBytes = Convert.FromBase64String(padded.Replace('-', '+').Replace('_', '/'));
        var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(jsonBytes) ?? [];

        foreach (var kvp in dict)
        {
            var type = kvp.Key switch
            {
                "sub"  => ClaimTypes.NameIdentifier,
                "name" => ClaimTypes.Name,
                "role" => ClaimTypes.Role,
                _      => kvp.Key,
            };
            yield return new Claim(type, kvp.Value.ToString() ?? "");
        }
    }

    private record TokenResult(string Token, User User);
}
