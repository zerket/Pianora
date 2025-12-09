import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      @for (item of navItems; track item.path) {
        <a
          [routerLink]="item.path"
          routerLinkActive="active"
          class="nav-item"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styles: [`
    .navbar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      height: 60px;
      background-color: var(--color-bg-secondary);
      border-top: 1px solid var(--color-border);
      padding-bottom: env(safe-area-inset-bottom);
      z-index: 100;
    }

    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: var(--spacing-xs) var(--spacing-md);
      color: var(--color-text-secondary);
      text-decoration: none;
      transition: color var(--transition-fast);
      min-width: 64px;

      &:hover, &.active {
        color: var(--color-accent);
      }

      &.active .nav-icon {
        transform: scale(1.1);
      }
    }

    .nav-icon {
      font-size: 1.5rem;
      transition: transform var(--transition-fast);
    }

    .nav-label {
      font-size: 0.7rem;
      font-weight: 500;
    }
  `]
})
export class NavbarComponent {
  navItems: NavItem[] = [
    { path: '/play', label: 'Play', icon: '🎹' },
    { path: '/learn', label: 'Learn', icon: '📚' },
    { path: '/library', label: 'Library', icon: '🎵' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
  ];
}
