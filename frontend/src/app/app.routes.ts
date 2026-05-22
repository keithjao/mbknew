import { Routes } from '@angular/router';
import { Menu } from './features/menu/menu';
import { Merchandise } from './features/merchandise/merchandise';
import { Rewards } from './features/rewards/rewards';

export const routes: Routes = [
  {
    path: '',
    component: Menu
  },
  {
    path: 'merchandise',
    component: Merchandise
  },
  {
    path: 'rewards',
    component: Rewards
  },
  {
    path: 'account',
    loadComponent: () => import('./features/account/account').then(m => m.Account)
  },
  {
    path: 'clock-in-out',
    loadComponent: () => import('./features/clock-in-out/clock-in-out').then(m => m.ClockInOut)
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin-layout').then(m => m.AdminLayout),
    loadChildren: () => import('./admin/admin.routes').then(m => m.adminRoutes)
  }
];
