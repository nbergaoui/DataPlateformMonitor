using DataGate.Monitoring.API.Configuration;
using DataGate.Monitoring.API.Models.Airflow;
using Npgsql;
using Dapper;
using System.Text.Json;

namespace DataGate.Monitoring.API.Services;

public interface IAirflowService
{
    Task<SchedulerHealth>        GetSchedulerHealthAsync(CancellationToken ct = default);
    Task<List<ZombieTask>>       GetZombieTasksAsync(CancellationToken ct = default);
    Task<List<SchedulerRestart>> GetSchedulerRestartHistoryAsync(CancellationToken ct = default);
    Task<PipelineSummary>        GetPipelineSummaryAsync(DateOnly from, DateOnly to, CancellationToken ct = default);
    Task<List<HeatmapRow>>       GetHeatmapAsync(DateOnly from, DateOnly to, CancellationToken ct = default);
    Task<List<DagRun>>           GetFailedRunsAsync(DateOnly from, DateOnly to, string? dagId, CancellationToken ct = default);
}

public class AirflowService : IAirflowService
{
    private readonly HttpClient             _http;
    private readonly IKeycloakTokenService  _tokenService;
    private readonly string                 _connString;
    private readonly ILogger<AirflowService> _logger;

    public AirflowService(
        IHttpClientFactory factory,
        IKeycloakTokenService tokenService,
        DatabaseSettings dbSettings,
        ILogger<AirflowService> logger)
    {
        _http         = factory.CreateClient("airflow");
        _tokenService = tokenService;
        _connString   = dbSettings.ConnectionString;
        _logger       = logger;
    }

    // ── Scheduler health — combine Airflow REST API + DB queries ──────────────
    public async Task<SchedulerHealth> GetSchedulerHealthAsync(CancellationToken ct = default)
    {
        await AuthorizeAsync(ct);

        var healthTask   = GetApiAsync("/api/v1/health", ct);
        var poolTask     = GetApiAsync("/api/v1/pools", ct);
        var dbStatsTask  = GetDbSchedulerStatsAsync(ct);

        await Task.WhenAll(healthTask, poolTask, dbStatsTask);

        var health  = JsonDocument.Parse(await healthTask).RootElement;
        var dbStats = await dbStatsTask;

        var schedulerHb = health
            .GetProperty("scheduler")
            .GetProperty("latest_scheduler_heartbeat")
            .GetString();

        double heartbeatSec = 0;
        if (DateTime.TryParse(schedulerHb, out var hbTime))
            heartbeatSec = (DateTime.UtcNow - hbTime.ToUniversalTime()).TotalSeconds;

        return new SchedulerHealth(
            HeartbeatSeconds:               Math.Round(heartbeatSec, 1),
            LoopDurationSeconds:            dbStats.LoopDuration,
            CriticalSectionDurationSeconds: dbStats.CriticalSectionDuration,
            TasksScheduled:                 dbStats.TasksScheduled,
            TasksQueued:                    dbStats.TasksQueued,
            TasksRunning:                   dbStats.TasksRunning,
            TasksZombie:                    dbStats.TasksZombie,
            OpenSlots:                      dbStats.OpenSlots,
            Parallelism:                    dbStats.Parallelism,
            DbConnectionPoolPercent:        dbStats.DbConnectionPoolPercent,
            LastChecked:                    DateTime.UtcNow
        );
    }

    // ── Zombie tasks: DB=running but no K8s pod ───────────────────────────────
    public async Task<List<ZombieTask>> GetZombieTasksAsync(CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connString);
        var rows = await conn.QueryAsync<dynamic>("""
            SELECT
                ti.dag_id,
                ti.task_id,
                ti.run_id,
                ti.queued_dttm,
                EXTRACT(EPOCH FROM (NOW() - ti.start_date)) / 60 AS running_minutes
            FROM task_instance ti
            WHERE ti.state = 'running'
              AND ti.start_date < NOW() - INTERVAL '30 minutes'
            ORDER BY ti.start_date ASC
            """);

        return rows.Select(r => new ZombieTask(
            DagId:              r.dag_id,
            TaskId:             r.task_id,
            RunId:              r.run_id,
            QueuedAt:           r.queued_dttm,
            RunningMinutes:     Math.Round((double)r.running_minutes, 1),
            ExpectedPodName:    BuildExpectedPodName(r.dag_id, r.run_id),
            DisappearanceReason: "Unknown"  // enrichi par KubernetesService
        )).ToList();
    }

    // ── Scheduler restart history ─────────────────────────────────────────────
    public async Task<List<SchedulerRestart>> GetSchedulerRestartHistoryAsync(CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connString);
        // On interroge la table job d'Airflow pour détecter les restarts
        var rows = await conn.QueryAsync<dynamic>("""
            SELECT
                start_date,
                end_date,
                state,
                latest_heartbeat
            FROM job
            WHERE job_type = 'SchedulerJob'
              AND start_date > NOW() - INTERVAL '30 days'
            ORDER BY start_date DESC
            LIMIT 20
            """);

        return rows.Select((r, i) => new SchedulerRestart(
            RestartDate:          r.start_date,
            Trigger:              "Manuel",
            ScheduledBlockedCount: 0,
            ZombieCount:          0,
            ResolutionSeconds:    r.end_date != null
                ? (int?)((DateTime)r.end_date - (DateTime)r.start_date).TotalSeconds
                : null,
            UptimeDays: 0
        )).ToList();
    }

    // ── Pipelines ─────────────────────────────────────────────────────────────
    public async Task<PipelineSummary> GetPipelineSummaryAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connString);
        var row = await conn.QuerySingleAsync<dynamic>("""
            SELECT
                COUNT(*)                                          AS total,
                COUNT(*) FILTER (WHERE state = 'success')        AS success,
                COUNT(*) FILTER (WHERE state = 'failed')         AS failed,
                COUNT(*) FILTER (WHERE state IN ('running','queued')) AS running
            FROM dag_run
            WHERE execution_date >= @from
              AND execution_date <  @to + INTERVAL '1 day'
            """, new { from = from.ToDateTime(TimeOnly.MinValue), to = to.ToDateTime(TimeOnly.MinValue) });

        return new PipelineSummary((int)row.total, (int)row.success, (int)row.failed, (int)row.running);
    }

    public async Task<List<HeatmapRow>> GetHeatmapAsync(DateOnly from, DateOnly to, CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connString);
        var rows = await conn.QueryAsync<dynamic>("""
            SELECT
                dag_id,
                execution_date::date AS run_date,
                CASE
                    WHEN bool_and(state = 'success')         THEN 'success'
                    WHEN bool_or(state = 'failed')           THEN 'failed'
                    WHEN bool_or(state IN ('running','queued')) THEN 'running'
                    ELSE 'none'
                END AS status
            FROM dag_run
            WHERE execution_date >= @from
              AND execution_date <  @to + INTERVAL '1 day'
            GROUP BY dag_id, execution_date::date
            ORDER BY dag_id, run_date
            """, new { from = from.ToDateTime(TimeOnly.MinValue), to = to.ToDateTime(TimeOnly.MinValue) });

        return rows
            .GroupBy(r => (string)r.dag_id)
            .Select(g => new HeatmapRow(
                g.Key,
                g.Select(r => new HeatmapCell(
                    ((DateTime)r.run_date).ToString("yyyy-MM-dd"),
                    (string)r.status
                )).ToList()
            )).ToList();
    }

    public async Task<List<DagRun>> GetFailedRunsAsync(DateOnly from, DateOnly to, string? dagId, CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connString);
        var rows = await conn.QueryAsync<dynamic>("""
            SELECT
                dr.dag_id,
                dr.run_id,
                dr.state,
                dr.execution_date,
                dr.start_date,
                dr.end_date,
                (
                    SELECT task_id FROM task_instance
                    WHERE dag_id = dr.dag_id AND run_id = dr.run_id AND state = 'failed'
                    LIMIT 1
                ) AS failed_task_id
            FROM dag_run dr
            WHERE dr.state IN ('failed','up_for_retry')
              AND dr.execution_date >= @from
              AND dr.execution_date <  @to + INTERVAL '1 day'
              AND (@dagId IS NULL OR dr.dag_id = @dagId)
            ORDER BY dr.execution_date DESC
            LIMIT 100
            """, new { from = from.ToDateTime(TimeOnly.MinValue), to = to.ToDateTime(TimeOnly.MinValue), dagId });

        return rows.Select(r => new DagRun(
            r.dag_id, r.run_id, r.state,
            r.execution_date, r.start_date, r.end_date,
            r.failed_task_id
        )).ToList();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private async Task AuthorizeAsync(CancellationToken ct)
    {
        var token = await _tokenService.GetAccessTokenAsync(ct);
        _http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
    }

    private async Task<string> GetApiAsync(string path, CancellationToken ct)
    {
        var response = await _http.GetAsync(path, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(ct);
    }

    private static string BuildExpectedPodName(string dagId, string runId)
        => $"airflow-{dagId.Replace("_", "-")}-{runId[^6..]}";

    private async Task<DbSchedulerStats> GetDbSchedulerStatsAsync(CancellationToken ct)
    {
        await using var conn = new NpgsqlConnection(_connString);

        var states = await conn.QueryAsync<dynamic>("""
            SELECT state, COUNT(*) as cnt
            FROM task_instance
            WHERE state IN ('scheduled','queued','running')
            GROUP BY state
            """);

        var dict = states.ToDictionary(r => (string)r.state, r => (int)r.cnt);

        // Scheduler loop duration depuis la table job
        var loopDuration = await conn.QuerySingleOrDefaultAsync<double?>("""
            SELECT EXTRACT(EPOCH FROM (latest_heartbeat - start_date)) /
                   GREATEST(EXTRACT(EPOCH FROM (latest_heartbeat - start_date)) / 5, 1)
            FROM job
            WHERE job_type = 'SchedulerJob' AND state = 'running'
            ORDER BY latest_heartbeat DESC
            LIMIT 1
            """) ?? 0;

        return new DbSchedulerStats
        {
            TasksScheduled          = dict.GetValueOrDefault("scheduled"),
            TasksQueued             = dict.GetValueOrDefault("queued"),
            TasksRunning            = dict.GetValueOrDefault("running"),
            TasksZombie             = 0, // calculé par croisement K8s
            OpenSlots               = 128 - dict.GetValueOrDefault("running"),
            Parallelism             = 128,
            LoopDuration            = loopDuration,
            CriticalSectionDuration = loopDuration * 0.7,
            DbConnectionPoolPercent = 0
        };
    }

    private class DbSchedulerStats
    {
        public int    TasksScheduled          { get; set; }
        public int    TasksQueued             { get; set; }
        public int    TasksRunning            { get; set; }
        public int    TasksZombie             { get; set; }
        public int    OpenSlots               { get; set; }
        public int    Parallelism             { get; set; }
        public double LoopDuration            { get; set; }
        public double CriticalSectionDuration { get; set; }
        public double DbConnectionPoolPercent { get; set; }
    }
}
