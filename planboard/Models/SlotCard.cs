namespace planboard.Models;

public class SlotCard
{
    public string Title { get; set; } = "";
    public string Location { get; set; } = "";
    public List<string> Clients { get; set; } = [];
    public List<Supervisor> Supers { get; set; } = [];
}
