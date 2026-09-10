using System.Net.Http.Json;
using planboard.Models;

namespace planboard.Services;

public class AccountService
{
    private readonly HttpClient _http;

    public AccountService(HttpClient http) => _http = http;

    public async Task<List<Account>> GetAccounts()
    {
        var response = await _http.GetFromJsonOrDefaultOnUnauthorizedAsync<AccountListResponse>("accounts");
        return response?.Accounts ?? [];
    }

    public async Task<Account> CreateAccount(Account account)
    {
        var response = await _http.PostAsJsonAsync("accounts", account);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<AccountResponse>();
        return result!.Account;
    }

    public async Task UpdateAccount(Account account)
    {
        var response = await _http.PutAsJsonAsync($"accounts/{account.Id}", account);
        response.EnsureSuccessStatusCode();
    }

    public async Task UpdateEditorEnabled(int accountId, bool enabled)
    {
        var response = await _http.PutAsJsonAsync($"accounts/{accountId}/editor", new { enabled });
        response.EnsureSuccessStatusCode();
    }

    public async Task DeleteAccount(int id)
    {
        var response = await _http.DeleteAsync($"accounts/{id}");
        response.EnsureSuccessStatusCode();
    }

    public async Task AddExclusivity(int accountId, int partnerId)
    {
        var response = await _http.PostAsJsonAsync($"accounts/{accountId}/exclusivities", new { partnerId });
        response.EnsureSuccessStatusCode();
    }

    public async Task RemoveExclusivity(int accountId, int partnerId)
    {
        var response = await _http.DeleteAsync($"accounts/{accountId}/exclusivities/{partnerId}");
        response.EnsureSuccessStatusCode();
    }

    public async Task AddLocationRestriction(int accountId, int locationId)
    {
        var response = await _http.PostAsJsonAsync($"accounts/{accountId}/location-restrictions/{locationId}", new { });
        response.EnsureSuccessStatusCode();
    }

    public async Task RemoveLocationRestriction(int accountId, int locationId)
    {
        var response = await _http.DeleteAsync($"accounts/{accountId}/location-restrictions/{locationId}");
        response.EnsureSuccessStatusCode();
    }

    public async Task SaveAvailability(int accountId, Dictionary<string, bool> availability, Dictionary<string, bool[]> slotAvailability)
    {
        var response = await _http.PutAsJsonAsync($"accounts/{accountId}/availability", new
        {
            monday = availability.GetValueOrDefault("monday", true),
            tuesday = availability.GetValueOrDefault("tuesday", true),
            wednesday = availability.GetValueOrDefault("wednesday", true),
            thursday = availability.GetValueOrDefault("thursday", true),
            friday = availability.GetValueOrDefault("friday", true),
            slot_availability = slotAvailability,
        });
        response.EnsureSuccessStatusCode();
    }

    private record AccountListResponse(List<Account> Accounts);
    private record AccountResponse(Account Account);
}
