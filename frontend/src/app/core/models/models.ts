// ── Infra : Airflow ────────────────────────────────────────────────────────────
export interface SchedulerHealth {
  heartbeatSeconds: number;
  criticalSectionDurationSeconds: number;
  tasksScheduled: number;
  tasksQueued: number;
  tasksRunning: number;
  tasksZombie: number;
  openSlots: number;
  parallelism: number;
  dbConnectionPoolPercent: number;
}

export interface ZombieTask {
  dagId: string;
  taskId: string;
  runId: string;
  runningMinutes: number;
  expectedPodName: string;
  disappearanceReason: string;
}

export interface SchedulerRestart {
  restartDate: string;
  trigger: string;
  scheduledBlockedCount: number;
  zombieCount: number;
  resolutionSeconds: number | null;
  uptimeDays: number;
}

// ── Infra : Kubernetes ─────────────────────────────────────────────────────────
export interface NodeStatus {
  name: string;
  status: string;
  cpuPercent: number;
  memoryPercent: number;
  podCount: number;
}

export interface SparkPod {
  name: string;
  namespace: string;
  phase: string;
  nodeName: string | null;
  startTimeDisplay: string;
  cpuRequest: string;
  memoryRequest: string;
  terminationReason: string | null;
}

// ── Infra : Overview ───────────────────────────────────────────────────────────
export interface ClusterOverview {
  airflow: {
    tasksScheduled: number;
    tasksRunning: number;
    tasksQueued: number;
    tasksZombie: number;
    openSlots: number;
    parallelism: number;
    heartbeatSeconds: number;
    criticalSectionDurationSeconds: number;
    dbConnectionPoolPercent: number;
  };
  trino: {
    status: string;
    version: string;
    nodeCount: number;
  };
  kubernetes: {
    status: string;
    readyNodes: number;
    pressureNodes: number;
  };
}

// ── Infra : Trino ──────────────────────────────────────────────────────────────
export interface TrinoHealth {
  status: string;
  version: string;
  nodeCount: number;
}

export interface TrinoClusterStats {
  activeWorkers: number;
  runningQueries: number;
  queuedQueries: number;
  cpuPercent: number;
  memoryPercent: number;
  completedQueries24h: number;
  failedQueries24h: number;
  medianQueryDurationSeconds: number;
  p95QueryDurationSeconds: number;
}

export interface TrinoQuery {
  queryId: string;
  state: string;
  queryText: string;
  user: string;
  elapsedDisplay: string;
  scannedDisplay: string;
}

// ── Pipelines ──────────────────────────────────────────────────────────────────
export interface PipelineSummary {
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  runningRuns: number;
  successRate: number;
}

export interface HeatmapCell {
  date: string;
  state: 'success' | 'failed' | 'running' | 'none';
  durationMinutes: number;
}

export interface HeatmapRow {
  dagId: string;
  days: HeatmapCell[];
}

export interface FailedRun {
  dagId: string;
  runId: string;
  executionDate: string;
  failedTask: string;
  errorMessage: string;
  durationMinutes: number;
}

export interface PipelinesResponse {
  summary: PipelineSummary;
  heatmap: HeatmapRow[];
  failedRuns: FailedRun[];
  totalCount: number;
}

// ── KPIs ───────────────────────────────────────────────────────────────────────
export interface KpiSummary {
  totalIngested: number;
  totalRejected: number;
  rejectionRate: number;
  jobsExecuted: number;
  totalIngestedDisplay: string;
  totalRejectedDisplay: string;
}

export interface JobKpi {
  jobName: string;
  source: string;
  runDate: string;
  rowsIngested: number;
  rowsRejected: number;
  rejectionRate: number;
  status: 'ok' | 'degraded' | 'failed';
  durationDisplay: string;
}

export interface KpiResponse {
  summary: KpiSummary;
  jobs: JobKpi[];
  totalCount: number;
}
