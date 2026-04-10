using Microsoft.AspNetCore.Mvc;
using XStat.Service.Services;

namespace XStat.Service.Controllers;

[ApiController]
[Route("api/config")]
public sealed class ConfigController : ControllerBase
{
    private readonly SensorBroadcastService _broadcast;

    public ConfigController(SensorBroadcastService broadcast)
    {
        _broadcast = broadcast;
    }

    /// <summary>GET /api/config — returns current runtime configuration.</summary>
    [HttpGet]
    public IActionResult Get() =>
        Ok(new { pollIntervalMs = _broadcast.PollIntervalMs });

    /// <summary>PUT /api/config — update runtime configuration (takes effect immediately).</summary>
    [HttpPut]
    public IActionResult Put([FromBody] ConfigRequest body)
    {
        if (body.PollIntervalMs is < 100 or > 30_000)
            return BadRequest(new { error = "pollIntervalMs must be between 100 and 30000." });

        _broadcast.PollIntervalMs = body.PollIntervalMs;
        return NoContent();
    }
}

public record ConfigRequest(int PollIntervalMs);
