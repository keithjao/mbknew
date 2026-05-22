import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppClockStore } from '../testing/app-clock.store';
import { RemoteStateService } from '../state/remote-state.service';

export type ActionLogModule = 'attendance' | 'hr' | 'inventory' | 'orders' | 'pos' | 'finance';
export type ActionLogStatus = 'success' | 'warning' | 'error' | 'info';

export interface ActionLogEntry {
  id: string;
  module: ActionLogModule;
  action: string;
  summary: string;
  timestamp: string;
  status: ActionLogStatus;
  performedByStaffId?: string;
  performedByName?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface ActionLogDraft {
  module: ActionLogModule;
  action: string;
  summary: string;
  status?: ActionLogStatus;
  performedByStaffId?: string;
  performedByName?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

const STORAGE_KEY = 'mbk.app.action-logs';
const MAX_LOG_ENTRIES = 2000;

@Injectable({ providedIn: 'root' })
export class ActionLogStore {
  private readonly remoteState = inject(RemoteStateService);
  private readonly logsSubject = new BehaviorSubject<ActionLogEntry[]>(this.loadLogs());

  readonly logs$ = this.logsSubject.asObservable();

  constructor(private readonly appClock: AppClockStore) {
    this.persistLogs(this.logsSubject.value);
  }

  getLogs(): ActionLogEntry[] {
    return this.logsSubject.value;
  }

  addLog(draft: ActionLogDraft): ActionLogEntry {
    const entry: ActionLogEntry = {
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      module: draft.module,
      action: draft.action.trim(),
      summary: draft.summary.trim(),
      timestamp: this.appClock.isoNow(),
      status: draft.status || 'info',
      performedByStaffId: draft.performedByStaffId,
      performedByName: draft.performedByName,
      metadata: draft.metadata
    };

    const nextLogs = [entry, ...this.logsSubject.value].slice(0, MAX_LOG_ENTRIES);
    this.logsSubject.next(nextLogs);
    this.persistLogs(nextLogs);
    return entry;
  }

  private loadLogs(): ActionLogEntry[] {
    try {
      return (this.remoteState.getState<Partial<ActionLogEntry>[]>(STORAGE_KEY, []))
        .filter(entry => !!entry.action && !!entry.summary && !!entry.module)
        .map(entry => ({
          id: entry.id || `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          module: entry.module as ActionLogModule,
          action: entry.action || 'unknown',
          summary: entry.summary || 'No summary provided.',
          timestamp: entry.timestamp || this.appClock.isoNow(),
          status: (entry.status as ActionLogStatus) || 'info',
          performedByStaffId: entry.performedByStaffId,
          performedByName: entry.performedByName,
          metadata: entry.metadata
        }))
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        .slice(0, MAX_LOG_ENTRIES);
    } catch {
      return [];
    }
  }

  private persistLogs(logs: ActionLogEntry[]): void {
    this.remoteState.setState(STORAGE_KEY, logs);
  }
}