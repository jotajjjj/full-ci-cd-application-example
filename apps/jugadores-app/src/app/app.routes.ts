import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'player-list',
    pathMatch: 'full'
  },
  {
    path: 'player-list',
    loadComponent: () => import('./pages/player-list/player-list.page').then(m => m.PlayerListPage)
  },
  {
    path: 'player-create',
    loadComponent: () => import('./pages/player-create/player-create.page').then(m => m.PlayerCreatePage)
  },
  {
    path: 'player-edit/:id',
    loadComponent: () => import('./pages/player-edit/player-edit.page').then(m => m.PlayerEditPage)
  },
  {
    path: 'player-search',
    loadComponent: () => import('./pages/player-search/player-search.page').then(m => m.PlayerSearchPage)
  }
];