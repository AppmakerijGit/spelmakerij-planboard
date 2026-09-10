namespace planboard.Models;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Role { get; set; } = "";
    public string Initials { get; set; } = "";
    public bool EditorEnabled { get; set; } = false;
}
