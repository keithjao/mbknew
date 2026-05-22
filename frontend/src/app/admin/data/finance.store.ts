import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppClockStore } from '../../shared/testing/app-clock.store';
import { RemoteStateService } from '../../shared/state/remote-state.service';

export type FinanceEntryType = 'sale' | 'spending';
export type FinancePeriod = 'day' | 'week' | 'month' | 'all';

export interface FinanceEntry {
  id: number;
  type: FinanceEntryType;
  amount: number;
  note: string;
  category: string;
  createdAt: string;
}

const STORAGE_KEY = 'mbk.admin.finance.entries';

@Injectable({ providedIn: 'root' })
export class FinanceStore {
  private readonly remoteState = inject(RemoteStateService);
  private readonly entriesSubject = new BehaviorSubject<FinanceEntry[]>(
    this.getStoredEntries()
  );

  readonly entries$ = this.entriesSubject.asObservable();

  constructor(private readonly appClock: AppClockStore) {}

  recordSale(amount: number, note: string, category = 'pos'): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    this.addEntry({
      type: 'sale',
      amount,
      note,
      category,
      createdAt: this.appClock.isoNow()
    });
  }

  recordSpending(amount: number, note: string, category = 'general'): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    this.addEntry({
      type: 'spending',
      amount,
      note,
      category,
      createdAt: this.appClock.isoNow()
    });
  }

  addManualEntry(
    type: FinanceEntryType,
    amount: number,
    note: string,
    category: string,
    createdAt: string
  ): boolean {
    if (!Number.isFinite(amount) || amount <= 0) {
      return false;
    }

    const trimmedNote = note.trim().toLowerCase();
    const trimmedCategory = category.trim().toLowerCase();
    if (!trimmedNote) {
      return false;
    }

    this.addEntry({
      type,
      amount,
      note: trimmedNote,
      category: trimmedCategory || 'general',
      createdAt: createdAt || this.appClock.isoNow()
    });

    return true;
  }

  updateEntry(
    entryId: number,
    payload: Pick<FinanceEntry, 'type' | 'amount' | 'note' | 'category' | 'createdAt'>
  ): boolean {
    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      return false;
    }

    const trimmedNote = payload.note.trim().toLowerCase();
    const trimmedCategory = payload.category.trim().toLowerCase();
    if (!trimmedNote) {
      return false;
    }

    let didUpdate = false;
    const nextEntries = this.entriesSubject.value.map(entry => {
      if (entry.id !== entryId) {
        return entry;
      }

      didUpdate = true;
      return {
        ...entry,
        type: payload.type,
        amount: payload.amount,
        note: trimmedNote,
        category: trimmedCategory || 'general',
        createdAt: payload.createdAt || entry.createdAt
      };
    });

    if (!didUpdate) {
      return false;
    }

    this.persistEntries(nextEntries);
    return true;
  }

  deleteEntry(entryId: number): boolean {
    const nextEntries = this.entriesSubject.value.filter(entry => entry.id !== entryId);
    if (nextEntries.length === this.entriesSubject.value.length) {
      return false;
    }

    this.persistEntries(nextEntries);
    return true;
  }

  getEntryById(entryId: number): FinanceEntry | undefined {
    return this.entriesSubject.value.find(entry => entry.id === entryId);
  }

  getFilteredEntries(period: FinancePeriod): FinanceEntry[] {
    if (period === 'all') {
      return this.entriesSubject.value;
    }

    const now = this.appClock.now().getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const lookbackDays = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const threshold = now - (lookbackDays * dayMs);

    return this.entriesSubject.value.filter(entry => {
      return new Date(entry.createdAt).getTime() >= threshold;
    });
  }

  private addEntry(payload: Omit<FinanceEntry, 'id'>): void {
    const entry: FinanceEntry = {
      id: Date.now(),
      ...payload
    };

    const nextEntries = [entry, ...this.entriesSubject.value];
    this.persistEntries(nextEntries);
  }

  private getStoredEntries(): FinanceEntry[] {
    try {
      return (this.remoteState.getState<Partial<FinanceEntry>[]>(STORAGE_KEY, []))
        .filter((entry): entry is Partial<FinanceEntry> & Pick<FinanceEntry, 'id' | 'type' | 'amount'> => {
          return typeof entry.id === 'number'
            && (entry.type === 'sale' || entry.type === 'spending')
            && typeof entry.amount === 'number';
        })
        .map(entry => ({
          id: entry.id,
          type: entry.type,
          amount: entry.amount,
          note: entry.note?.toString().trim().toLowerCase() || 'finance entry',
          category: entry.category?.toString().trim().toLowerCase() || 'general',
          createdAt: entry.createdAt || this.appClock.isoNow()
        }))
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    } catch {
      return [];
    }
  }

  private persistEntries(entries: FinanceEntry[]): void {
    const sortedEntries = [...entries].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
    this.entriesSubject.next(sortedEntries);
    this.remoteState.setState(STORAGE_KEY, sortedEntries);
  }
}
