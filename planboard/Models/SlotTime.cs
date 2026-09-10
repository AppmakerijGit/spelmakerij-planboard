namespace planboard.Models;

public class SlotTime
{
    public int Id { get; set; }
    public int SortOrder { get; set; }
    public string TimeRange { get; set; } = "";
    public string PeriodLabel { get; set; } = "";
}
