import { Routes } from '@angular/router';
import { staffFeatureGuard } from './guards/staff-feature.guard';

export const adminRoutes: Routes = [
  { path: '', redirectTo: 'access', pathMatch: 'full' },
  {
    path: 'access',
    loadComponent: () => import('./access/admin-access').then(m => m.AdminAccess)
  },
  {
    path: 'schedule-center',
    canActivate: [staffFeatureGuard],
    data: { feature: 'schedule-center' },
    loadComponent: () => import('./schedule-center/schedule-center').then(m => m.ScheduleCenter)
  },
  {
    path: 'pos',
    canActivate: [staffFeatureGuard],
    data: { feature: 'pos' },
    loadComponent: () => import('./pos/pos').then(m => m.Pos)
  },
  {
    path: 'queue-board',
    canActivate: [staffFeatureGuard],
    data: { feature: 'queue-board' },
    loadComponent: () => import('./queue-board/queue-board').then(m => m.QueueBoard)
  },
  {
    path: 'clock-in-out',
    canActivate: [staffFeatureGuard],
    data: { feature: 'clock-in-out' },
    loadComponent: () => import('../features/clock-in-out/clock-in-out').then(m => m.ClockInOut)
  },
  {
    path: 'hr',
    canActivate: [staffFeatureGuard],
    data: { feature: 'hr' },
    loadComponent: () => import('./hr/hr').then(m => m.Hr)
  },
  {
    path: 'menu',
    canActivate: [staffFeatureGuard],
    data: { feature: 'menu' },
    loadComponent: () => import('./menu-admin/menu-admin').then(m => m.MenuAdmin)
  },
  {
    path: 'menu-builder',
    canActivate: [staffFeatureGuard],
    data: { feature: 'menu-builder' },
    loadComponent: () => import('./menu-builder/menu-builder').then(m => m.MenuBuilder)
  },
  {
    path: 'master-inventory',
    canActivate: [staffFeatureGuard],
    data: { feature: 'master-inventory' },
    loadComponent: () => import('./master-inventory/master-inventory').then(m => m.MasterInventory)
  },
  {
    path: 'finance',
    canActivate: [staffFeatureGuard],
    data: { feature: 'finance' },
    loadComponent: () => import('./finance/finance').then(m => m.Finance)
  },
  {
    path: 'reports',
    canActivate: [staffFeatureGuard],
    data: { feature: 'reports' },
    loadComponent: () => import('./reports/reports-layout').then(m => m.ReportsLayout),
    loadChildren: () => import('./reports/reports.routes').then(m => m.reportsRoutes)
  },
  {
    path: 'store-inventory',
    canActivate: [staffFeatureGuard],
    data: { feature: 'store-inventory', inventoryType: 'store' },
    loadComponent: () => import('./inventory-operation/inventory-operation').then(m => m.InventoryOperationPage)
  },
  {
    path: 'popup-inventory',
    canActivate: [staffFeatureGuard],
    data: { feature: 'popup-inventory', inventoryType: 'popup' },
    loadComponent: () => import('./inventory-operation/inventory-operation').then(m => m.InventoryOperationPage)
  },
  {
    path: 'event-inventory',
    canActivate: [staffFeatureGuard],
    data: { feature: 'event-inventory', inventoryType: 'event' },
    loadComponent: () => import('./inventory-operation/inventory-operation').then(m => m.InventoryOperationPage)
  },
  {
    path: 'event-operations',
    canActivate: [staffFeatureGuard],
    data: { feature: 'event-operations' },
    loadComponent: () => import('./event-operations/event-operations').then(m => m.EventOperations)
  },
];