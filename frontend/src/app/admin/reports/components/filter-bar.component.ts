import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GlobalReportFilters } from '../models/report.models';

@Component({
  selector: 'app-report-filter-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="filter-bar" [class.no-branch]="!showBranch">
      <div class="field search">
        <label for="report-search">Search</label>
        <input id="report-search" type="text" [value]="filters.search" (input)="searchChange.emit(searchInput.value)" #searchInput placeholder="Search reports" />
      </div>

      <div class="field" *ngIf="showBranch">
        <label for="report-branch">Branch</label>
        <select id="report-branch" [value]="filters.branch" (change)="branchChange.emit(branchSelect.value)" #branchSelect>
          <option value="all">All branches</option>
          <option value="main">Main</option>
          <option value="north">North</option>
          <option value="east">East</option>
        </select>
      </div>

      <div class="field">
        <label for="report-from">From</label>
        <input id="report-from" type="date" [value]="filters.dateRange.from" (change)="dateRangeChange.emit({ from: fromInput.value, to: filters.dateRange.to })" #fromInput />
      </div>

      <div class="field">
        <label for="report-to">To</label>
        <input id="report-to" type="date" [value]="filters.dateRange.to" (change)="dateRangeChange.emit({ from: filters.dateRange.from, to: toInput.value })" #toInput />
      </div>

      <button type="button" class="reset" (click)="reset.emit()">Reset</button>
    </section>
  `,
  styles: [
    `
    .filter-bar {
      display: grid;
      grid-template-columns: 1.8fr repeat(3, minmax(130px, 1fr)) auto;
      gap: 0.75rem;
      align-items: end;
      padding: 0.9rem;
      border-radius: 0.9rem;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.75);
      backdrop-filter: blur(6px);
      margin-bottom: 1rem;
    }

    .filter-bar.no-branch {
      grid-template-columns: 1.8fr repeat(2, minmax(130px, 1fr)) auto;
    }

    .field {
      display: grid;
      gap: 0.3rem;
    }

    .field label {
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ink-soft);
    }

    .field input,
    .field select {
      height: 2.3rem;
      border: 1px solid var(--line);
      border-radius: 0.6rem;
      padding: 0.4rem 0.65rem;
      background: #fff;
      color: var(--ink);
    }

    .reset {
      height: 2.3rem;
      border: 1px solid var(--line);
      border-radius: 0.6rem;
      padding: 0 0.95rem;
      background: #fff;
      color: var(--ink-soft);
      cursor: pointer;
    }

    @media (max-width: 960px) {
      .filter-bar {
        grid-template-columns: repeat(2, minmax(140px, 1fr));
      }

      .field.search {
        grid-column: 1 / -1;
      }

      .reset {
        width: 100%;
      }
    }
    `
  ]
})
export class ReportFilterBarComponent {
  @Input({ required: true }) filters!: GlobalReportFilters;
  @Input() showBranch = true;

  @Output() searchChange = new EventEmitter<string>();
  @Output() branchChange = new EventEmitter<string>();
  @Output() dateRangeChange = new EventEmitter<{ from: string; to: string }>();
  @Output() reset = new EventEmitter<void>();
}
