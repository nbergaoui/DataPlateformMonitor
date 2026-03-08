import { Component, inject, signal } from '@angular/core';
import { CommonModule, AsyncPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-pipelines',
  standalone: true,
  imports: [CommonModule, AsyncPipe, DatePipe, FormsModule],
  template: `
    <div class="content">
      <!-- Toolbar -->
      <div class="toolbar">
        <label>Du</label>
        <input type="date" [(ngModel)]="fromDate" />
        <label>Au</label>
        <input type="date" [(ngModel)]="toDate" />
        <select [(ngModel)]="selectedDag">
          <option value="">Tous les pipelines</option>
          @for (dag of knownDags(); track dag) {
            <option [value]="dag">{{ dag }}</option>
          }
        </select>
        <button class="btn" (click)="refresh()">Appliquer</button>
        <div class="spacer"></div>
        @if (data$ | async; as data) {
          <span style="font-size:13px;color:var(--muted)">{{ data.summary.totalRuns }} exécutions</span>
        }
      </div>

      @if (data$ | async; as data) {
        <!-- KPIs -->
        <div class="grid grid-4" style="margin-bottom:20px">
          <div class="kpi-card">
            <div class="kpi-label">Total</div>
            <div class="kpi-number">{{ data.summary.totalRuns }}</div>
          </div>
          <div class="kpi-card success">
            <div class="kpi-label">Succès</div>
            <div class="kpi-number" style="color:var(--success)">{{ data.summary.successRuns }}</div>
            <div class="kpi-delta neutral">{{ data.summary.successRate | number:'1.1-1' }}%</div>
          </div>
          <div class="kpi-card danger">
            <div class="kpi-label">En échec</div>
            <div class="kpi-number" style="color:var(--danger)">{{ data.summary.failedRuns }}</div>
          </div>
          <div class="kpi-card orange">
            <div class="kpi-label">En cours</div>
            <div class="kpi-number" style="color:var(--orange)">{{ data.summary.runningRuns }}</div>
          </div>
        </div>

        <!-- Heatmap -->
        <div class="section-title" style="margin-bottom:8px">Activité par DAG (7 derniers jours)</div>
        <div class="card" style="margin-bottom:20px">
          <div style="display:flex;gap:20px">
            <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--muted);padding-top:24px;min-width:160px">
              @for (row of data.heatmap; track row.dagId) {
                <span>{{ row.dagId }}</span>
              }
            </div>
            <div>
              <div style="display:flex;gap:8px;margin-bottom:6px">
                @for (day of data.heatmap[0].days; track day.date) {
                  <span style="font-size:11px;color:var(--muted);width:22px;text-align:center">
                    {{ day.date | date:'EEE' | slice:0:1 }}
                  </span>
                }
              </div>
              <div style="display:flex;flex-direction:column;gap:8px">
                @for (row of data.heatmap; track row.dagId) {
                  <div style="display:flex;gap:8px">
                    @for (cell of row.days; track cell.date) {
                      <div style="width:22px;height:22px;border-radius:3px"
                           [style.background]="getCellColor(cell.state)"
                           [title]="row.dagId + ' · ' + cell.date + ' · ' + cell.state">
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;margin-left:16px">
              <div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;border-radius:3px;background:#bbf7d0"></div> Succès</div>
              <div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;border-radius:3px;background:#fecaca"></div> Échec</div>
              <div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;border-radius:3px;background:#bfdbfe"></div> En cours</div>
              <div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;border-radius:3px;background:var(--border)"></div> Non exécuté</div>
            </div>
          </div>
        </div>

        <!-- Failed runs -->
        <div class="section-title">
          DAGs en échec <span class="count">{{ data.failedRuns.length }} exécutions</span>
        </div>
        <div class="card">
          <table>
            <thead>
              <tr><th>DAG</th><th>Run ID</th><th>Date</th><th>Durée</th><th>Tâche en échec</th><th>Erreur</th></tr>
            </thead>
            <tbody>
              @for (run of data.failedRuns; track run.runId) {
                <tr>
                  <td><div class="cell-name">{{ run.dagId }}</div></td>
                  <td style="font-size:11px;color:var(--muted)">{{ run.runId }}</td>
                  <td>{{ run.executionDate | date:'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ run.durationMinutes }}min</td>
                  <td style="color:var(--danger);font-size:12px">{{ run.failedTask }}</td>
                  <td style="font-size:12px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    {{ run.errorMessage }}
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">Aucun échec sur la période</td></tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="loading">Chargement des pipelines...</div>
      }
    </div>
  `
})
export class PipelinesComponent {
  private api = inject(ApiService);

  fromDate    = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  toDate      = new Date().toISOString().slice(0, 10);
  selectedDag = '';
  knownDags   = signal<string[]>([]);

  data$ = this.api.getPipelines(this.fromDate, this.toDate);

  refresh() {
    this.data$ = this.api.getPipelines(this.fromDate, this.toDate, this.selectedDag || undefined);
  }

  getCellColor(state: string): string {
    const map: Record<string, string> = {
      success: '#bbf7d0', failed: '#fecaca',
      running: '#bfdbfe', none: 'var(--border)'
    };
    return map[state] ?? 'var(--border)';
  }
}
