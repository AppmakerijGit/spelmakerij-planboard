using System.Text.Json.Serialization;

namespace planboard.Models;

public class Supervisor
{
    [JsonPropertyName("n")]
    public string Name { get; set; } = "";

    [JsonPropertyName("t")]
    public string Type { get; set; } = "sup-blue"; // "sup-blue" | "sup-green"
}
