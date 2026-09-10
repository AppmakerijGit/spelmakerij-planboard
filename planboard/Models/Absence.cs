using System.Text.Json.Serialization;

namespace planboard.Models;

public class Absence
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Date { get; set; } = "";
    public string Type { get; set; } = "ziek"; // "ziek" | "vakantie" | "anders"

    [JsonPropertyName("fromDate")]
    public string? FromDate { get; set; }

    [JsonPropertyName("toDate")]
    public string? ToDate { get; set; }

    public string? Reason { get; set; }
}
