import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { ReportCategoryKey } from '../models/report.models';
import { ReportsDataService } from '../services/reports-data.service';
import { ReportsExportService } from '../services/reports-export.service';
import { ReportsStateService } from '../services/reports-state.service';

interface ExportCard {
  key: ReportCategoryKey;
  title: string;
  description: string;
}

@Component({
  selector: 'app-export-center-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="export-center">
      <header>
        <h2>Export Center</h2>
        <p>Generate CSV, Excel, and PDF extracts based on current report filters.</p>
      </header>

      <div class="cards">
        <article *ngFor="let card of categories">
          <h3>{{ card.title }}</h3>
          <p>{{ card.description }}</p>
          <div class="actions">
            <button type="button" [disabled]="exporting[card.key]" (click)="export(card.key, 'csv')">CSV</button>
            <button type="button" [disabled]="exporting[card.key]" (click)="export(card.key, 'excel')">Excel</button>
            <button type="button" [disabled]="exporting[card.key]" (click)="export(card.key, 'pdf')">PDF</button>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
    .export-center {
      display: grid;
      gap: 1rem;
    }

    h2 {
      margin: 0;
      font-size: 1.4rem;
    }

    header p {
      margin: 0.35rem 0 0;
      color: var(--ink-soft);
      font-size: 0.88rem;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }

    article {
      border: 1px solid var(--line);
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.84);
      padding: 1rem;
    }

    article h3 {
      margin: 0;
      font-size: 0.98rem;
    }

    article p {
      margin: 0.35rem 0 0.85rem;
      color: var(--ink-soft);
      font-size: 0.84rem;
      min-height: 2.7rem;
    }

    .actions {
      display: flex;
      gap: 0.4rem;
    }

    .actions button {
      border: 1px solid var(--line);
      border-radius: 0.55rem;
      background: #fff;
      color: var(--ink-soft);
      padding: 0.33rem 0.62rem;
      cursor: pointer;
    }

    .actions button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    @media (max-width: 900px) {
      .cards {
        grid-template-columns: 1fr;
      }
    }
    `
  ]
})
export class ExportCenterPage implements OnDestroy {
  readonly categories: ExportCard[] = [
    { key: 'sales', title: 'Sales Reports', description: 'Paid order sales data with gross sales, discounts, net sales, and gross profit by day.' },
    { key: 'financial', title: 'Financial Reports', description: 'Combined view of order sales, manual finance adjustments, spendings, and operating profit.' },
    { key: 'inventory', title: 'Inventory Reports', description: 'Current stock valuation, low-stock positions, ingredient usage, and menu linkage.' },
    { key: 'customer', title: 'Customer Reports', description: 'Tagged guest and loyalty customer purchase behavior, lifetime value, and segments.' },
    { key: 'operations', title: 'Operations Reports', description: 'Operation session summaries with stock pull, cash reconciliation, and order status.' },
    { key: 'production', title: 'Production Reports', description: 'Session-level ingredient pull and production analytics from operation records.' },
    { key: 'marketing', title: 'Marketing Reports', description: 'Discount and promotional activity derived from paid order data.' }
  ];

  exporting: Record<string, boolean> = {};

  private readonly subscription = new Subscription();

  constructor(
    private readonly reportsData: ReportsDataService,
    private readonly exports: ReportsExportService,
    private readonly state: ReportsStateService
  ) {}

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  export(key: ReportCategoryKey, type: 'csv' | 'excel' | 'pdf'): void {
    if (this.exporting[key]) {
      return;
    }

    this.exporting[key] = true;
    this.subscription.add(
      this.reportsData.getReportPageData(key, this.state.current).pipe(take(1)).subscribe(data => {
        this.exporting[key] = false;
        if (!data) {
          return;
        }
        const { columns, rows } = data.table;
        if (type === 'csv') {
          this.exports.exportCsv(`${key}-report`, columns, rows);
        } else if (type === 'excel') {
          this.exports.exportExcel(`${key}-report`, columns, rows);
        } else {
          this.exports.exportPdf(`${key}-report`, columns, rows);
        }
      })
    );
  }
}
