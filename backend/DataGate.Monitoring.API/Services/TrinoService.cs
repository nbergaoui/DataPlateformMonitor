using DataGate.Monitoring.API.Configuration;
using DataGate.Monitoring.API.Models.Trino;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace DataGate.Monitoring.API.Services;

public interface ITrinoService
{
    Task<TrinoHealth>       GetHealthAsync(CancellationToken ct = default);
    Task<TrinoClusterStats> GetClusterStatsAsync(CancellationToken ct = default);
    Task<List<TrinoQuery>>  GetActiveQueriesAsync(CancellationToken ct = default);
}

public class TrinoService : ITrinoService
{
    private readonly HttpClient   _http;
    private readonly ILogger<TrinoService> _logger;

    public TrinoService(IHttpClientFactory factory, TrinoSettings settings, ILogger<TrinoService> logger)
    {
        _http   = factory.CreateClient("trino");
        _logger = logger;

        var credentials = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{settings.User}:{settings.Password}"));
        _http.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Basic", credentials);
    }

    public async Task<TrinoHealth> GetHealthAsync(CancellationToken ct = default)
    {
        try
        {
            var response = await _http.GetAsync("/v1/info", ct);
            response.EnsureSuccessStatusCode();

            var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct)).RootElement;

            return new TrinoHealth(
                Status:      "healthy",
                Version:     doc.TryGetProperty("nodeVersion", out var v)
                                 ? v.GetProperty("version").GetString() ?? "unknown"
                                 : "unknown",
                Environment: doc.TryGetProperty("environment", out var e) ? e.GetString() ?? "" : "",
                UptimeDisplay: "N/A",
                LastChecked: DateTime.UtcNow
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Trino health check failed");
            return new TrinoHealth("down", "unknown", "", "N/A", DateTime.UtcNow);
        }
    }

    public async Task<TrinoClusterStats> GetClusterStatsAsync(CancellationToken ct = default)
    {
        var response = await _http.GetAsync("/v1/cluster", ct);
        response.EnsureSuccessStatusCode();

        var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct)).RootElement;

        return new TrinoClusterStats(
            ActiveWorkers:          doc.GetProperty("activeWorkers").GetInt32(),
            RunningQueries:         doc.GetProperty("runningQueries").GetInt32(),
            QueuedQueries:          doc.GetProperty("queuedQueries").GetInt32(),
            BlockedQueries:         doc.GetProperty("blockedQueries").GetInt32(),
            CpuPercent:             Math.Round(doc.GetProperty("userCpuTimeSecs").GetDouble() / 100, 1),
            MemoryPercent:          0,
            QueriesPerMinute:       Math.Round(doc.GetProperty("oneMinuteInputRows").GetDouble() / 60, 1),
            CompletedQueries24h:    0,
            FailedQueries24h:       0,
            MedianQueryDurationSeconds: 0,
            P95QueryDurationSeconds: 0,
            ScannedBytes24h:        0
        );
    }

    public async Task<List<TrinoQuery>> GetActiveQueriesAsync(CancellationToken ct = default)
    {
        var response = await _http.GetAsync("/v1/query?state=RUNNING", ct);
        response.EnsureSuccessStatusCode();

        var queries = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct)).RootElement;

        var result = new List<TrinoQuery>();
        foreach (var q in queries.EnumerateArray())
        {
            var elapsedMs = q.TryGetProperty("queryStats", out var stats)
                ? (long)(stats.GetProperty("elapsedTime").GetString() is { } t
                    ? ParseDurationMs(t) : 0)
                : 0;

            result.Add(new TrinoQuery(
                QueryId:      q.GetProperty("queryId").GetString() ?? "",
                State:        q.GetProperty("state").GetString() ?? "",
                QueryText:    TruncateQuery(q.GetProperty("query").GetString() ?? ""),
                User:         q.TryGetProperty("session", out var sess)
                                  ? sess.GetProperty("user").GetString() ?? ""
                                  : "",
                ElapsedMs:    elapsedMs,
                ScannedBytes: 0,
                ElapsedDisplay:  FormatDuration(elapsedMs),
                ScannedDisplay:  "N/A"
            ));
        }
        return result;
    }

    private static double ParseDurationMs(string duration)
    {
        // Format: "1.23ms", "4.56s", "1.23m"
        if (duration.EndsWith("ms") && double.TryParse(duration[..^2], out var ms)) return ms;
        if (duration.EndsWith("s")  && double.TryParse(duration[..^1], out var s))  return s * 1000;
        if (duration.EndsWith("m")  && double.TryParse(duration[..^1], out var m))  return m * 60000;
        return 0;
    }

    private static string FormatDuration(long ms)
    {
        if (ms < 1000)   return $"{ms}ms";
        if (ms < 60000)  return $"{ms / 1000}s";
        return $"{ms / 60000}min {(ms % 60000) / 1000}s";
    }

    private static string TruncateQuery(string q) =>
        q.Length > 120 ? q[..120] + "..." : q;
}
