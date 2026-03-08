using DataGate.Monitoring.API.Configuration;
using DataGate.Monitoring.API.Models.Kpi;
using Npgsql;
using Dapper;

namespace DataGate.Monitoring.API.Services;

public interface IKpiService
{
    Task<KpiResponse> GetKpisAsync(DateOnly from, DateOnly to, string? jobName, int page, int pageSize, CancellationToken ct = default);
}

public class KpiService : IKpiService
{
    private readonly string _connString;
    private readonly ILogger<KpiService> _logger;

    public KpiService(DatabaseSettings settings, ILogger<KpiService> logger)
    {
        _connString = settings.ConnectionString;
        _logger     = logger;
    }

    public async Task<KpiResponse> GetKpisAsync(
        DateOnly from, DateOnly to, string? jobName,
        int page = 1, int pageSize = 20,
        CancellationToken ct = default)
    {
        await using var conn = new NpgsqlConnection(_connString);

        var summaryTask = GetSummaryAsync(conn, from, to, jobName);
        var jobsTask    = GetJobsAsync(conn, from, to, jobName, page, pageSize);
        var countTask   = GetCountAsync(conn, from, to, jobName);

        await Task.WhenAll(summaryTask, jobsTask, countTask);

        return new KpiResponse(
            await summaryTask,
            await jobsTask,
            await countTask
        );
    }

    private async Task<KpiSummary> GetSummaryAsync(
        NpgsqlConnection conn, DateOnly from, DateOnly to, string? jobName)
    {
        var row = await conn.QuerySingleAsync<dynamic>("""
            SELECT
                COALESCE(SUM(rows_ingested), 0)  AS total_ingested,
                COALESCE(SUM(rows_rejected), 0)  AS total_rejected,
                COUNT(DISTINCT job_name)          AS jobs_executed
            FROM spark_job_monitoring
            WHERE run_date BETWEEN @from AND @to
              AND (@jobName IS NULL OR job_name = @jobName)
            """,
            new { from = from.ToDateTime(TimeOnly.MinValue), to = to.ToDateTime(TimeOnly.MinValue), jobName });

        long ingested = (long)row.total_ingested;
        long rejected = (long)row.total_rejected;
        double rate   = ingested > 0 ? Math.Round((double)rejected / ingested * 100, 2) : 0;

        return new KpiSummary(
            TotalIngested:       ingested,
            TotalRejected:       rejected,
            RejectionRate:       rate,
            JobsExecuted:        (int)row.jobs_executed,
            TotalIngestedDisplay: FormatBigNumber(ingested),
            TotalRejectedDisplay: FormatBigNumber(rejected)
        );
    }

    private async Task<List<JobKpi>> GetJobsAsync(
        NpgsqlConnection conn, DateOnly from, DateOnly to, string? jobName,
        int page, int pageSize)
    {
        var rows = await conn.QueryAsync<dynamic>("""
            SELECT
                job_name,
                source_name,
                run_date,
                rows_ingested,
                rows_rejected,
                CASE WHEN rows_ingested > 0
                     THEN ROUND(rows_rejected::numeric / rows_ingested * 100, 2)
                     ELSE 0 END AS rejection_rate,
                status,
                duration_seconds
            FROM spark_job_monitoring
            WHERE run_date BETWEEN @from AND @to
              AND (@jobName IS NULL OR job_name = @jobName)
            ORDER BY run_date DESC, job_name
            LIMIT @pageSize OFFSET @offset
            """,
            new {
                from      = from.ToDateTime(TimeOnly.MinValue),
                to        = to.ToDateTime(TimeOnly.MinValue),
                jobName,
                pageSize,
                offset    = (page - 1) * pageSize
            });

        return rows.Select(r => new JobKpi(
            JobName:         r.job_name,
            Source:          r.source_name ?? "",
            RunDate:         DateOnly.FromDateTime((DateTime)r.run_date),
            RowsIngested:    (long)r.rows_ingested,
            RowsRejected:    (long)r.rows_rejected,
            RejectionRate:   (double)r.rejection_rate,
            Status:          DetermineStatus((double)r.rejection_rate, r.status),
            DurationDisplay: FormatDuration((int?)r.duration_seconds)
        )).ToList();
    }

    private async Task<int> GetCountAsync(NpgsqlConnection conn, DateOnly from, DateOnly to, string? jobName)
    {
        return await conn.QuerySingleAsync<int>("""
            SELECT COUNT(*) FROM spark_job_monitoring
            WHERE run_date BETWEEN @from AND @to
              AND (@jobName IS NULL OR job_name = @jobName)
            """,
            new { from = from.ToDateTime(TimeOnly.MinValue), to = to.ToDateTime(TimeOnly.MinValue), jobName });
    }

    private static string DetermineStatus(double rejectionRate, object dbStatus)
    {
        var s = dbStatus?.ToString()?.ToLower() ?? "";
        if (s == "failed")         return "failed";
        if (rejectionRate > 1.0)   return "degraded";
        return "ok";
    }

    private static string FormatBigNumber(long n)
    {
        if (n >= 1_000_000) return $"{n / 1_000_000.0:F1}M";
        if (n >= 1_000)     return $"{n / 1_000.0:F0}K";
        return n.ToString();
    }

    private static string FormatDuration(int? seconds)
    {
        if (seconds is null) return "—";
        if (seconds < 60)    return $"{seconds}s";
        if (seconds < 3600)  return $"{seconds / 60}min";
        return $"{seconds / 3600}h {(seconds % 3600) / 60}min";
    }
}
