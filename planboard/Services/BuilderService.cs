using System.Net.Http.Json;
using planboard.Models;

namespace planboard.Services;

public class BuilderService
{
    private readonly HttpClient _http;
    private BuilderData? _cache;

    public BuilderService(HttpClient http) => _http = http;

    public async Task<BuilderData> GetBuilderData()
    {
        if (_cache is not null) return _cache;
        _cache = await _http.GetFromJsonOrDefaultOnUnauthorizedAsync<BuilderData>("builder-data") ?? new BuilderData();
        return _cache;
    }

    public async Task<BuilderItem> AddItem(string category, string name)
    {
        var response = await _http.PostAsJsonAsync($"builder-data/{category}", new { name });
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<BuilderItemResponse>();
        _cache = null;
        return result!.Item;
    }

    public async Task DeleteItem(string category, int id)
    {
        var response = await _http.DeleteAsync($"builder-data/{category}/{id}");
        response.EnsureSuccessStatusCode();
        _cache = null;
    }

    public async Task ReorderItems(string category, IReadOnlyList<int> ids)
    {
        var response = await _http.PutAsJsonAsync($"builder-data/{category}/order", new { ids });
        response.EnsureSuccessStatusCode();
        _cache = null;
    }

    private record BuilderItemResponse(BuilderItem Item);
}
