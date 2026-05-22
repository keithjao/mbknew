import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { InventoryOperationsStore } from './inventory-operations.store';

export interface InventorySession {
  id: number;
  type: string;
  date: string;
  opened_by: string;
  closed_by?: string;
  opened_at: string;
  closed_at?: string;
  status: 'open' | 'closed';
}

export interface InventorySessionItem {
  id: number;
  session_id: number;
  inventory_id: number;
  start_quantity: number;
  added_quantity: number;
  end_quantity?: number;
}

export interface InventoryLog {
  id: number;
  inventory_id: number;
  action: string;
  quantity: number;
  session_type: string;
  session_date: string;
  note: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class InventorySessionStore {
  private readonly logsSubject = new BehaviorSubject<InventoryLog[]>([]);
  readonly logs$ = this.logsSubject.asObservable();

  constructor(private readonly operationsStore: InventoryOperationsStore) {}

  fetchLogs(): void {
    this.logsSubject.next(this.mapAuditLogsToInventoryLogs());
  }

  private mapAuditLogsToInventoryLogs(): InventoryLog[] {
    return this.operationsStore.getAllAuditLogs().map((log, index) => ({
      id: index + 1,
      inventory_id: log.inventoryItemId,
      action: log.action,
      quantity: log.quantity,
      session_type: log.operationType,
      session_date: log.operationDate,
      note: log.notes,
      created_at: log.timestamp
    }));
  }
}
