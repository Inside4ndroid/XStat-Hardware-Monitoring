namespace XStat.Service.Services;

/// <summary>
/// In-memory store for the active panel layout pushed by the Electron app.
/// Permits LAN web panel clients to retrieve the current designed layout.
/// </summary>
public sealed class PanelLayoutStore
{
    private volatile string? _layoutJson;

    public string? GetLayoutJson() => _layoutJson;

    public void SetLayoutJson(string json) => _layoutJson = json;
}
