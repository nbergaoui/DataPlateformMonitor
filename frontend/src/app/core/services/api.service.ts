import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, timer, switchMap, shareReplay, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  SchedulerHealth, ZombieTask, SchedulerRestart,
  NodeStatus, SparkPod, ClusterOverview,
  TrinoHealth, TrinoClusterStats, TrinoQuery,
  PipelinesResponse, KpiResponse
} from '../models/models';

import {
  MOCK_OVERVIEW, MOCK_SCHEDULER_HEALTH, MOCK_ZOMBIES, MOCK_RESTART_HISTORY,
  MOCK_NODES, MOCK_SPARK_PODS, MOCK_TRINO_HEALTH, MOCK_TRINO_CLUSTER,
  MOCK_TRINO_QUERIES, MOCK_PIPELINES, MOCK_KPIS
} from './mock-data';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;
  private poll = environment.pollIntervalMs;

  // ── Helper : polling avec fallback mock si backend absent ────────────────────
  private polled<T>(path: string, fallback: T, params?: HttpParams): Observable<T> {
    return timer(0, this.poll).pipe(
      switchMap(() =>
        this.http.get<T>(`${this.base}/${path}`, { params }).pipe(
          catchError(() => of(fallback))
        )
      ),
      shareReplay(1)
    );
  }

  // ── Infra : Overview ─────────────────────────────────────────────────────────
  getOverview(): Observable<ClusterOverview> {
    return this.polled<ClusterOverview>('api/infra/overview', MOCK_OVERVIEW);
  }

  // ── Infra : Kubernetes ───────────────────────────────────────────────────────
  getNodes(): Observable<NodeStatus[]> {
    return this.polled<NodeStatus[]>('api/infra/kubernetes/nodes', MOCK_NODES);
  }

  getSparkPods(): Observable<SparkPod[]> {
    return this.polled<SparkPod[]>('api/infra/kubernetes/spark-pods', MOCK_SPARK_PODS);
  }

  // ── Infra : Airflow ──────────────────────────────────────────────────────────
  getSchedulerHealth(): Observable<SchedulerHealth> {
    return this.polled<SchedulerHealth>('api/infra/airflow/scheduler-health', MOCK_SCHEDULER_HEALTH);
  }

  getZombies(): Observable<ZombieTask[]> {
    return this.polled<ZombieTask[]>('api/infra/airflow/zombies', MOCK_ZOMBIES);
  }

  getRestartHistory(): Observable<SchedulerRestart[]> {
    return this.http.get<SchedulerRestart[]>(`${this.base}/api/infra/airflow/restart-history`).pipe(
      catchError(() => of(MOCK_RESTART_HISTORY))
    );
  }

  // ── Infra : Trino ────────────────────────────────────────────────────────────
  getTrinoHealth(): Observable<TrinoHealth> {
    return this.polled<TrinoHealth>('api/infra/trino/health', MOCK_TRINO_HEALTH);
  }

  getTrinoCluster(): Observable<TrinoClusterStats> {
    return this.polled<TrinoClusterStats>('api/infra/trino/cluster', MOCK_TRINO_CLUSTER);
  }

  getTrinoQueries(): Observable<TrinoQuery[]> {
    return this.polled<TrinoQuery[]>('api/infra/trino/queries', MOCK_TRINO_QUERIES);
  }

  // ── Pipelines ────────────────────────────────────────────────────────────────
  getPipelines(from: string, to: string, dagId?: string): Observable<PipelinesResponse> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (dagId) params = params.set('dagId', dagId);
    return this.polled<PipelinesResponse>('api/pipelines', MOCK_PIPELINES, params);
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  getKpis(from: string, to: string, jobName?: string, page = 1): Observable<KpiResponse> {
    let params = new HttpParams().set('from', from).set('to', to).set('page', page);
    if (jobName) params = params.set('jobName', jobName);
    return this.polled<KpiResponse>('api/kpis', MOCK_KPIS, params);
  }
}
