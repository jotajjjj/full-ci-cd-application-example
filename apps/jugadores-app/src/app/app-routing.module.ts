import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'player-list',
    pathMatch: 'full'
  },
  {
    path: 'player-list',
    loadChildren: () => import('./pages/player-list/player-list.page').then( m => m.PlayerListPage)
  },
  {
    path: 'player-create',
    loadChildren: () => import('./pages/player-create/player-create.page').then( m => m.PlayerCreatePage)
  },
  {
    path: 'player-edit/:id',
    loadChildren: () => import('./pages/player-edit/player-edit.page').then( m => m.PlayerEditPage)
  },
  {
    path: 'player-search',
    loadChildren: () => import('./pages/player-search/player-search.page').then( m => m.PlayerSearchPage)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }