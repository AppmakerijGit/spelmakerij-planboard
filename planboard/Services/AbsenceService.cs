using System.Net.Http.Json;
using planboard.Models;

namespace planboard.Services;

public class AbsenceService
{
    private readonly HttpClient _http;

    public event Action? OnAbsenceChanged;

    public AbsenceService(HttpClient http) => _http = http;

    public async Task<List<Absence>> GetAbsences(string? date = null)
    {
        var url = date is null ? "absences" : $"absences?date={date}";
        var response = await _http.GetFromJsonOrDefaultOnUnauthorizedAsync<AbsenceListResponse>(url);
        return response?.Absences ?? [];
    }

    public async Task<Absence> ReportAbsence(Absence absence)
    {
        var response = await _http.PostAsJsonAsync("absences", absence);
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<AbsenceResponse>();
        OnAbsenceChanged?.Invoke();
        return result!.Absence;
    }

    public async Task DeleteAbsence(int id)
    {
        var response = await _http.DeleteAsync($"absences/{id}");
        response.EnsureSuccessStatusCode();
        OnAbsenceChanged?.Invoke();
    }

    private record AbsenceListResponse(List<Absence> Absences);
    private record AbsenceResponse(Absence Absence);
}
