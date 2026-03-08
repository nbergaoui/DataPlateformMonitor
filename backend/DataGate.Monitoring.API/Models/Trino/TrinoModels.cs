namespace DataGate.Monitoring.API.Models.Trino;

public record TrinoHealth(
    string   Status,       // healthy | degraded | down
    string   Version,
    string   Environment,
    string   UptimeDisplay,
    DateTime LastChecked
);

public record TrinoClusterStats(
    int    ActiveWorkers,
    int    RunningQueries,
    int    QueuedQueries,
    int    BlockedQueries,
    double CpuPercent,
    double MemoryPercent,
    double QueriesPerMinute,
    long   CompletedQueries24h,
    long   FailedQueries24h,
    double MedianQueryDurationSeconds,
    double P95QueryDurationSeconds,
    long   ScannedBytes24h
);

public record TrinoQuery(
    string   QueryId,
    string   State,         // RUNNING | QUEUED | FAILED | FINISHED
    string   QueryText,
    string   User,
    long     ElapsedMs,
    long     ScannedBytes,
    string   ElapsedDisplay,
    string   ScannedDisplay
);
