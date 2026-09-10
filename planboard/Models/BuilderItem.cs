namespace planboard.Models;

public class BuilderItem
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = ""; // "deelnemer"|"sup-blue"|"sup-green"|"location"|"game"
}
