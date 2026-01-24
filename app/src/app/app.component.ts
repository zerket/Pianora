import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

import { CONNECTION_SERVICE } from '@core/services/connection.provider';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { StatusBarComponent } from '@shared/components/status-bar/status-bar.component';
import { DebugPanelComponent } from '@shared/components/debug-panel/debug-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, StatusBarComponent, DebugPanelComponent],
  template: `
    <div class="app-container" [class.onboarding-mode]="isOnboarding()">
      @if (!isOnboarding()) {
        <app-status-bar />
      }

      <main class="main-content" [class.full-height]="isOnboarding()">
        <router-outlet />
      </main>

      @if (!isOnboarding()) {
        <app-navbar />
        <app-debug-panel />
      }
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

    .main-content.full-height {
      padding: 0;
      padding-bottom: 0;
    }

    .onboarding-mode .main-content {
      padding: 0;
    }
  `]
})
export class AppComponent implements OnInit {
  private connectionService = inject(CONNECTION_SERVICE);
  private router = inject(Router);

  currentRoute = signal<string>('');
  isOnboarding = computed(() => this.currentRoute().includes('onboarding'));

  ngOnInit(): void {
    // Check if onboarding is needed
    const onboardingCompleted = localStorage.getItem('pianora_onboarding_completed') === 'true';
    if (!onboardingCompleted && !window.location.pathname.includes('onboarding')) {
      this.router.navigate(['/onboarding']);
    }

    // Track current route
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.currentRoute.set(event.urlAfterRedirects);
    });

    // Auto-connect to controller
    this.connectionService.connect();
  }
}
