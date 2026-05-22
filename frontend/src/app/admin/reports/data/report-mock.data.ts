import { ReportsNavItem } from '../models/report.models';

export const REPORTS_NAV: ReportsNavItem[] = [
  { key: 'overview', label: 'Dashboard Overview', path: 'overview', allowedRoles: ['admin', 'staff'] },
  { key: 'sales', label: 'Sales Reports', path: 'sales', allowedRoles: ['admin'] },
  { key: 'inventory', label: 'Inventory Reports', path: 'inventory', allowedRoles: ['admin'] },
  { key: 'customer', label: 'Customer Reports', path: 'customer', allowedRoles: ['admin'] },
  { key: 'financial', label: 'Financial Reports', path: 'financial', allowedRoles: ['admin'] },
  { key: 'operations', label: 'Operations Reports', path: 'operations', allowedRoles: ['admin'] },
  { key: 'production', label: 'Production Reports', path: 'production', allowedRoles: ['admin'] },
  { key: 'marketing', label: 'Marketing Reports', path: 'marketing', allowedRoles: ['admin'] },
  { key: 'audit-logs', label: 'Audit Logs', path: 'audit-logs', allowedRoles: ['admin'] },
  { key: 'export-center', label: 'Export Center', path: 'export-center', allowedRoles: ['admin'] }
];
