using System.Net.Http.Json;
using System.Text.Json;
using planboard.Models;

namespace planboard.Services;

public class CardService
{
    private readonly HttpClient _http;

    public CardService(HttpClient http) => _http = http;

    public async Task<DayPlan> GetDayPlan(string date)
    {
        var response = await _http.GetFromJsonOrDefaultOnUnauthorizedAsync<DayPlanResponse>($"cards/{date}");
        return response is null
            ? new DayPlan { Date = date, Slots = EmptySlots() }
            : new DayPlan
            {
                Date = response.Date,
                Slots = ReadSlots(response.Slots),
                PublishedAt = response.PublishedAt,
                VisibleFrom = response.VisibleFrom,
                UpdatedAt = response.UpdatedAt
            };
    }

    private static readonly JsonSerializerOptions _webOptions = new(JsonSerializerDefaults.Web);

    private static List<List<SlotCard>> ReadSlots(JsonElement slots)
    {
        if (slots.ValueKind == JsonValueKind.String)
        {
            var json = slots.GetString();
            if (!string.IsNullOrWhiteSpace(json))
                return JsonSerializer.Deserialize<List<List<SlotCard>>>(json, _webOptions) ?? EmptySlots();
        }

        if (slots.ValueKind == JsonValueKind.Array)
            return slots.Deserialize<List<List<SlotCard>>>(_webOptions) ?? EmptySlots();

        return EmptySlots();
    }

    private static List<List<SlotCard>> EmptySlots() =>
        Enumerable.Range(0, 4).Select(_ => new List<SlotCard>()).ToList();

    private class DayPlanResponse
    {
        public string Date { get; set; } = "";
        public JsonElement Slots { get; set; }
        public DateTime? PublishedAt { get; set; }
        public DateTime? VisibleFrom { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public async Task<List<List<SlotCard>>> GetCards(string date)
    {
        var response = await GetDayPlan(date);
        return response.Slots ?? EmptySlots();
    }

    public async Task<DateTime?> SaveCards(string date, List<List<SlotCard>> slots, DateTime? updatedAt = null)
    {
        var response = await _http.PutAsJsonAsync($"cards/{date}", new { slots, updatedAt });
        if (response.StatusCode == System.Net.HttpStatusCode.Conflict)
            throw new PlanningConflictException();
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<SaveCardsResponse>();
        return result?.UpdatedAt;
    }

    private class SaveCardsResponse
    {
        public DateTime? UpdatedAt { get; set; }
    }

    public async Task<List<PublishedDay>> GetPublishedDays(string from, string to) =>
        await _http.GetFromJsonOrDefaultOnUnauthorizedAsync<List<PublishedDay>>($"cards/published-days?from={from}&to={to}") ?? [];

    public async Task<List<DayStatus>> GetDayStatuses(string from, string to) =>
        await _http.GetFromJsonOrDefaultOnUnauthorizedAsync<List<DayStatus>>($"cards/statuses?from={from}&to={to}") ?? [];

    public async Task PublishCards(string date, DateTime? visibleFrom)
    {
        var response = await _http.PostAsJsonAsync($"cards/{date}/publish", new { visibleFrom });
        response.EnsureSuccessStatusCode();
    }

    public async Task<List<RecentGameEntry>> GetRecentGames(string from, string to) =>
        await _http.GetFromJsonOrDefaultOnUnauthorizedAsync<List<RecentGameEntry>>(
            $"cards/recent-games?from={from}&to={to}") ?? [];
}
