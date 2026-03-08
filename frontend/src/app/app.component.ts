import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="app-header">
      <div class="logo">
        <div class="logo-circle"></div>
        <span class="logo-text">Data <span>Platform</span> Monitoring</span>
      </div>
      <div class="header-right">
        <div class="refresh-badge">
          <span class="dot-live"></span>
          Actualisation toutes les 30s
        </div>
        <span class="env-badge">PRODUCTION</span>
      </div>
    </header>

    <nav class="tabs">
      <a class="tab" routerLink="/infra" routerLinkActive="active">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
        </svg>
        Infrastructure
      </a>
      <a class="tab" routerLink="/pipelines" routerLinkActive="active">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        Pipelines
      </a>
      <a class="tab" routerLink="/kpis" routerLinkActive="active">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
        Données / KPIs
      </a>
    </nav>

    <main class="main-content">
      <router-outlet />
    </main>
  `
})
export class AppComponent {}
