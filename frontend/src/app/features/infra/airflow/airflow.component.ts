import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe, DecimalPipe, DatePipe } from '@angular/common';
import { combineLatest } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-infra-airflow',
  standalone: true,
  imports: [CommonModule, AsyncPipe, DecimalPipe, DatePipe],
  template: `
    @if (data$ | async; as data) {

      <!-- Bannière d'alerte -->
      @if (data.health.tasksScheduled > 10 || data.health.tasksZombie > 0) {
        <div class="alert-banner critical" style="margin-bottom:16px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
            <div>
              <div class="alert-title" style="color:var(--danger)">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Accumulation de tâches "scheduled" — executor saturé
              </div>
              <div class="alert-subtitle">
                {{ data.health.tasksScheduled }} tâches bloquées · {{ data.health.tasksZombie }} zombies
                occupent des slots · open_slots = {{ data.health.openSlots }}/{{ data.health.parallelism }}
              </div>
            </div>
            <button class="btn btn-danger" style="font-size:12px;flex-shrink:0">
              Restart schedulers
            </button>
          </div>
        </div>
      }

      <!-- Métriques -->
      <div class="metrics-strip" style="margin-bottom:20px">
        <div class="metric-cell">
          <div class="m-label">Scheduled bloquées</div>
          <div class="m-value" [style.color]="data.health.tasksScheduled > 10 ? 'var(--danger)' : 'var(--success)'">
            {{ data.health.tasksScheduled }}
          </div>
        </div>
        <div class="metric-cell">
          <div class="m-label">Running zombies</div>
          <div class="m-value" [style.color]="data.health.tasksZombie > 0 ? 'var(--orange)' : 'var(--success)'">
            {{ data.health.tasksZombie }}
          </div>
        </div>
        <div class="metric-cell">
          <div class="m-label">Open slots</div>
          <div class="m-value" [style.color]="data.health.openSlots < 10 ? 'var(--danger)' : 'var(--navy)'">
            {{ data.health.openSlots }} / {{ data.health.parallelism }}
          </div>
        </div>
        <div class="metric-cell">
          <div class="m-label">Critical section</div>
          <div class="m-value" [style.color]="data.health.criticalSectionDurationSeconds > 5 ? 'var(--warning)' : 'var(--success)'">
            {{ data.health.criticalSectionDurationSeconds | number:'1.1-1' }}s
          </div>
        </div>
        <div class="metric-cell">
          <div class="m-label">DB conn. pool</div>
          <div class="m-value" [style.color]="data.health.dbConnectionPoolPercent > 80 ? 'var(--warning)' : 'var(--navy)'">
            {{ data.health.dbConnectionPoolPercent | number:'1.0-0' }}%
          </div>
        </div>
        <div class="metric-cell">
          <div class="m-label">Heartbeat</div>
          <div class="m-value" [style.color]="data.health.heartbeatSeconds < 30 ? 'var(--success)' : 'var(--danger)'">
            {{ data.health.heartbeatSeconds | number:'1.0-0' }}s
          </div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-bottom:20px">

        <!-- Répartition tâches -->
        <div class="card">
          <div class="card-title">Répartition instantanée des tâches</div>
          <div class="drift-row">
            <span class="drift-label"><strong style="color:var(--warning)">scheduled</strong> — bloquées</span>
            <div class="drift-bar-wrap">
              <div class="drift-bar-fill" [style.width.%]="getPercent(data.health.tasksScheduled, 200)" style="background:var(--warning)"></div>
            </div>
            <span class="drift-count" style="color:var(--warning)">{{ data.health.tasksScheduled }}</span>
          </div>
          <div class="drift-row">
            <span class="drift-label"><strong>running</strong> — réels K8s</span>
            <div class="drift-bar-wrap">
              <div class="drift-bar-fill" [style.width.%]="getPercent(data.health.tasksRunning - data.health.tasksZombie, 200)" style="background:var(--teal)"></div>
            </div>
            <span class="drift-count" style="color:var(--teal-dark)">{{ data.health.tasksRunning - data.health.tasksZombie }}</span>
          </div>
          <div class="drift-row">
            <span class="drift-label"><strong style="color:var(--danger)">running</strong> — zombies</span>
            <div class="drift-bar-wrap">
              <div class="drift-bar-fill" [style.width.%]="getPercent(data.health.tasksZombie, 200)" style="background:var(--danger)"></div>
            </div>
            <span class="drift-count" style="color:var(--danger)">{{ data.health.tasksZombie }}</span>
          </div>
          <div class="drift-row">
            <span class="drift-label"><strong>queued</strong> — soumises executor</span>
            <div class="drift-bar-wrap">
              <div class="drift-bar-fill" [style.width.%]="getPercent(data.health.tasksQueued, 200)" style="background:var(--success)"></div>
            </div>
            <span class="drift-count" style="color:var(--muted)">{{ data.health.tasksQueued }}</span>
          </div>
          @if (data.health.tasksZombie > 0) {
            <div style="margin-top:10px;padding:8px 12px;background:var(--teal-light);border-radius:6px;font-size:12px">
              Sans les {{ data.health.tasksZombie }} zombies →
              <strong style="color:var(--success)">{{ data.health.openSlots + data.health.tasksZombie }} slots libres</strong>
            </div>
          }
        </div>

        <!-- DB Connection pool -->
        <div class="card">
          <div class="card-title">
            Connection pool DB (Airflow metastore)
            @if (data.health.dbConnectionPoolPercent > 80) {
              <span class="pill pill-warning" style="font-size:10px">Intermittent</span>
            }
          </div>
          <div style="display:flex;align-items:center;gap:20px;margin-bottom:14px">
            <div style="text-align:center">
              <div style="font-size:28px;font-weight:800"
                   [style.color]="data.health.dbConnectionPoolPercent > 80 ? 'var(--warning)' : 'var(--success)'">
                {{ data.health.dbConnectionPoolPercent | number:'1.0-0' }}%
              </div>
              <div style="font-size:11px;color:var(--muted)">Utilisation</div>
            </div>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:4px">
                <span>Connexions actives</span>
                <span style="font-weight:600">{{ data.health.dbConnectionPoolPercent | number:'1.0-0' }} / 100</span>
              </div>
              <div class="bar-wrap" style="height:8px">
                <div class="bar-fill" [class]="getPoolBarClass(data.health.dbConnectionPoolPercent)"
                     [style.width.%]="data.health.dbConnectionPoolPercent"></div>
              </div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--muted)">
            La saturation est <strong>intermittente</strong> : varie selon le volume de DAGs
            évalués par le scheduler dans la critical section ce jour-là.
          </div>
        </div>
      </div>

      <!-- Zombies table -->
      @if (data.zombies.length > 0) {
        <div class="section-title">
          Tâches zombies
          <span class="count">{{ data.zombies.length }} tâches · bloquent {{ data.zombies.length }} slots</span>
        </div>
        <div class="card" style="margin-bottom:20px">
          <table>
            <thead>
              <tr>
                <th>DAG · Tâche</th>
                <th>Run ID</th>
                <th>Running depuis</th>
                <th>Pod attendu</th>
                <th>Cause</th>
              </tr>
            </thead>
            <tbody>
              @for (z of data.zombies; track z.runId) {
                <tr class="zombie-row">
                  <td>
                    <div class="cell-name">{{ z.dagId }}</div>
                    <div class="cell-sub">{{ z.taskId }}</div>
                  </td>
                  <td style="font-size:12px;color:var(--muted)">{{ z.runId }}</td>
                  <td style="color:var(--danger);font-weight:700">{{ z.runningMinutes | number:'1.0-0' }}min</td>
                  <td style="font-size:12px;font-family:monospace">{{ z.expectedPodName }}</td>
                  <td><span class="pill pill-orange">{{ z.disappearanceReason }}</span></td>
                </tr>
              }
            </tbody>
          </table>
          <div style="padding:10px 14px;font-size:12px;color:var(--muted);border-top:1px solid var(--border-lt);display:flex;justify-content:flex-end">
            <button class="btn btn-danger" style="font-size:12px">
              Marquer tous failed — libérer {{ data.zombies.length }} slots
            </button>
          </div>
        </div>
      }

      <!-- Historique restarts -->
      <div class="section-title">
        Historique restarts scheduler
        <span class="count">{{ data.history.length }} entrées</span>
      </div>
      <div class="card">
        <div style="padding:10px 12px;background:var(--info-lt);border-radius:6px;font-size:12px;margin-bottom:14px">
          <strong>Config recommandée :</strong>
          <code>zombie_threshold=300</code> · <code>worker_pods_creation_batch_size=16</code>
        </div>
        <table>
          <thead>
            <tr><th>Date</th><th>Déclencheur</th><th>Scheduled bloquées</th><th>Zombies</th><th>Résolution</th><th>Uptime préc.</th></tr>
          </thead>
          <tbody>
            @for (r of data.history; track r.restartDate) {
              <tr>
                <td>{{ r.restartDate | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ r.trigger }}</td>
                <td [style.color]="r.scheduledBlockedCount > 20 ? 'var(--danger)' : 'var(--warning)'">
                  {{ r.scheduledBlockedCount }}
                </td>
                <td>{{ r.zombieCount }}</td>
                <td [style.color]="r.resolutionSeconds ? 'var(--success)' : 'var(--muted)'">
                  {{ r.resolutionSeconds ? (r.resolutionSeconds / 60 | number:'1.0-0') + 'min' : '—' }}
                </td>
                <td>{{ r.uptimeDays }} jours</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="loading">Chargement des données Airflow...</div>
    }
  `
})
export class AirflowComponent {
  private api = inject(ApiService);

  data$ = combineLatest({
    health:  this.api.getSchedulerHealth(),
    zombies: this.api.getZombies(),
    history: this.api.getRestartHistory()
  });

  getPercent(value: number, max: number): number {
    return Math.min(100, Math.round(value / max * 100));
  }

  getPoolBarClass(pct: number): string {
    if (pct > 90) return 'bar-hi';
    if (pct > 75) return 'bar-mid';
    return 'bar-ok';
  }
}
