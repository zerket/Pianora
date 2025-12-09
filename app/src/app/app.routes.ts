import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'play',
    pathMatch: 'full'
  },
  {
    path: 'play',
    loadComponent: () => import('@features/play/play.component').then(m => m.PlayComponent),
    title: 'Play - Piano LED'
  },
  {
    path: 'learn',
    loadComponent: () => import('@features/learn/learn.component').then(m => m.LearnComponent),
    title: 'Learn - Piano LED'
  },
  {
    path: 'library',
    loadComponent: () => import('@features/library/library.component').then(m => m.LibraryComponent),
    title: 'Library - Piano LED'
  },
  {
    path: 'settings',
    loadComponent: () => import('@features/settings/settings.component').then(m => m.SettingsComponent),
    title: 'Settings - Piano LED'
  },
  {
    path: 'calibration',
    loadComponent: () => import('@features/settings/calibration/calibration.component').then(m => m.CalibrationComponent),
    title: 'Calibration - Piano LED'
  },
  {
    path: '**',
    redirectTo: 'play'
  }
];
