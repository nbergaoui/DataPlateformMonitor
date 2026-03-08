import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { combineLatest } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-infra-kubernetes',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  template: `
    @if (data$ | async; as data) {
      <!-- Nodes -->
      <div class="section-title">Nœuds du cluster <span class="count">{{ data.nodes.length }} nœuds</span></div>
      <div class="card" style="margin-bottom:20px">
        <div class="node-grid">
          @for (node of data.nodes; track node.name) {
            <div class="node-item"
                 [style.border-color]="node.status === 'Pressure' ? 'var(--warning)' : 'var(--border)'"
                 [style.background]="node.status === 'Pressure' ? '#fffdf0' : 'var(--bg)'">
              <div class="node-name">
                {{ node.name }}
                <span class="pill"
                      [class.pill-success]="node.status === 'Ready'"
                      [class.pill-warning]="node.status === 'Pressure'"
                      [class.pill-danger]="node.status === 'NotReady'"
                      style="font-size:10px">
                  {{ node.status }}
                </span>
              </div>
              <div class="node-meta"><span>CPU</span><span>{{ node.cpuPercent }}%</span></div>
              <div class="bar-wrap">
                <div class="bar-fill" [class]="getBarClass(node.cpuPercent)" [style.width.%]="node.cpuPercent"></div>
              </div>
              <div class="node-meta"><span>Mém.</span><span>{{ node.memoryPercent }}%</span></div>
              <div class="bar-wrap">
                <div class="bar-fill" [class]="getBarClass(node.memoryPercent)" [style.width.%]="node.memoryPercent"></div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Spark pods -->
      <div class="section-title">
        Jobs Spark sur Kubernetes
        <span class="count">{{ data.pods.length }} pods</span>
      </div>
      <div class="spark-list">
        @for (pod of data.pods; track pod.name) {
          <div class="spark-row"
               [style.border-color]="getPodBorderColor(pod.phase)"
               [style.background]="getPodBg(pod.phase)">
            <span class="pill" [class]="getPodPillClass(pod.phase)">
              <span class="pill-dot"></span>{{ pod.phase }}
            </span>
            <span class="spark-name">{{ pod.name }}</span>
            <span class="spark-meta">{{ pod.nodeName || '—' }}</span>
            <span class="spark-meta">{{ pod.startTimeDisplay }}</span>
            <span class="spark-meta">{{ pod.cpuRequest }} · {{ pod.memoryRequest }}</span>
            @if (pod.terminationReason) {
              <span class="pill pill-danger" style="font-size:11px">{{ pod.terminationReason }}</span>
            }
          </div>
        }
      </div>
    } @else {
      <div class="loading">Chargement des données Kubernetes...</div>
    }
  `
})
export class KubernetesComponent {
  private api = inject(ApiService);
  data$ = combineLatest({ nodes: this.api.getNodes(), pods: this.api.getSparkPods() });

  getBarClass(pct: number): string {
    if (pct > 80) return 'bar-hi';
    if (pct > 60) return 'bar-mid';
    return 'bar-ok';
  }

  getPodPillClass(phase: string): string {
    const map: Record<string, string> = {
      Running: 'pill-success', Pending: 'pill-warning',
      Failed: 'pill-danger', Completed: 'pill-muted', Unknown: 'pill-muted'
    };
    return map[phase] ?? 'pill-muted';
  }

  getPodBorderColor(phase: string): string {
    const map: Record<string, string> = {
      Failed: 'var(--danger)', Pending: 'var(--warning)'
    };
    return map[phase] ?? 'var(--border)';
  }

  getPodBg(phase: string): string {
    const map: Record<string, string> = {
      Failed: '#fff5f5', Pending: '#fffdf0'
    };
    return map[phase] ?? 'var(--bg)';
  }
}
