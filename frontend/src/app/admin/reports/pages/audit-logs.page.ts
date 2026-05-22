import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AnalyticsChartComponent } from '../components/analytics-chart.component';
import { ExportDropdownComponent } from '../components/export-dropdown.component';
import { ReportFilterBarComponent } from '../components/filter-bar.component';
import { KpiCardComponent } from '../components/kpi-card.component';
import { LoadingSkeletonComponent } from '../components/loading-skeleton.component';
import { ReportTableComponent } from '../components/report-table.component';
import { ReportPageData } from '../models/report.models';
import { ReportsDataService } from '../services/reports-data.service';
import { ReportsExportService } from '../services/reports-export.service';
import { ReportsStateService } from '../services/reports-state.service';

@Component({
  selector: 'app-audit-logs-page',
  standalone: true,
  imports: [
    CommonModule,
    ReportFilterBarComponent,
    ExportDropdownComponent,
    KpiCardComponent,
    AnalyticsChartComponent,
    ReportTableComponent,
    LoadingSkeletonComponent
  ],
  template: `
    <section class="report-page">
      <header class="page-head">
        <div>
          <h2>Audit Logs</h2>
          <p>Cross-module access and action timeline for governance and compliance monitoring.</p>
        </div>
        <app-export-dropdown (exportType)="export($event)"></app-export-dropdown>
      </header>

      <app-report-filter-bar
        [filters]="state.current"
        [showBranch]="false"
        (searchChange)="state.updateSearch($event)"
        (dateRangeChange)="state.updateDateRange($event.from, $event.to)"
        (reset)="state.reset()"
      ></app-report-filter-bar>

      <app-report-loading-skeleton *ngIf="loading" [rows]="5"></app-report-loading-skeleton>

      <ng-container *ngIf="!loading && data">
        <div class="kpi-grid">
          <app-kpi-card *ngFor="let card of data.kpis" [card]="card"></app-kpi-card>
        </div>

        <div class="chart-grid">
          <app-analytics-chart *ngFor="let chart of data.charts" [chart]="chart"></app-analytics-chart>
        </div>

        <app-report-table
          [title]="data.table.title"
          [subtitle]="data.table.subtitle"
          [columns]="data.table.columns"
          [rows]="data.table.rows"
          [search]="state.current.search"
        ></app-report-table>
      </ng-container>
    </section>
  `,
  styles: [
    `
    .report-page { display: grid; gap: 1rem; }
    .page-head { display: flex; justify-content: space-between; gap: 1rem; align-items: start; }
    .page-head h2 { margin: 0; font-size: 1.4rem; }
    .page-head p { margin: 0.32rem 0 0; color: var(--ink-soft); font-size: 0.88rem; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; }
    .chart-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.75rem; }

    @media (max-width: 980px) {
      .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 640px) {
      .kpi-grid { grid-template-columns: 1fr; }
      .page-head { flex-direction: column; }
    }
    `
  ]
})
export class AuditLogsPage implements OnInit, OnDestroy {
  loading = true;
  data: ReportPageData | null = null;
  private readonly subscription = new Subscription();

  constructor(
    private readonly reportsData: ReportsDataService,
    private readonly exports: ReportsExportService,
    readonly state: ReportsStateService
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.state.filters$.pipe(
        switchMap(filters => this.reportsData.getAuditLogs(filters))
      ).subscribe(data => {
        this.data = data;
        this.loading = false;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  export(type: 'csv' | 'excel' | 'pdf'): void {
    if (!this.data) {
      return;
    }

    const { columns, rows } = this.data.table;
    if (type === 'csv') {
      this.exports.exportCsv('audit-logs', columns, rows);
    } else if (type === 'excel') {
      this.exports.exportExcel('audit-logs', columns, rows);
    } else {
      this.exports.exportPdf('audit-logs', columns, rows);
    }
  }
}
