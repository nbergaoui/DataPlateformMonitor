namespace DataGate.Monitoring.API.Models.Kubernetes;

public record ClusterOverview(
    int ReadyNodes,
    int PressureNodes,
    int NotReadyNodes,
    string Status   // ok | warning | critical
);

public record NodeStatus(
    string Name,
    string Status,        // Ready | MemoryPressure | DiskPressure | NotReady
    double CpuPercent,
    double MemoryPercent,
    List<string> Conditions
);

public record SparkPod(
    string   Name,
    string   Phase,         // Running | Pending | Failed | Completed | Unknown
    string?  NodeName,
    DateTime? StartTime,
    string   StartTimeDisplay,
    string   CpuRequest,
    string   MemoryRequest,
    string?  TerminationReason  // OOMKilled | Error | Completed | null
);
