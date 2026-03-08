namespace DataGate.Monitoring.API.Models.Kpi;

public record KpiSummary(
    long   TotalIngested,
    long   TotalRejected,
    double RejectionRate,
    int    JobsExecuted,
    string TotalIngestedDisplay,
    string TotalRejectedDisplay
);

public record JobKpi(
    string   JobName,
    string   Source,
    DateTime RunDate,
    long     RowsIngested,
    long     RowsRejected,
    double   RejectionRate,
    string   Status,          // ok | degraded | failed
    string   DurationDisplay
);

public record KpiResponse(
    KpiSummary   Summary,
    List<JobKpi> Jobs,
    int          TotalCount
);
