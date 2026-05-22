import { Routes } from '@angular/router';

export const reportsRoutes: Routes = [
  { path: '', redirectTo: 'overview', pathMatch: 'full' },
  {
    path: 'overview',
    loadComponent: () => import('./pages/dashboard-overview.page').then(m => m.DashboardOverviewPage)
  },
  {
    path: 'sales',
    data: { category: 'sales' },
    loadComponent: () => import('./pages/report-category.page').then(m => m.ReportCategoryPage)
  },
  {
    path: 'inventory',
    data: { category: 'inventory' },
    loadComponent: () => import('./pages/report-category.page').then(m => m.ReportCategoryPage)
  },
  {
    path: 'customer',
    data: { category: 'customer' },
    loadComponent: () => import('./pages/report-category.page').then(m => m.ReportCategoryPage)
  },
  {
    path: 'financial',
    data: { category: 'financial' },
    loadComponent: () => import('./pages/report-category.page').then(m => m.ReportCategoryPage)
  },
  {
    path: 'operations',
    data: { category: 'operations' },
    loadComponent: () => import('./pages/report-category.page').then(m => m.ReportCategoryPage)
  },
  {
    path: 'production',
    data: { category: 'production' },
    loadComponent: () => import('./pages/report-category.page').then(m => m.ReportCategoryPage)
  },
  {
    path: 'marketing',
    data: { category: 'marketing' },
    loadComponent: () => import('./pages/report-category.page').then(m => m.ReportCategoryPage)
  },
  {
    path: 'audit-logs',
    loadComponent: () => import('./pages/audit-logs.page').then(m => m.AuditLogsPage)
  },
  {
    path: 'export-center',
    loadComponent: () => import('./pages/export-center.page').then(m => m.ExportCenterPage)
  }
];
