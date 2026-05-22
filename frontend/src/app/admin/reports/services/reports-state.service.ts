import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GlobalReportFilters } from '../models/report.models';

@Injectable({ providedIn: 'root' })
export class ReportsStateService {
  private readonly filtersSubject = new BehaviorSubject<GlobalReportFilters>(this.defaultFilters());
  readonly filters$ = this.filtersSubject.asObservable();

  updateSearch(search: string): void {
    this.patch({ search: search.trim() });
  }

  updateBranch(branch: string): void {
    this.patch({ branch });
  }

  updateDateRange(from: string, to: string): void {
    this.patch({ dateRange: { from, to } });
  }

  updateFinanceCategory(category: string): void {
    this.patch({ financeCategory: category });
  }

  updateFinanceEntryType(type: 'all' | 'sale' | 'spending'): void {
    this.patch({ financeEntryType: type });
  }

  updateFinanceEntrySource(source: 'all' | 'system' | 'manual' | 'system-cash' | 'system-gcash' | 'system-maya'): void {
    this.patch({ financeEntrySource: source });
  }

  reset(): void {
    this.filtersSubject.next(this.defaultFilters());
  }

  get current(): GlobalReportFilters {
    return this.filtersSubject.value;
  }

  private patch(next: Partial<GlobalReportFilters>): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      ...next
    });
  }

  private defaultFilters(): GlobalReportFilters {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    return {
      dateRange: {
        from: `${year}-${month}-01`,
        to: `${year}-${month}-${String(lastDay).padStart(2, '0')}`
      },
      branch: 'all',
      search: '',
      financeCategory: 'all',
      financeEntryType: 'all',
      financeEntrySource: 'all'
    };
  }
}
