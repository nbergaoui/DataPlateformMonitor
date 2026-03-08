using DataGate.Monitoring.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace DataGate.Monitoring.API.Controllers;

[ApiController]
[Route("api/kpis")]
public class KpisController : ControllerBase
{
    private readonly IKpiService _kpis;

    public KpisController(IKpiService kpis) => _kpis = kpis;

    [HttpGet]
    public async Task<IActionResult> GetKpis(
        [FromQuery] string  from     = "",
        [FromQuery] string  to       = "",
        [FromQuery] string? jobName  = null,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20,
        CancellationToken ct = default)
    {
        var fromDate = DateOnly.TryParse(from, out var f) ? f : DateOnly.FromDateTime(DateTime.Today.AddDays(-7));
        var toDate   = DateOnly.TryParse(to,   out var t) ? t : DateOnly.FromDateTime(DateTime.Today);

        return Ok(await _kpis.GetKpisAsync(fromDate, toDate, jobName, page, pageSize, ct));
    }
}
