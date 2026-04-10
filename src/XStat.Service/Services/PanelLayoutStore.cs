namespace XStat.Service.Services;

/// <summary>
/// Store for the active panel layout pushed by the Electron app.
/// Persists to %ProgramData%\XStat\panel-layout.json so the layout survives
/// service restarts and is immediately available to LAN panel clients on startup.
/// </summary>
public sealed class PanelLayoutStore
{
    private static readonly string StorePath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
        "XStat", "panel-layout.json");

    private volatile string? _layoutJson;

    public PanelLayoutStore()
    {
        try
        {
            if (File.Exists(StorePath))
                _layoutJson = File.ReadAllText(StorePath);
        }
        catch { /* best-effort — start with no layout if file is unreadable */ }
    }

    public string? GetLayoutJson() => _layoutJson;

    public void SetLayoutJson(string json)
    {
        _layoutJson = json;
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(StorePath)!);
            File.WriteAllText(StorePath, json);
        }
        catch { /* best-effort — don't crash the request if the write fails */ }
    }
}
