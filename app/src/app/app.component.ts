import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { CONNECTION_SERVICE } from '@core/services/connection.provider';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { StatusBarComponent } from '@shared/components/status-bar/status-bar.component';
import { DebugPanelComponent } from '@shared/components/debug-panel/debug-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, StatusBarComponent, DebugPanelComponent],
  template: `
    <div class="app-container">
      <app-status-bar />

      <main class="main-content">
        <router-outlet />
      </main>

      <app-navbar />
      <app-debug-panel />
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      max-width: 100vw;
      overflow-x: hidden;
    }

    .main-content {
      flex: 1;
      padding: var(--spacing-md);
      padding-bottom: calc(60px + var(--spacing-md) + env(safe-area-inset-bottom));
      overflow-y: auto;
    }
  `]
})
export class AppComponent implements OnInit {
  private connectionService = inject(CONNECTION_SERVICE);

  ngOnInit(): void {
    // Auto-connect to controller
    this.connectionService.connect();
  }
}
