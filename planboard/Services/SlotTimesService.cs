using System.Net.Http.Json;
using planboard.Models;

namespace planboard.Services;

public class SlotTimesService
{
    private readonly HttpClient _http;

    public SlotTimesService(HttpClient http) => _http = http;

    public async Task<List<SlotTime>> GetSlotTimes()
    {
        var result = await _http.GetFromJsonOrDefaultOnUnauthorizedAsync<List<SlotTime>>("slot-times");
        return result ?? [];
    }

    public async Task SaveSlotTimes(List<SlotTime> slots)
    {
        var response = await _http.PutAsJsonAsync("slot-times", slots);
        response.EnsureSuccessStatusCode();
    }
}
