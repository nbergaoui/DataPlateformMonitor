using DataGate.Monitoring.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace DataGate.Monitoring.API.Controllers;

[ApiController]
[Route("api/pipelines")]
public class PipelinesController : ControllerBase
{
    private readonly IAirflowService _airflow;

    public PipelinesController(IAirflowService airflow) => _airflow = airflow;

    [HttpGet]
    public async Task<IActionResult> GetPipelines(
        [FromQuery] string from     = "",
        [FromQuery] string to       = "",
        [FromQuery] string? dagId   = null,
        [FromQuery] string? status  = null,
        CancellationToken ct = default)
    {
        var fromDate = DateOnly.TryParse(from, out var f) ? f : DateOnly.FromDateTime(DateTime.Today.AddDays(-7));
        var toDate   = DateOnly.TryParse(to,   out var t) ? t : DateOnly.FromDateTime(DateTime.Today);

        var summaryTask  = _airflow.GetPipelineSummaryAsync(fromDate, toDate, ct);
        var heatmapTask  = _airflow.GetHeatmapAsync(fromDate, toDate, ct);
        var failedTask   = _airflow.GetFailedRunsAsync(fromDate, toDate, dagId, ct);

        await Task.WhenAll(summaryTask, heatmapTask, failedTask);

        return Ok(new
        {
            summary    = await summaryTask,
            heatmap    = await heatmapTask,
            failedRuns = await failedTask,
            updatedAt  = DateTime.UtcNow
        });
    }
}
