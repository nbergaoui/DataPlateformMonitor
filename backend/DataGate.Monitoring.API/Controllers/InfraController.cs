using DataGate.Monitoring.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace DataGate.Monitoring.API.Controllers;

[ApiController]
[Route("api/infra")]
public class InfraController : ControllerBase
{
    private readonly IAirflowService    _airflow;
    private readonly ITrinoService      _trino;
    private readonly IKubernetesService _k8s;

    public InfraController(IAirflowService airflow, ITrinoService trino, IKubernetesService k8s)
    {
        _airflow = airflow;
        _trino   = trino;
        _k8s     = k8s;
    }

    // ── Vue d'ensemble ────────────────────────────────────────────────────────
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(CancellationToken ct)
    {
        var airflowHealth = await _airflow.GetSchedulerHealthAsync(ct);
        var trinoHealth   = await _trino.GetHealthAsync(ct);
        var k8sOverview   = await _k8s.GetClusterOverviewAsync(ct);

        return Ok(new
        {
            airflow    = new { airflowHealth.TasksScheduled, airflowHealth.TasksZombie, airflowHealth.OpenSlots, airflowHealth.Parallelism },
            trino      = trinoHealth,
            kubernetes = k8sOverview,
            updatedAt  = DateTime.UtcNow
        });
    }

    // ── Kubernetes ────────────────────────────────────────────────────────────
    [HttpGet("kubernetes/nodes")]
    public async Task<IActionResult> GetNodes(CancellationToken ct)
        => Ok(await _k8s.GetNodesAsync(ct));

    [HttpGet("kubernetes/spark-pods")]
    public async Task<IActionResult> GetSparkPods(CancellationToken ct)
        => Ok(await _k8s.GetSparkPodsAsync(ct));

    // ── Airflow ───────────────────────────────────────────────────────────────
    [HttpGet("airflow/scheduler-health")]
    public async Task<IActionResult> GetSchedulerHealth(CancellationToken ct)
        => Ok(await _airflow.GetSchedulerHealthAsync(ct));

    [HttpGet("airflow/zombies")]
    public async Task<IActionResult> GetZombies(CancellationToken ct)
        => Ok(await _airflow.GetZombieTasksAsync(ct));

    [HttpGet("airflow/restart-history")]
    public async Task<IActionResult> GetRestartHistory(CancellationToken ct)
        => Ok(await _airflow.GetSchedulerRestartHistoryAsync(ct));

    // ── Trino ─────────────────────────────────────────────────────────────────
    [HttpGet("trino/health")]
    public async Task<IActionResult> GetTrinoHealth(CancellationToken ct)
        => Ok(await _trino.GetHealthAsync(ct));

    [HttpGet("trino/cluster")]
    public async Task<IActionResult> GetTrinoCluster(CancellationToken ct)
        => Ok(await _trino.GetClusterStatsAsync(ct));

    [HttpGet("trino/queries")]
    public async Task<IActionResult> GetTrinoQueries(CancellationToken ct)
        => Ok(await _trino.GetActiveQueriesAsync(ct));
}
