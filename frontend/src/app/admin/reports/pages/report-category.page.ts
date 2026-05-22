import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AnalyticsChartComponent } from '../components/analytics-chart.component';
import { ExportDropdownComponent } from '../components/export-dropdown.component';
import { ReportFilterBarComponent } from '../components/filter-bar.component';
import { KpiCardComponent } from '../components/kpi-card.component';
import { LoadingSkeletonComponent } from '../components/loading-skeleton.component';
import { ReportTableComponent } from '../components/report-table.component';
import { ReportCategoryKey, ReportPageData } from '../models/report.models';
import { ReportsDataService } from '../services/reports-data.service';
import { ReportsExportService } from '../services/reports-export.service';
import { ReportsStateService } from '../services/reports-state.service';

@Component({
  selector: 'app-report-category-page',
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
          <h2>{{ data?.title || 'Reports' }}</h2>
          <p>{{ data?.description || 'Loading report metadata...' }}</p>
        </div>
        <app-export-dropdown (exportType)="export($event)"></app-export-dropdown>
      </header>

      <app-report-filter-bar
        [filters]="state.current"
        [showBranch]="showBranchFilter"
        (searchChange)="state.updateSearch($event)"
        (branchChange)="state.updateBranch($event)"
        (dateRangeChange)="state.updateDateRange($event.from, $event.to)"
        (reset)="state.reset()"
      ></app-report-filter-bar>

      <app-report-loading-skeleton *ngIf="loading" [rows]="6"></app-report-loading-skeleton>

      <ng-container *ngIf="!loading && data; else noData">
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

      <ng-template #noData>
        <section class="empty" *ngIf="!loading">
          <h3>No report data</h3>
          <p>This report is unavailable for the selected configuration.</p>
        </section>
      </ng-template>
    </section>
  `,
  styles: [
    `
    .report-page {
      display: grid;
      gap: 1rem;
    }

    .page-head {
      display: flex;
      justify-content: space-between;
      gap: 0.8rem;
      align-items: start;
    }

    .page-head h2 {
      margin: 0;
      font-size: 1.4rem;
    }

    .page-head p {
      margin: 0.35rem 0 0;
      color: var(--ink-soft);
      max-width: 48rem;
      font-size: 0.88rem;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .chart-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .empty {
      border: 1px dashed var(--line);
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.7);
      padding: 1.5rem;
    }

    .empty h3 {
      margin: 0;
      font-size: 1rem;
    }

    .empty p {
      margin: 0.3rem 0 0;
      color: var(--ink-soft);
    }

    @media (max-width: 1080px) {
      .kpi-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .chart-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .kpi-grid {
        grid-template-columns: 1fr;
      }

      .page-head {
        flex-direction: column;
      }
    }
    `
  ]
})
export class ReportCategoryPage implements OnInit, OnDestroy {
  loading = true;
  data: ReportPageData | null = null;
  currentCategory: ReportCategoryKey = 'sales';
  private readonly subscription = new Subscription();

  get showBranchFilter(): boolean {
    return this.currentCategory !== 'inventory' && this.currentCategory !== 'production';
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly reportsData: ReportsDataService,
    private readonly exports: ReportsExportService,
    readonly state: ReportsStateService
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      combineLatest([this.route.data, this.state.filters$])
        .pipe(
          switchMap(([routeData, filters]) => {
            this.loading = true;
            const category = routeData['category'] as ReportCategoryKey;
            this.currentCategory = category;
            return this.reportsData.getReportPageData(category, filters);
          })
        )
        .subscribe(data => {
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
      this.exports.exportCsv(this.data.key, columns, rows);
    } else if (type === 'excel') {
      this.exports.exportExcel(this.data.key, columns, rows);
    } else {
      this.exports.exportPdf(this.data.key, columns, rows);
    }
  }
}
