using Microsoft.AspNetCore.Components;

namespace planboard.Services;

public record ModalOptions(
    string Title,
    string Placeholder = "Naam...",
    string ConfirmLabel = "Toevoegen",
    bool HideInput = false,
    bool HideCancel = false,
    string? InitialValue = null,
    RenderFragment? Extra = null,
    RenderFragment? FooterExtra = null,
    Func<string, Task>? OnConfirm = null
);

public class ModalService
{
    public event Action? OnChange;
    public bool IsOpen { get; private set; }
    public ModalOptions? Options { get; private set; }

    public void Open(ModalOptions options)
    {
        Options = options;
        IsOpen = true;
        OnChange?.Invoke();
    }

    public void Close()
    {
        IsOpen = false;
        Options = null;
        OnChange?.Invoke();
    }
}
