using System.Globalization;
using planboard.Models;

namespace planboard.Services;

public static class AbsenceWeekFilter
{
    public static List<Absence> FilterForWeek(IEnumerable<Absence> absences, DateOnly weekStart, DateOnly weekEnd)
    {
        return absences
            .Where(a => Overlaps(a, weekStart, weekEnd))
            .OrderBy(a => ParseDate(a.FromDate ?? a.Date))
            .ToList();
    }

    private static bool Overlaps(Absence absence, DateOnly weekStart, DateOnly weekEnd)
    {
        var from = ParseDate(absence.FromDate ?? absence.Date);
        var to = ParseDate(absence.ToDate ?? absence.Date);
        return from <= weekEnd && to >= weekStart;
    }

    public static DateOnly ParseDate(string date) =>
        DateOnly.Parse(date.Split('T')[0], CultureInfo.InvariantCulture);

    // Rows for the "Afmeldingen" section of the week export: { Naam, Type, Van, Tot }.
    public static List<string[]> BuildExportRows(IEnumerable<Absence> absences, DateOnly weekStart, DateOnly weekEnd)
    {
        return FilterForWeek(absences, weekStart, weekEnd)
            .Select(a => new[]
            {
                a.Name,
                a.Type,
                ParseDate(a.FromDate ?? a.Date).ToString("yyyy-MM-dd"),
                ParseDate(a.ToDate ?? a.Date).ToString("yyyy-MM-dd")
            })
            .ToList();
    }
}
