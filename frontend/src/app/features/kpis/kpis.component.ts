import { Component, inject, signal } from '@angular/core';
import { CommonModule, AsyncPipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-kpis',
  standalone: true,
  imports: [CommonModule, AsyncPipe, DecimalPipe, DatePipe, FormsModule],
  template: `
    <div class="content">
      <div class="toolbar">
        <label>Période</label>
        <input type="date" [(ngModel)]="fromDate" />
        <label>→</label>
        <input type="date" [(ngModel)]="toDate" />
        <select [(ngModel)]="selectedJob">
          <option value="">Tous les jobs</option>
        </select>
        <button class="btn" (click)="refresh()">Appliquer</button>
        <div class="spacer"></div>
        <span style="font-size:12px;color:var(--muted)">Actualisation 30s</span>
      </div>

      @if (data$ | async; as data) {
        <!-- KPI résumés -->
        <div class="grid grid-4" style="margin-bottom:20px">
          <div class="kpi-card success">
            <div class="kpi-label">Total lignes ingérées</div>
            <div class="kpi-number">{{ data.summary.totalIngestedDisplay }}</div>
            <div class="kpi-delta neutral">{{ data.summary.jobsExecuted }} jobs exécutés</div>
          </div>
          <div class="kpi-card danger">
            <div class="kpi-label">Total lignes rejetées</div>
            <div class="kpi-number" style="color:var(--danger)">{{ data.summary.totalRejectedDisplay }}</div>
          </div>
          <div class="kpi-card orange">
            <div class="kpi-label">Taux de rejet global</div>
            <div class="kpi-number" style="color:var(--orange)">{{ data.summary.rejectionRate | number:'1.2-2' }}%</div>
            <div class="kpi-delta neutral">Seuil alerte : 1%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Jobs exécutés</div>
            <div class="kpi-number">{{ data.summary.jobsExecuted }}</div>
          </div>
        </div>

        <!-- Table par job -->
        <div class="section-title">
          Détail par job Spark
          <span class="count">{{ data.totalCount }} exécutions</span>
        </div>
        <div class="card">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Date</th>
                <th>Lignes ingérées</th>
                <th>Lignes rejetées</th>
                <th>Taux de rejet</th>
                <th>Statut</th>
                <th>Durée</th>
              </tr>
            </thead>
            <tbody>
              @for (job of data.jobs; track job.jobName + job.runDate) {
                <tr>
                  <td>
                    <div class="cell-name">{{ job.jobName }}</div>
                    <div class="cell-sub">{{ job.source }}</div>
                  </td>
                  <td>{{ job.runDate | date:'dd/MM/yyyy' }}</td>
                  <td>{{ job.rowsIngested | number }}</td>
                  <td>{{ job.rowsRejected | number }}</td>
                  <td>
                    <div class="rate-bar">
                      <div class="rate-track">
                        <div class="rate-fill" [class]="getRateClass(job.rejectionRate)"
                             [style.width.%]="getRateWidth(job.rejectionRate)"></div>
                      </div>
                      <span class="rate-label" [style.color]="getRateColor(job.rejectionRate)">
                        {{ job.rejectionRate | number:'1.2-2' }}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="pill"
                          [class.pill-success]="job.status === 'ok'"
                          [class.pill-warning]="job.status === 'degraded'"
                          [class.pill-danger]="job.status === 'failed'">
                      <span class="pill-dot"></span>
                      {{ job.status === 'ok' ? 'OK' : job.status === 'degraded' ? 'Dégradé' : 'Échec' }}
                    </span>
                  </td>
                  <td>{{ job.durationDisplay }}</td>
                </tr>
              } @empty {
                <tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">Aucune donnée</td></tr>
              }
            </tbody>
          </table>
          <div style="padding:10px 14px;font-size:12px;color:var(--muted);border-top:1px solid var(--border-lt)">
            {{ data.jobs.length }} / {{ data.totalCount }} ·
            <a href="#" style="color:var(--teal-dark)">Charger plus</a>
          </div>
        </div>
      } @else {
        <div class="loading">Chargement des KPIs...</div>
      }
    </div>
  `
})
export class KpisComponent {
  private api = inject(ApiService);

  fromDate    = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  toDate      = new Date().toISOString().slice(0, 10);
  selectedJob = '';

  data$ = this.api.getKpis(this.fromDate, this.toDate);

  refresh() {
    this.data$ = this.api.getKpis(this.fromDate, this.toDate, this.selectedJob || undefined);
  }

  getRateClass(rate: number): string {
    if (rate > 1)    return 'rate-high';
    if (rate > 0.5)  return 'rate-mid';
    return 'rate-low';
  }

  getRateWidth(rate: number): number {
    return Math.min(100, rate * 50);
  }

  getRateColor(rate: number): string {
    if (rate > 1)    return 'var(--danger)';
    if (rate > 0.5)  return 'var(--warning)';
    return 'var(--success)';
  }
}
