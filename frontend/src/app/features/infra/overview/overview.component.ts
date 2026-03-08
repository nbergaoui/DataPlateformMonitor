import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-infra-overview',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  template: `
    @if (overview$ | async; as data) {
      <!-- Service cards -->
      <div class="grid grid-3" style="margin-bottom:20px">

        <div class="svc-card" [class.degraded]="data.airflow.tasksScheduled > 10">
          <div>
            <div class="svc-name">Airflow</div>
            <div class="svc-status" [class.up]="data.airflow.tasksScheduled <= 10"
                 [class.down]="data.airflow.tasksScheduled > 10">
              {{ data.airflow.tasksScheduled > 10 ? 'Scheduler dégradé' : 'Opérationnel' }}
            </div>
            <div class="svc-detail">KubernetesExecutor · HA</div>
            <div class="pills-row">
              @if (data.airflow.tasksScheduled > 10) {
                <span class="pill pill-danger">
                  <span class="pill-dot"></span>{{ data.airflow.tasksScheduled }} tasks bloquées
                </span>
              } @else {
                <span class="pill pill-success"><span class="pill-dot"></span>OK</span>
              }
            </div>
          </div>
          <div class="svc-icon" [style.background]="data.airflow.tasksScheduled > 10 ? 'var(--danger-lt)' : 'var(--success-lt)'">
            @if (data.airflow.tasksScheduled > 10) {
              <svg width="22" height="22" fill="none" stroke="var(--danger)" stroke-width="2" viewBox="0 0 24 24">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            } @else {
              <svg width="22" height="22" fill="none" stroke="var(--success)" stroke-width="2" viewBox="0 0 24 24">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            }
          </div>
        </div>

        <div class="svc-card">
          <div>
            <div class="svc-name">Trino</div>
            <div class="svc-status up">{{ data.trino.status === 'healthy' ? 'Opérationnel' : 'Dégradé' }}</div>
            <div class="svc-detail">v{{ data.trino.version }}</div>
            <div class="pills-row">
              <span class="pill pill-success"><span class="pill-dot"></span>Coordinator</span>
            </div>
          </div>
          <div class="svc-icon" style="background:var(--success-lt)">
            <svg width="22" height="22" fill="none" stroke="var(--success)" stroke-width="2" viewBox="0 0 24 24">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
        </div>

        <div class="svc-card" [class.warn-card]="data.kubernetes.pressureNodes > 0">
          <div>
            <div class="svc-name">Kubernetes</div>
            <div class="svc-status" [class.up]="data.kubernetes.status === 'ok'"
                 [class.warn]="data.kubernetes.status === 'warning'">
              {{ data.kubernetes.status === 'ok' ? 'Opérationnel' : 'Attention' }}
            </div>
            <div class="svc-detail">{{ data.kubernetes.pressureNodes }} nœud(s) sous pression</div>
            <div class="pills-row">
              <span class="pill pill-success"><span class="pill-dot"></span>{{ data.kubernetes.readyNodes }} Ready</span>
              @if (data.kubernetes.pressureNodes > 0) {
                <span class="pill pill-warning"><span class="pill-dot"></span>{{ data.kubernetes.pressureNodes }} Pressure</span>
              }
            </div>
          </div>
          <div class="svc-icon" style="background:var(--warning-lt)">
            <svg width="22" height="22" fill="none" stroke="var(--warning)" stroke-width="2" viewBox="0 0 24 24">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- KPI résumés -->
      <div class="grid grid-4">
        <div class="kpi-card danger">
          <div class="kpi-label">Tasks "scheduled" bloquées</div>
          <div class="kpi-number" style="color:var(--danger)">{{ data.airflow.tasksScheduled }}</div>
        </div>
        <div class="kpi-card orange">
          <div class="kpi-label">Running zombies (pod absent)</div>
          <div class="kpi-number" style="color:var(--orange)">{{ data.airflow.tasksZombie }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Open slots executor</div>
          <div class="kpi-number" style="color:var(--teal-dark)">
            {{ data.airflow.openSlots }} / {{ data.airflow.parallelism }}
          </div>
        </div>
        <div class="kpi-card success">
          <div class="kpi-label">Nœuds K8s Ready</div>
          <div class="kpi-number" style="color:var(--success)">{{ data.kubernetes.readyNodes }}</div>
        </div>
      </div>
    } @else {
      <div class="loading">Chargement...</div>
    }
  `
})
export class OverviewComponent {
  private api = inject(ApiService);
  overview$ = this.api.getOverview();
}
