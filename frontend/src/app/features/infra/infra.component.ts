import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverviewComponent } from './overview/overview.component';
import { KubernetesComponent } from './kubernetes/kubernetes.component';
import { AirflowComponent } from './airflow/airflow.component';
import { TrinoComponent } from './trino/trino.component';

type SubTab = 'overview' | 'kubernetes' | 'airflow' | 'trino';

@Component({
  selector: 'app-infra',
  standalone: true,
  imports: [CommonModule, OverviewComponent, KubernetesComponent, AirflowComponent, TrinoComponent],
  template: `
    <nav class="subtabs">
      <button class="subtab" [class.active]="activeTab() === 'overview'"
              (click)="activeTab.set('overview')">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
        </svg>
        Vue d'ensemble
      </button>
      <button class="subtab" [class.active]="activeTab() === 'kubernetes'"
              (click)="activeTab.set('kubernetes')">
        <span class="dot dot-warn"></span>Kubernetes
      </button>
      <button class="subtab" [class.active]="activeTab() === 'airflow'"
              (click)="activeTab.set('airflow')">
        <span class="dot dot-err"></span>Airflow — Scheduler
      </button>
      <button class="subtab" [class.active]="activeTab() === 'trino'"
              (click)="activeTab.set('trino')">
        <span class="dot dot-ok"></span>Trino
      </button>
    </nav>

    <div class="content">
      @switch (activeTab()) {
        @case ('overview')    { <app-infra-overview /> }
        @case ('kubernetes')  { <app-infra-kubernetes /> }
        @case ('airflow')     { <app-infra-airflow /> }
        @case ('trino')       { <app-infra-trino /> }
      }
    </div>
  `
})
export class InfraComponent {
  activeTab = signal<SubTab>('overview');
}
