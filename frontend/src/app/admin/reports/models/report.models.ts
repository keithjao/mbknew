export type ReportRole = 'admin' | 'staff';

export type ReportCategoryKey =
  | 'sales'
  | 'inventory'
  | 'customer'
  | 'financial'
  | 'operations'
  | 'production'
  | 'marketing';

export interface DateRange {
  from: string;
  to: string;
}

export interface GlobalReportFilters {
  dateRange: DateRange;
  branch: string;
  search: string;
  financeCategory: string;
  financeEntryType: 'all' | 'sale' | 'spending';
  financeEntrySource: 'all' | 'system' | 'manual' | 'system-cash' | 'system-gcash' | 'system-maya';
}

export interface KpiCard {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'flat';
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface AnalyticsChart {
  id: string;
  title: string;
  subtitle: string;
  series: ChartPoint[];
}

export interface ReportColumn {
  key: string;
  label: string;
  sortable?: boolean;
  visible?: boolean;
}

export interface ReportRow {
  id: string;
  [key: string]: string | number | boolean;
}

export interface ReportTableData {
  title: string;
  subtitle: string;
  columns: ReportColumn[];
  rows: ReportRow[];
}

export interface ReportPageData {
  key: ReportCategoryKey;
  title: string;
  description: string;
  kpis: KpiCard[];
  charts: AnalyticsChart[];
  table: ReportTableData;
}

export interface ReportsNavItem {
  key: string;
  label: string;
  path: string;
  allowedRoles: ReportRole[];
}
