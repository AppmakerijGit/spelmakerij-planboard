using planboard.Models;

namespace planboard.Services;

public record TagDrag(string Type, string SourceLocation, int SlotIdx, string Value);
public record CardDrag(string SourceLocation, int SourceSlotIdx, int CardIdx);
public record PanelDrag(string Type, string Value);
// Type is one of: "game" | "client" | "supervisor"
// Value is the card.Title, client name, or supervisor name being dragged

/// <summary>
/// Defines what makes a SlotCard valid. Add new rules here to extend drag validation.
/// Each method returns true if the proposed change is allowed.
/// </summary>
public static class CardConstraints
{
    public static bool CanRemoveClient(SlotCard card) => card.Clients.Count > 1;
    public static bool CanRemoveSupervisor(SlotCard card) => card.Supers.Count > 1;
}

public static class CalendarDragHelper
{
    /// <summary>
    /// Applies a tag drop to the slot grid. Returns true if the drop was applied,
    /// false if it was invalid (no card, duplicate, same location, empty field, etc.).
    /// Does NOT save — the caller is responsible for persisting and revalidating.
    /// </summary>
    public static bool TryDropTag(
        List<List<SlotCard>> slots,
        TagDrag drag,
        string targetLocation)
    {
        if (drag.SlotIdx < 0 || drag.SlotIdx >= slots.Count)
            return false;

        if (string.Equals(drag.SourceLocation, targetLocation, StringComparison.OrdinalIgnoreCase))
            return false;

        var slot = slots[drag.SlotIdx];

        var sourceCard = slot.FirstOrDefault(c =>
            string.Equals(c.Location, drag.SourceLocation, StringComparison.OrdinalIgnoreCase));
        var destCard = slot.FirstOrDefault(c =>
            string.Equals(c.Location, targetLocation, StringComparison.OrdinalIgnoreCase));

        if (sourceCard is null || destCard is null)
            return false;

        return drag.Type switch
        {
            "client" => MoveClient(sourceCard, destCard, drag.Value),
            "supervisor" => MoveSupervisor(sourceCard, destCard, drag.Value),
            "game" => SwapGame(sourceCard, destCard),
            _ => false
        };
    }

    private static bool MoveClient(SlotCard source, SlotCard dest, string name)
    {
        if (!CardConstraints.CanRemoveClient(source)) return false;

        if (dest.Clients.Any(c => string.Equals(c, name, StringComparison.OrdinalIgnoreCase)))
            return false; // duplicate guard

        var idx = source.Clients.FindIndex(c => string.Equals(c, name, StringComparison.OrdinalIgnoreCase));
        if (idx < 0) return false;

        source.Clients.RemoveAt(idx);
        dest.Clients.Add(name);
        return true;
    }

    private static bool MoveSupervisor(SlotCard source, SlotCard dest, string name)
    {
        if (!CardConstraints.CanRemoveSupervisor(source)) return false;

        if (dest.Supers.Any(s => string.Equals(s.Name, name, StringComparison.OrdinalIgnoreCase)))
            return false; // duplicate guard

        var sup = source.Supers.FirstOrDefault(s =>
            string.Equals(s.Name, name, StringComparison.OrdinalIgnoreCase));
        if (sup is null) return false;

        source.Supers.Remove(sup);
        dest.Supers.Add(sup);
        return true;
    }

    private static bool SwapGame(SlotCard source, SlotCard dest)
    {
        (source.Title, dest.Title) = (dest.Title, source.Title);
        return true;
    }

    /// <summary>
    /// Moves a supervisor from source to dest, or swaps when source has only one supervisor.
    /// Unlike MoveSupervisor, this never blocks on single-supervisor source cards.
    /// </summary>
    public static bool TryMoveSupervisorWithSwap(
        List<List<SlotCard>> slots,
        TagDrag drag,
        int targetSlotIdx,
        string targetLocation)
    {
        if (drag.SlotIdx < 0 || drag.SlotIdx >= slots.Count) return false;
        if (targetSlotIdx < 0 || targetSlotIdx >= slots.Count) return false;

        if (drag.SlotIdx == targetSlotIdx &&
            string.Equals(drag.SourceLocation, targetLocation, StringComparison.OrdinalIgnoreCase))
            return false;

        var sourceCard = slots[drag.SlotIdx].FirstOrDefault(c =>
            string.Equals(c.Location, drag.SourceLocation, StringComparison.OrdinalIgnoreCase));
        var destCard = slots[targetSlotIdx].FirstOrDefault(c =>
            string.Equals(c.Location, targetLocation, StringComparison.OrdinalIgnoreCase));

        if (sourceCard is null || destCard is null) return false;

        var sup = sourceCard.Supers.FirstOrDefault(s =>
            string.Equals(s.Name, drag.Value, StringComparison.OrdinalIgnoreCase));
        if (sup is null) return false;

        if (destCard.Supers.Any(s => string.Equals(s.Name, drag.Value, StringComparison.OrdinalIgnoreCase)))
            return false;

        if (sourceCard.Supers.Count == 1)
        {
            if (!destCard.Supers.Any()) return false;
            var swapTarget = destCard.Supers[0];
            sourceCard.Supers[0] = swapTarget;
            destCard.Supers.Remove(swapTarget);
            destCard.Supers.Add(sup);
        }
        else
        {
            sourceCard.Supers.Remove(sup);
            destCard.Supers.Add(sup);
        }
        return true;
    }

    /// <summary>
    /// Like TryDropTag but source and target slot indices are independent,
    /// allowing chips to move across time slots. Same constraint rules apply.
    /// </summary>
    public static bool TryDropTagCrossSlot(
        List<List<SlotCard>> slots,
        TagDrag drag,
        int targetSlotIdx,
        string targetLocation)
    {
        if (drag.SlotIdx < 0 || drag.SlotIdx >= slots.Count)
            return false;
        if (targetSlotIdx < 0 || targetSlotIdx >= slots.Count)
            return false;

        if (drag.SlotIdx == targetSlotIdx &&
            string.Equals(drag.SourceLocation, targetLocation, StringComparison.OrdinalIgnoreCase))
            return false;

        var sourceCard = slots[drag.SlotIdx].FirstOrDefault(c =>
            string.Equals(c.Location, drag.SourceLocation, StringComparison.OrdinalIgnoreCase));
        var destCard = slots[targetSlotIdx].FirstOrDefault(c =>
            string.Equals(c.Location, targetLocation, StringComparison.OrdinalIgnoreCase));

        if (sourceCard is null || destCard is null)
            return false;

        return drag.Type switch
        {
            "client" => MoveClient(sourceCard, destCard, drag.Value),
            "supervisor" => MoveSupervisor(sourceCard, destCard, drag.Value),
            "game" => SwapGame(sourceCard, destCard),
            _ => false
        };
    }
}
