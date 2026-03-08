namespace DataGate.Monitoring.API.Models.Airflow;

public record SchedulerHealth(
    double HeartbeatSeconds,
    double LoopDurationSeconds,
    double CriticalSectionDurationSeconds,
    int    TasksScheduled,
    int    TasksQueued,
    int    TasksRunning,
    int    TasksZombie,
    int    OpenSlots,
    int    Parallelism,
    double DbConnectionPoolPercent,
    DateTime LastChecked
);

public record ZombieTask(
    string DagId,
    string TaskId,
    string RunId,
    DateTime QueuedAt,
    double RunningMinutes,
    string ExpectedPodName,
    string DisappearanceReason   // OOMKilled | Evicted | NotFound
);

public record SchedulerRestart(
    DateTime RestartDate,
    string   Trigger,
    int      ScheduledBlockedCount,
    int      ZombieCount,
    int?     ResolutionSeconds,
    int      UptimeDays
);

public record DagSummary(
    string DagId,
    string Owner,
    bool   IsPaused,
    bool   IsActive
);

public record DagRun(
    string   DagId,
    string   RunId,
    string   State,           // success | failed | running | queued
    DateTime ExecutionDate,
    DateTime? StartDate,
    DateTime? EndDate,
    string?  FailedTaskId
);

public record PipelineSummary(
    int Total,
    int Success,
    int Failed,
    int Running
);

public record HeatmapRow(
    string DagId,
    List<HeatmapCell> Days
);

public record HeatmapCell(
    string Date,
    string Status   // success | failed | partial | none
);
