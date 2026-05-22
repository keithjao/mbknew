import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ReportColumn, ReportRow } from '../models/report.models';

@Component({
  selector: 'app-report-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="table-card">
      <header>
        <div>
          <h3>{{ title }}</h3>
          <p>{{ subtitle }}</p>
        </div>
        <div class="column-toggle" *ngIf="columns.length > 0">
          <label *ngFor="let column of columns">
            <input type="checkbox" [checked]="isVisible(column.key)" (change)="toggleColumn(column.key, visibleInput.checked)" #visibleInput />
            {{ column.label }}
          </label>
        </div>
      </header>

      <div class="mobile-cards" *ngIf="pagedRows.length > 0">
        <article class="mobile-card" *ngFor="let row of pagedRows">
          <div class="mobile-card-grid">
            <div class="mobile-field" *ngFor="let column of visibleColumns">
              <span>{{ column.label }}</span>
              <strong>{{ row[column.key] }}</strong>
            </div>
          </div>
        </article>
      </div>

      <div class="table-scroll" *ngIf="pagedRows.length > 0; else emptyState">
        <table>
          <thead>
            <tr>
              <th *ngFor="let column of visibleColumns" (click)="onSort(column.key)" [class.sortable]="column.sortable">
                {{ column.label }}
                <span *ngIf="sortKey === column.key">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of pagedRows">
              <td *ngFor="let column of visibleColumns">{{ row[column.key] }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #emptyState>
        <p class="empty">No records found.</p>
      </ng-template>

      <footer>
        <button type="button" (click)="prevPage()" [disabled]="page <= 1">Prev</button>
        <p>Page {{ page }} / {{ totalPages }}</p>
        <button type="button" (click)="nextPage()" [disabled]="page >= totalPages">Next</button>
      </footer>
    </section>
  `,
  styles: [
    `
    .table-card {
      border: 1px solid var(--line);
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 8px 24px rgba(8, 16, 24, 0.06);
      padding: 1rem;
      overflow: hidden;
    }

    header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    h3 {
      margin: 0;
      font-size: 1rem;
    }

    header p {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      color: var(--ink-soft);
    }

    .column-toggle {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.8rem;
      align-items: center;
      max-width: 26rem;
    }

    .column-toggle label {
      font-size: 0.75rem;
      color: var(--ink-soft);
      display: inline-flex;
      gap: 0.35rem;
      align-items: center;
    }

    .table-scroll {
      overflow: auto;
      max-height: 29rem;
      border: 1px solid var(--line);
      border-radius: 0.8rem;
    }

    .mobile-cards {
      display: none;
    }

    .mobile-card {
      border: 1px solid var(--line);
      border-radius: 0.8rem;
      background: #fff;
      padding: 0.9rem;
      display: grid;
      gap: 0.8rem;
    }

    .mobile-card-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.7rem;
    }

    .mobile-field {
      display: grid;
      gap: 0.2rem;
    }

    .mobile-field span {
      color: var(--ink-soft);
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .mobile-field strong {
      color: var(--ink);
      font-size: 0.9rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 48rem;
    }

    thead th {
      position: sticky;
      top: 0;
      background: #f4f3f0;
      z-index: 1;
    }

    th,
    td {
      border-bottom: 1px solid var(--line);
      padding: 0.62rem 0.6rem;
      text-align: left;
      font-size: 0.86rem;
      white-space: nowrap;
    }

    th.sortable {
      cursor: pointer;
    }

    footer {
      margin-top: 0.75rem;
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      align-items: center;
    }

    footer p {
      margin: 0;
      font-size: 0.8rem;
      color: var(--ink-soft);
      min-width: 5.5rem;
      text-align: center;
    }

    footer button {
      border: 1px solid var(--line);
      border-radius: 0.5rem;
      background: #fff;
      color: var(--ink-soft);
      padding: 0.3rem 0.6rem;
      cursor: pointer;
    }

    footer button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .empty {
      margin: 0;
      padding: 2rem 0;
      text-align: center;
      color: var(--ink-soft);
    }

    @media (max-width: 840px) {
      header {
        flex-direction: column;
      }

      .mobile-cards {
        display: grid;
        gap: 0.75rem;
      }

      .table-scroll {
        display: none;
      }
    }

    @media (max-width: 640px) {
      .mobile-card-grid {
        grid-template-columns: 1fr;
      }
    }
    `
  ]
})
export class ReportTableComponent implements OnChanges {
  @Input() title = 'Report Table';
  @Input() subtitle = '';
  @Input({ required: true }) columns: ReportColumn[] = [];
  @Input({ required: true }) rows: ReportRow[] = [];
  @Input() search = '';

  page = 1;
  readonly pageSize = 10;
  totalPages = 1;

  sortKey = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  visibleKeys = new Set<string>();
  filteredRows: ReportRow[] = [];
  pagedRows: ReportRow[] = [];

  get visibleColumns(): ReportColumn[] {
    return this.columns.filter(column => this.visibleKeys.has(column.key));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns']) {
      this.initializeVisibility();
    }

    this.apply();
  }

  onSort(key: string): void {
    const column = this.columns.find(item => item.key === key);
    if (!column?.sortable) {
      return;
    }

    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }

    this.apply();
  }

  isVisible(key: string): boolean {
    return this.visibleKeys.has(key);
  }

  toggleColumn(key: string, visible: boolean): void {
    if (visible) {
      this.visibleKeys.add(key);
    } else if (this.visibleKeys.size > 1) {
      this.visibleKeys.delete(key);
    }
    this.apply();
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page += 1;
      this.slicePage();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page -= 1;
      this.slicePage();
    }
  }

  private apply(): void {
    const query = this.search.trim().toLowerCase();
    let rows = this.rows.filter(row => {
      if (!query) {
        return true;
      }
      return Object.values(row).some(value => String(value).toLowerCase().includes(query));
    });

    if (this.sortKey) {
      rows = [...rows].sort((left, right) => {
        const leftValue = left[this.sortKey];
        const rightValue = right[this.sortKey];

        if (leftValue === rightValue) {
          return 0;
        }

        const comparison = leftValue! > rightValue! ? 1 : -1;
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    this.filteredRows = rows;
    this.totalPages = Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
    this.page = Math.min(this.page, this.totalPages);
    this.slicePage();
  }

  private slicePage(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedRows = this.filteredRows.slice(start, end);
  }

  private initializeVisibility(): void {
    this.visibleKeys = new Set(this.columns.filter(item => item.visible !== false).map(item => item.key));
  }
}
