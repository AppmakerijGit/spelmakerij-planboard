using System.Text.Json.Serialization;

namespace planboard.Models;

public class Account
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Username { get; set; } = "";
    public string Role { get; set; } = "deelnemer"; // "deelnemer" | "admin" | "vrijwilliger"
    public string Initials { get; set; } = "";
    public string? Email { get; set; }
    public string? Password { get; set; }
    public bool Active { get; set; } = true;
    public bool EditorEnabled { get; set; } = false;
    public List<int> ExclusiveWith { get; set; } = [];
    public List<int> LocationRestrictions { get; set; } = [];

    [JsonIgnore]
    public string Type => Role switch
    {
        "vrijwilliger" => "sup-green",
        _ => "sup-blue"
    };
    public Dictionary<string, bool> Availability { get; set; } = new()
    {
        ["monday"] = true,
        ["tuesday"] = true,
        ["wednesday"] = true,
        ["thursday"] = true,
        ["friday"] = true
    };

    [JsonPropertyName("slot_availability")]
    public Dictionary<string, bool[]>? SlotAvailability { get; set; }
}
