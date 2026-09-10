namespace planboard.Models;

public class BuilderData
{
    public List<BuilderItem> Clienten { get; set; } = [];
    public List<BuilderItem> Begeleiders { get; set; } = [];
    public List<BuilderItem> Locaties { get; set; } = [];
    public List<BuilderItem> Spellen { get; set; } = [];
}
