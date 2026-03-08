import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe, DecimalPipe } from '@angular/common';
import { combineLatest } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-infra-trino',
  standalone: true,
  imports: [CommonModule, AsyncPipe, DecimalPipe],
  template: `
    @if (data$ | async; as data) {

      <div class="grid grid-3" style="margin-bottom:20px">
        <div class="kpi-card success">
          <div class="kpi-label">Statut cluster</div>
          <div class="kpi-number" style="color:var(--success)">
            {{ data.health.status === 'healthy' ? 'Opérationnel' : 'Dégradé' }}
          </div>
          <div class="kpi-delta neutral">v{{ data.health.version }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Workers actifs</div>
          <div class="kpi-number" style="color:var(--teal-dark)">{{ data.cluster.activeWorkers }}</div>
          <div class="kpi-delta neutral">Tous healthy</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Queries actives</div>
          <div class="kpi-number" style="color:var(--navy)">{{ data.cluster.runningQueries }}</div>
          <div class="kpi-delta neutral">{{ data.cluster.queuedQueries }} en attente</div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-bottom:20px">
        <div class="card">
          <div class="card-title">Ressources cluster</div>
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:4px">
              <span>CPU</span><span style="font-weight:600">{{ data.cluster.cpuPercent | number:'1.0-0' }}%</span>
            </div>
            <div class="bar-wrap" style="height:8px">
              <div class="bar-fill" [class]="getBarClass(data.cluster.cpuPercent)" [style.width.%]="data.cluster.cpuPercent"></div>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:4px">
              <span>Mémoire</span><span style="font-weight:600">{{ data.cluster.memoryPercent | number:'1.0-0' }}%</span>
            </div>
            <div class="bar-wrap" style="height:8px">
              <div class="bar-fill" [class]="getBarClass(data.cluster.memoryPercent)" [style.width.%]="data.cluster.memoryPercent"></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Statistiques 24h</div>
          <div class="drift-row">
            <span class="drift-label">Queries complétées</span>
            <span class="drift-count" style="color:var(--success)">{{ data.cluster.completedQueries24h | number }}</span>
          </div>
          <div class="drift-row">
            <span class="drift-label">Queries échouées</span>
            <span class="drift-count" style="color:var(--danger)">{{ data.cluster.failedQueries24h | number }}</span>
          </div>
          <div class="drift-row">
            <span class="drift-label">Durée médiane</span>
            <span class="drift-count">{{ data.cluster.medianQueryDurationSeconds | number:'1.1-1' }}s</span>
          </div>
          <div class="drift-row">
            <span class="drift-label">P95 durée</span>
            <span class="drift-count">{{ data.cluster.p95QueryDurationSeconds | number:'1.1-1' }}s</span>
          </div>
        </div>
      </div>

      <div class="section-title">Queries actives</div>
      <div class="card">
        @for (q of data.queries; track q.queryId) {
          <div class="query-row">
            <span class="pill" [class]="getQueryPillClass(q.state)">
              <span class="pill-dot"></span>{{ q.state }}
            </span>
            <span class="query-text">{{ q.queryText }}</span>
            <span class="query-meta">{{ q.user }}</span>
            <span class="query-meta">{{ q.elapsedDisplay }}</span>
            <span class="query-meta">{{ q.scannedDisplay }}</span>
          </div>
        } @empty {
          <div style="padding:16px;text-align:center;color:var(--muted);font-size:13px">
            Aucune query active
          </div>
        }
      </div>
    } @else {
      <div class="loading">Chargement des données Trino...</div>
    }
  `
})
export class TrinoComponent {
  private api = inject(ApiService);
  data$ = combineLatest({
    health:  this.api.getTrinoHealth(),
    cluster: this.api.getTrinoCluster(),
    queries: this.api.getTrinoQueries()
  });

  getBarClass(pct: number): string {
    if (pct > 80) return 'bar-hi';
    if (pct > 60) return 'bar-mid';
    return 'bar-ok';
  }

  getQueryPillClass(state: string): string {
    return state === 'RUNNING' ? 'pill-info' : state === 'QUEUED' ? 'pill-warning' : 'pill-muted';
  }
}
