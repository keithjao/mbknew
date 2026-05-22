import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AdminInventoryStore, InventoryItem } from './admin-inventory.store';
import { ActionLogStore } from '../../shared/logging/action-log.store';
import { AppClockStore } from '../../shared/testing/app-clock.store';
import { RemoteStateService } from '../../shared/state/remote-state.service';

export type OperationType = 'store' | 'popup' | 'event';
export type SessionStatus = 'closed' | 'open';

export interface OperationInventoryItem {
  id: string;
  inventoryItemId: number;
  name: string;
  unit: string;
  pulledQuantity: number; // Amount pulled from master
  currentQuantity: number; // Current amount in operation
  unitCost: number;
}

export interface InventoryOperation {
  id: string;
  type: OperationType;
  date: string; // YYYY-MM-DD format
  status: SessionStatus;
  openedAt: string | null;
  closedAt: string | null;
  openedBy: string;
  closedBy: string | null;
  items: OperationInventoryItem[];
  notes: string;
  startingCash?: number; // Cash on hand when opening (in Pesos)
  endingCash?: number; // Cash on hand when closing (in Pesos)
  cashSalesTotal?: number; // Total POS cash payments for this operation day
  expectedClosingCash?: number; // startingCash + cashSalesTotal
  cashVariance?: number; // endingCash - expectedClosingCash
}

export interface InventoryAuditLog {
  id: string;
  operationType: OperationType;
  operationDate: string;
  action: 'pull' | 'add' | 'deduct' | 'restore' | 'close' | 'wastage';
  inventoryItemId: number;
  inventoryItemName: string;
  quantity: number;
  unit: string;
  timestamp: string;
  performedBy: string;
  notes: string;
}

const STORAGE_KEYS = {
  operations: 'mbk.inventory.operations',
  auditLog: 'mbk.inventory.auditlog'
};

@Injectable({ providedIn: 'root' })
export class InventoryOperationsStore {
  private readonly remoteState = inject(RemoteStateService);
  private readonly operationsSubject = new BehaviorSubject<InventoryOperation[]>(
    this.getStoredValue(STORAGE_KEYS.operations, [])
  );

  private readonly auditLogSubject = new BehaviorSubject<InventoryAuditLog[]>(
    this.getStoredValue(STORAGE_KEYS.auditLog, [])
  );

  readonly operations$ = this.operationsSubject.asObservable();
  readonly auditLog$ = this.auditLogSubject.asObservable();

  constructor(
    private readonly adminInventoryStore: AdminInventoryStore,
    private readonly actionLogStore: ActionLogStore,
    private readonly appClock: AppClockStore
  ) {
    this.persistValue(STORAGE_KEYS.operations, this.operationsSubject.value);
    this.persistValue(STORAGE_KEYS.auditLog, this.auditLogSubject.value);
  }

  // Get today's operation for a type
  getTodaysOperation(type: OperationType): InventoryOperation | undefined {
    const today = this.getTodayString();
    return this.operationsSubject.value.find(
      op => op.type === type && op.date === today && op.status === 'open'
    );
  }

  getOperationForDate(type: OperationType, date: string): InventoryOperation | undefined {
    return this.operationsSubject.value.find(op => op.type === type && op.date === date);
  }

  // Get all operations
  getAllOperations(): InventoryOperation[] {
    return this.operationsSubject.value;
  }

  // Get operations by type
  getOperationsByType(type: OperationType): InventoryOperation[] {
    return this.operationsSubject.value.filter(op => op.type === type);
  }

  // Open a new operation session
  openOperation(
    type: OperationType,
    items: OperationInventoryItem[],
    openedBy: string,
    notes: string = '',
    startingCash: number = 0
  ): InventoryOperation {
    const today = this.getTodayString();
    const existingOp = this.getOperationForDate(type, today);
    
    if (existingOp) {
      throw new Error(`Operation for ${type} already opened today`);
    }

    if (!this.hasSufficientMasterInventory(items)) {
      throw new Error('Not enough stock in master inventory for the selected pull quantities');
    }

    if (!this.applyMasterInventoryAdjustments(items, -1)) {
      throw new Error('Unable to reserve stock from master inventory');
    }

    const normalizedStartingCash = this.sanitizeCashValue(startingCash);
    const newOperation: InventoryOperation = {
      id: `${type}-${Date.now()}`,
      type,
      date: today,
      status: 'open',
      openedAt: this.appClock.isoNow(),
      closedAt: null,
      openedBy,
      closedBy: null,
      items,
      notes,
      startingCash: normalizedStartingCash,
      cashSalesTotal: 0,
      expectedClosingCash: normalizedStartingCash,
      cashVariance: 0
    };

    const nextOperations = [newOperation, ...this.operationsSubject.value];
    this.operationsSubject.next(nextOperations);
    this.persistValue(STORAGE_KEYS.operations, nextOperations);

    // Log the action
    items.forEach(item => {
      this.addAuditLog({
        operationType: type,
        operationDate: today,
        action: 'pull',
        inventoryItemId: item.inventoryItemId,
        inventoryItemName: item.name,
        quantity: item.pulledQuantity,
        unit: item.unit,
        performedBy: openedBy,
        notes: `Pulled from master inventory to open ${type} operation`
      });
    });

    return newOperation;
  }

  // Add items to operation (pull additional from master)
  addItemsToOperation(operationId: string, items: OperationInventoryItem[], performedBy: string): void {
    if (!this.hasSufficientMasterInventory(items)) {
      throw new Error('Not enough stock in master inventory for the selected pull quantities');
    }

    const operation = this.operationsSubject.value.find(op => op.id === operationId);
    if (!operation) {
      throw new Error('Operation not found');
    }

    if (!this.applyMasterInventoryAdjustments(items, -1)) {
      throw new Error('Unable to reserve stock from master inventory');
    }

    const mergedItems = operation.items.map(item => ({ ...item }));
    items.forEach(newItem => {
      const existing = mergedItems.find(item => item.inventoryItemId === newItem.inventoryItemId);
      if (existing) {
        existing.pulledQuantity += newItem.pulledQuantity;
        existing.currentQuantity += newItem.pulledQuantity;
        return;
      }

      mergedItems.push({ ...newItem });
    });

    const nextOperations = this.operationsSubject.value.map(op =>
      op.id === operationId ? { ...op, items: mergedItems } : op
    );

    this.operationsSubject.next(nextOperations);
    this.persistValue(STORAGE_KEYS.operations, nextOperations);

    // Log the actions
    items.forEach(item => {
      this.addAuditLog({
        operationType: operation.type,
        operationDate: operation.date,
        action: 'add',
        inventoryItemId: item.inventoryItemId,
        inventoryItemName: item.name,
        quantity: item.pulledQuantity,
        unit: item.unit,
        performedBy,
        notes: 'Additional items pulled from master inventory'
      });
    });
  }

  // Deduct items from operation (on sale via POS or manual)
  deductFromOperation(
    operationId: string,
    itemId: string,
    quantity: number,
    performedBy: string,
    notes: string = '',
    action: InventoryAuditLog['action'] = 'deduct'
  ): boolean {
    let isValid = true;
    const nextOperations = this.operationsSubject.value.map(op => {
      if (op.id !== operationId) {
        return op;
      }

      const nextItems = op.items.map(item => {
        if (item.id !== itemId) {
          return item;
        }

        const nextQuantity = item.currentQuantity - quantity;
        if (nextQuantity < 0) {
          isValid = false;
          return item;
        }

        return { ...item, currentQuantity: nextQuantity };
      });

      return { ...op, items: nextItems };
    });

    if (isValid) {
      this.operationsSubject.next(nextOperations);
      this.persistValue(STORAGE_KEYS.operations, nextOperations);

      // Log the action
      const operation = this.operationsSubject.value.find(op => op.id === operationId);
      if (operation) {
        const item = operation.items.find(i => i.id === itemId);
        if (item) {
          this.addAuditLog({
            operationType: operation.type,
            operationDate: operation.date,
            action,
            inventoryItemId: item.inventoryItemId,
            inventoryItemName: item.name,
            quantity,
            unit: item.unit,
            performedBy,
            notes: notes || 'Item deducted from operation'
          });
        }
      }
    }

    return isValid;
  }

  restoreToOperation(
    operationId: string,
    itemId: string,
    quantity: number,
    performedBy: string,
    notes: string = ''
  ): boolean {
    let restoredItem: OperationInventoryItem | undefined;
    let restoredOperation: InventoryOperation | undefined;

    const nextOperations = this.operationsSubject.value.map(op => {
      if (op.id !== operationId) {
        return op;
      }

      restoredOperation = op;

      const nextItems = op.items.map(item => {
        if (item.id !== itemId) {
          return item;
        }

        restoredItem = {
          ...item,
          currentQuantity: item.currentQuantity + quantity
        };

        return restoredItem;
      });

      return { ...op, items: nextItems };
    });

    if (!restoredItem || !restoredOperation) {
      return false;
    }

    this.operationsSubject.next(nextOperations);
    this.persistValue(STORAGE_KEYS.operations, nextOperations);

    this.addAuditLog({
      operationType: restoredOperation.type,
      operationDate: restoredOperation.date,
      action: 'restore',
      inventoryItemId: restoredItem.inventoryItemId,
      inventoryItemName: restoredItem.name,
      quantity,
      unit: restoredItem.unit,
      performedBy,
      notes: notes || 'Item restored to operation inventory after cancellation'
    });

    return true;
  }

  // Close operation and return remaining items to master
  closeOperation(
    operationId: string,
    closedBy: string,
    notes: string = '',
    endingCash: number = 0,
    cashSalesTotal: number = 0
  ): InventoryOperation | null {
    // Find the operation to close
    const operationToClose = this.operationsSubject.value.find(
      op => op.id === operationId && op.status !== 'closed'
    );

    if (!operationToClose) {
      return null;
    }

    if (!this.applyMasterInventoryAdjustments(
      operationToClose.items.filter(item => item.currentQuantity > 0),
      1
    )) {
      throw new Error('Unable to restore remaining stock to master inventory');
    }

    const normalizedEndingCash = this.sanitizeCashValue(endingCash);
    const normalizedCashSales = this.sanitizeCashValue(cashSalesTotal);
    const startingCash = this.sanitizeCashValue(operationToClose.startingCash ?? 0);
    const expectedClosingCash = Number((startingCash + normalizedCashSales).toFixed(2));
    const cashVariance = Number((normalizedEndingCash - expectedClosingCash).toFixed(2));

    // Create the closed operation
    const closedOperation: InventoryOperation = {
      ...operationToClose,
      status: 'closed',
      closedAt: this.appClock.isoNow(),
      closedBy,
      notes: notes || operationToClose.notes,
      endingCash: normalizedEndingCash,
      cashSalesTotal: normalizedCashSales,
      expectedClosingCash,
      cashVariance
    };

    // Update all operations
    const nextOperations = this.operationsSubject.value.map(op =>
      op.id === operationId ? closedOperation : op
    );

    this.operationsSubject.next(nextOperations);
    this.persistValue(STORAGE_KEYS.operations, nextOperations);

    // Log the close action and remaining items
    closedOperation.items.forEach((item: OperationInventoryItem) => {
      if (item.currentQuantity <= 0) {
        return;
      }

      this.addAuditLog({
        operationType: closedOperation.type,
        operationDate: closedOperation.date,
        action: 'close',
        inventoryItemId: item.inventoryItemId,
        inventoryItemName: item.name,
        quantity: item.currentQuantity,
        unit: item.unit,
        performedBy: closedBy,
        notes: `${item.currentQuantity} ${item.unit} returned to master inventory`
      });
    });

    return closedOperation;
  }

  // Get remaining items for return to master (for closing operation)
  getRemainingItems(operationId: string): OperationInventoryItem[] {
    const operation = this.operationsSubject.value.find(op => op.id === operationId);
    if (!operation) {
      return [];
    }
    return operation.items.filter(item => item.currentQuantity > 0);
  }

  // Get all audit logs
  getAllAuditLogs(): InventoryAuditLog[] {
    return this.auditLogSubject.value;
  }

  // Get audit logs by operation type
  getAuditLogsByType(type: OperationType): InventoryAuditLog[] {
    return this.auditLogSubject.value.filter(log => log.operationType === type);
  }

  // Get audit logs by date
  getAuditLogsByDate(date: string): InventoryAuditLog[] {
    return this.auditLogSubject.value.filter(log => log.operationDate === date);
  }

  // Get audit logs by operation ID (approximate by date and type)
  getAuditLogsByOperation(type: OperationType, date: string): InventoryAuditLog[] {
    return this.auditLogSubject.value.filter(
      log => log.operationType === type && log.operationDate === date
    );
  }

  // Private helper methods
  private addAuditLog(payload: Omit<InventoryAuditLog, 'id' | 'timestamp'>): void {
    const log: InventoryAuditLog = {
      id: `log-${Date.now()}`,
      timestamp: this.appClock.isoNow(),
      ...payload
    };

    const nextLogs = [log, ...this.auditLogSubject.value];
    this.auditLogSubject.next(nextLogs);
    this.persistValue(STORAGE_KEYS.auditLog, nextLogs);
    this.actionLogStore.addLog({
      module: 'inventory',
      action: `inventory-${log.action}`,
      summary: `${log.action} ${log.quantity} ${log.unit} of ${log.inventoryItemName} in ${log.operationType} inventory.`,
      status: log.action === 'wastage' ? 'warning' : 'info',
      performedByName: log.performedBy,
      metadata: {
        operationType: log.operationType,
        operationDate: log.operationDate,
        inventoryItemId: log.inventoryItemId,
        quantity: log.quantity,
        unit: log.unit
      }
    });
  }

  private hasSufficientMasterInventory(items: OperationInventoryItem[]): boolean {
    return items.every(item => {
      const masterItem = this.adminInventoryStore.getInventoryItemById(item.inventoryItemId);
      return !!masterItem && masterItem.quantity >= item.pulledQuantity;
    });
  }

  private applyMasterInventoryAdjustments(items: OperationInventoryItem[], direction: 1 | -1): boolean {
    const appliedItems: OperationInventoryItem[] = [];

    for (const item of items) {
      const didAdjust = this.adminInventoryStore.adjustInventory(item.inventoryItemId, direction * item.pulledQuantity);
      if (!didAdjust) {
        appliedItems.forEach(appliedItem => {
          this.adminInventoryStore.adjustInventory(appliedItem.inventoryItemId, -direction * appliedItem.pulledQuantity);
        });
        return false;
      }

      appliedItems.push(item);
    }

    return true;
  }

  private sanitizeCashValue(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Number(value.toFixed(2));
  }

  private getTodayString(): string {
    return this.appClock.todayKey();
  }

  private getStoredValue<T>(key: string, defaultValue: T): T {
    try {
      return this.remoteState.getState<T>(key, defaultValue);
    } catch {
      return defaultValue;
    }
  }

  private persistValue<T>(key: string, value: T): void {
    try {
      this.remoteState.setState(key, value);
    } catch {
      console.error(`Failed to persist ${key}`);
    }
  }
}
