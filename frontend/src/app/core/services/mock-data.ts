import {
  SchedulerHealth, ZombieTask, SchedulerRestart,
  NodeStatus, SparkPod, ClusterOverview,
  TrinoHealth, TrinoClusterStats, TrinoQuery,
  PipelinesResponse, KpiResponse
} from '../models/models';

export const MOCK_OVERVIEW: ClusterOverview = {
  airflow: { tasksScheduled: 47, tasksRunning: 12, tasksQueued: 3, tasksZombie: 5, openSlots: 0, parallelism: 32, heartbeatSeconds: 18, criticalSectionDurationSeconds: 8.2, dbConnectionPoolPercent: 72 },
  trino: { status: 'healthy', version: '428', nodeCount: 4 },
  kubernetes: { status: 'warning', readyNodes: 6, pressureNodes: 1 }
};

export const MOCK_SCHEDULER_HEALTH: SchedulerHealth = {
  tasksScheduled: 47, tasksRunning: 12, tasksQueued: 3, tasksZombie: 5,
  openSlots: 0, parallelism: 32, heartbeatSeconds: 18,
  criticalSectionDurationSeconds: 8.2, dbConnectionPoolPercent: 72
};

export const MOCK_ZOMBIES: ZombieTask[] = [
  { dagId: 'etl_customers', taskId: 'transform_raw', runId: 'scheduled__2026-03-07T02:00:00', expectedPodName: 'airflow-etl-customers-transform-raw-abc12', runningMinutes: 142, disappearanceReason: 'OOMKilled' },
  { dagId: 'load_warehouse', taskId: 'insert_facts', runId: 'scheduled__2026-03-07T03:00:00', expectedPodName: 'airflow-load-warehouse-insert-facts-def34', runningMinutes: 98, disappearanceReason: 'NodeEviction' },
  { dagId: 'etl_products', taskId: 'validate_schema', runId: 'scheduled__2026-03-07T04:00:00', expectedPodName: 'airflow-etl-products-validate-schema-ghi56', runningMinutes: 61, disappearanceReason: 'OOMKilled' },
  { dagId: 'aggregate_kpis', taskId: 'compute_daily', runId: 'scheduled__2026-03-07T05:00:00', expectedPodName: 'airflow-aggregate-kpis-compute-daily-jkl78', runningMinutes: 34, disappearanceReason: 'ImagePullBackOff' },
  { dagId: 'sync_crm', taskId: 'fetch_contacts', runId: 'scheduled__2026-03-07T06:00:00', expectedPodName: 'airflow-sync-crm-fetch-contacts-mno90', runningMinutes: 21, disappearanceReason: 'NodeEviction' },
];

export const MOCK_RESTART_HISTORY: SchedulerRestart[] = [
  { restartDate: '2026-03-07T08:32:00Z', trigger: 'Manuel (ops)', scheduledBlockedCount: 47, zombieCount: 5, resolutionSeconds: 840, uptimeDays: 6 },
  { restartDate: '2026-02-28T14:17:00Z', trigger: 'Alerte automatique', scheduledBlockedCount: 31, zombieCount: 3, resolutionSeconds: 510, uptimeDays: 8 },
  { restartDate: '2026-02-20T09:05:00Z', trigger: 'Manuel (ops)', scheduledBlockedCount: 58, zombieCount: 7, resolutionSeconds: 1020, uptimeDays: 5 },
];

export const MOCK_NODES: NodeStatus[] = [
  { name: 'node-01', status: 'Ready',    cpuPercent: 62, memoryPercent: 74, podCount: 18 },
  { name: 'node-02', status: 'Pressure', cpuPercent: 91, memoryPercent: 88, podCount: 24 },
  { name: 'node-03', status: 'Ready',    cpuPercent: 45, memoryPercent: 61, podCount: 15 },
  { name: 'node-04', status: 'Ready',    cpuPercent: 38, memoryPercent: 55, podCount: 12 },
  { name: 'node-05', status: 'Ready',    cpuPercent: 70, memoryPercent: 79, podCount: 20 },
  { name: 'node-06', status: 'Ready',    cpuPercent: 29, memoryPercent: 48, podCount: 9  },
];

export const MOCK_SPARK_PODS: SparkPod[] = [
  { name: 'spark-etl-customers-driver-abc', namespace: 'spark-jobs', phase: 'Running',   nodeName: 'node-03', startTimeDisplay: 'il y a 12min', cpuRequest: '2 CPU', memoryRequest: '8Gi', terminationReason: null },
  { name: 'spark-load-warehouse-driver-def', namespace: 'spark-jobs', phase: 'Running',  nodeName: 'node-04', startTimeDisplay: 'il y a 4min',  cpuRequest: '4 CPU', memoryRequest: '16Gi', terminationReason: null },
  { name: 'spark-aggregate-kpis-driver-ghi', namespace: 'spark-jobs', phase: 'Failed',   nodeName: 'node-02', startTimeDisplay: 'il y a 1h',    cpuRequest: '2 CPU', memoryRequest: '8Gi',  terminationReason: 'OOMKilled' },
  { name: 'spark-sync-crm-driver-jkl',       namespace: 'spark-jobs', phase: 'Pending',  nodeName: null,      startTimeDisplay: 'il y a 3min',  cpuRequest: '1 CPU', memoryRequest: '4Gi',  terminationReason: null },
];

export const MOCK_TRINO_HEALTH: TrinoHealth = { status: 'healthy', version: '428', nodeCount: 4 };

export const MOCK_TRINO_CLUSTER: TrinoClusterStats = {
  activeWorkers: 4, runningQueries: 3, queuedQueries: 0,
  cpuPercent: 38, memoryPercent: 54,
  completedQueries24h: 1842, failedQueries24h: 7,
  medianQueryDurationSeconds: 4.2, p95QueryDurationSeconds: 28.6
};

export const MOCK_TRINO_QUERIES: TrinoQuery[] = [
  { queryId: '20260307_082341_00012_xyz', state: 'RUNNING', queryText: 'SELECT customer_id, SUM(amount) FROM orders GROUP BY 1', user: 'etl_spark', elapsedDisplay: '3.2s', scannedDisplay: '142 MB' },
  { queryId: '20260307_082355_00013_xyz', state: 'RUNNING', queryText: 'INSERT INTO warehouse.fact_sales SELECT * FROM staging.sales WHERE dt = current_date', user: 'airflow', elapsedDisplay: '1.8s', scannedDisplay: '89 MB' },
  { queryId: '20260307_082401_00014_xyz', state: 'QUEUED',  queryText: 'SELECT COUNT(*) FROM catalog.products WHERE updated_at > NOW() - INTERVAL \'1\' DAY', user: 'analyst', elapsedDisplay: '0.1s', scannedDisplay: '—' },
];

export const MOCK_PIPELINES: PipelinesResponse = {
  summary: { totalRuns: 312, successRuns: 271, failedRuns: 28, runningRuns: 4, successRate: 86.9 },
  heatmap: [
    { dagId: 'etl_customers',   days: Array.from({length:7}, (_,i) => ({ date: `2026-03-0${i+1}`, state: i===4||i===5 ? 'failed' : 'success', durationMinutes: 12+i })) },
    { dagId: 'load_warehouse',  days: Array.from({length:7}, (_,i) => ({ date: `2026-03-0${i+1}`, state: i===5 ? 'failed' : 'success', durationMinutes: 8+i })) },
    { dagId: 'aggregate_kpis',  days: Array.from({length:7}, (_,i) => ({ date: `2026-03-0${i+1}`, state: i===3||i===4||i===5 ? 'failed' : 'success', durationMinutes: 5+i })) },
    { dagId: 'sync_crm',        days: Array.from({length:7}, (_,i) => ({ date: `2026-03-0${i+1}`, state: 'success', durationMinutes: 3+i })) },
    { dagId: 'etl_products',    days: Array.from({length:7}, (_,i) => ({ date: `2026-03-0${i+1}`, state: i===6 ? 'running' : 'success', durationMinutes: 9+i })) },
  ],
  failedRuns: [
    { dagId: 'etl_customers',  runId: 'scheduled__2026-03-06T02:00:00', executionDate: '2026-03-06T02:00:00Z', failedTask: 'transform_raw', errorMessage: 'OOMKilled after 142min', durationMinutes: 142 },
    { dagId: 'aggregate_kpis', runId: 'scheduled__2026-03-05T05:00:00', executionDate: '2026-03-05T05:00:00Z', failedTask: 'compute_daily', errorMessage: 'Upstream task failed', durationMinutes: 34 },
    { dagId: 'load_warehouse',  runId: 'scheduled__2026-03-06T03:00:00', executionDate: '2026-03-06T03:00:00Z', failedTask: 'insert_facts',  errorMessage: 'Connection timeout to Trino', durationMinutes: 98 },
  ],
  totalCount: 312
};

export const MOCK_KPIS: KpiResponse = {
  summary: { totalIngested: 18420000, totalRejected: 94200, rejectionRate: 0.51, jobsExecuted: 312, totalIngestedDisplay: '18.4M', totalRejectedDisplay: '94.2K' },
  jobs: [
    { jobName: 'etl_customers',  source: 'CRM PostgreSQL',  runDate: '2026-03-07', rowsIngested: 1420000, rowsRejected: 8400,  rejectionRate: 0.59, status: 'degraded', durationDisplay: '12min 34s' },
    { jobName: 'load_warehouse', source: 'Staging S3',       runDate: '2026-03-07', rowsIngested: 8200000, rowsRejected: 41000, rejectionRate: 0.50, status: 'ok',       durationDisplay: '8min 12s'  },
    { jobName: 'aggregate_kpis', source: 'Trino + PG',       runDate: '2026-03-07', rowsIngested: 312000,  rowsRejected: 12300, rejectionRate: 3.94, status: 'failed',   durationDisplay: '—'         },
    { jobName: 'etl_products',   source: 'ERP API',          runDate: '2026-03-07', rowsIngested: 94000,   rowsRejected: 280,   rejectionRate: 0.30, status: 'ok',       durationDisplay: '4min 02s'  },
    { jobName: 'sync_crm',       source: 'Salesforce API',   runDate: '2026-03-07', rowsIngested: 28400,   rowsRejected: 120,   rejectionRate: 0.42, status: 'ok',       durationDisplay: '2min 51s'  },
  ],
  totalCount: 312
};
