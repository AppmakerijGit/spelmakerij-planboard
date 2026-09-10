namespace planboard.Models;

public class DayPlan
{
    public string Date { get; set; } = "";
    public List<List<SlotCard>> Slots { get; set; } = [];
    public DateTime? PublishedAt { get; set; }
    public DateTime? VisibleFrom { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
