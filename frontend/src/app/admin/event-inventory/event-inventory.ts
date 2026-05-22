import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AdminInventoryStore, InventoryItem } from '../data/admin-inventory.store';
import {
  InventoryOperationsStore,
  InventoryOperation,
  OperationInventoryItem,
  InventoryAuditLog
} from '../data/inventory-operations.store';

@Component({
  selector: 'app-event-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-inventory.html',
  styleUrls: ['./event-inventory.scss']
})
export class EventInventory implements OnInit, OnDestroy {
  readonly pageSize = 10;
  masterInventory: InventoryItem[] = [];
  todaysOperation: InventoryOperation | undefined = undefined;
  auditLogs: InventoryAuditLog[] = [];
  
  selectedItems: Map<number, number> = new Map();
  selectedItemsToAdd: Map<number, number> = new Map();
  
  activeTab: 'overview' | 'pull' | 'logs' = 'overview';
  feedback = '';
  currentUser = 'Staff Member';
  operationNotes = '';
  closeNotes = '';
  showCloseConfirm = false;
  currentInventoryPage = 1;
  pullInventoryPage = 1;
  logsPage = 1;
  
  private readonly subscription = new Subscription();

  constructor(
    private readonly inventoryStore: AdminInventoryStore,
    private readonly operationsStore: InventoryOperationsStore
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.inventoryStore.inventory$.subscribe(items => {
        this.masterInventory = items;
        this.ensurePageBounds();
      })
    );

    this.subscription.add(
      this.operationsStore.operations$.subscribe(() => {
        this.todaysOperation = this.operationsStore.getTodaysOperation('event');
        this.ensurePageBounds();
      })
    );

    this.subscription.add(
      this.operationsStore.auditLog$.subscribe(logs => {
        this.auditLogs = this.operationsStore.getAuditLogsByType('event');
        this.ensurePageBounds();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  openOperation(): void {
    if (this.selectedItems.size === 0) {
      this.feedback = 'Select at least one item to pull from master inventory.';
      return;
    }

    const items: OperationInventoryItem[] = [];
    this.selectedItems.forEach((quantity, inventoryItemId) => {
      const masterItem = this.masterInventory.find(item => item.id === inventoryItemId);
      if (masterItem && quantity > 0) {
        items.push({
          id: `event-${masterItem.id}-${Date.now()}`,
          inventoryItemId,
          name: masterItem.name,
          unit: masterItem.unit,
          pulledQuantity: quantity,
          currentQuantity: quantity,
          unitCost: masterItem.unitCost
        });
      }
    });

    try {
      this.operationsStore.openOperation('event', items, this.currentUser, this.operationNotes);
      this.feedback = 'Event operation opened successfully!';
      this.selectedItems.clear();
      this.operationNotes = '';
      setTimeout(() => (this.feedback = ''), 3000);
    } catch (error: any) {
      this.feedback = error.message;
    }
  }

  toggleItemSelection(itemId: number, quantity: number): void {
    if (quantity > 0) {
      this.selectedItems.set(itemId, quantity);
    } else {
      this.selectedItems.delete(itemId);
    }
  }

  toggleItemToAdd(itemId: number, quantity: number): void {
    if (quantity > 0) {
      this.selectedItemsToAdd.set(itemId, quantity);
    } else {
      this.selectedItemsToAdd.delete(itemId);
    }
  }

  addMoreItems(): void {
    if (!this.todaysOperation || this.selectedItemsToAdd.size === 0) {
      this.feedback = 'Select items to add to the operation.';
      return;
    }

    const items: OperationInventoryItem[] = [];
    this.selectedItemsToAdd.forEach((quantity, inventoryItemId) => {
      const masterItem = this.masterInventory.find(item => item.id === inventoryItemId);
      if (masterItem && quantity > 0) {
        items.push({
          id: `event-${masterItem.id}-${Date.now()}`,
          inventoryItemId,
          name: masterItem.name,
          unit: masterItem.unit,
          pulledQuantity: quantity,
          currentQuantity: quantity,
          unitCost: masterItem.unitCost
        });
      }
    });

    try {
      this.operationsStore.addItemsToOperation(this.todaysOperation.id, items, this.currentUser);
      this.feedback = 'Items added successfully!';
      this.selectedItemsToAdd.clear();
      setTimeout(() => (this.feedback = ''), 3000);
    } catch (error: any) {
      this.feedback = error.message;
    }
  }

  deductItem(itemId: string, quantity: number): void {
    if (!this.todaysOperation) {
      return;
    }

    const success = this.operationsStore.deductFromOperation(
      this.todaysOperation.id,
      itemId,
      quantity,
      this.currentUser,
      'Manual deduction'
    );

    if (!success) {
      this.feedback = 'Cannot deduct more than available quantity.';
    }
  }

  closeOperation(): void {
    if (!this.todaysOperation) {
      return;
    }

    const remaining = this.operationsStore.getRemainingItems(this.todaysOperation.id);
    if (remaining.length > 0) {
      const totalValue = remaining.reduce(
        (sum, item) => sum + item.currentQuantity * item.unitCost,
        0
      );
    }

    this.operationsStore.closeOperation(this.todaysOperation.id, this.currentUser, this.closeNotes);
    this.feedback = 'Event operation closed. Remaining items returned to master inventory.';
    this.todaysOperation = undefined;
    this.closeNotes = '';
    this.showCloseConfirm = false;
    setTimeout(() => (this.feedback = ''), 3000);
  }

  getOperationValue(operation: InventoryOperation): number {
    return operation.items.reduce((sum, item) => sum + item.currentQuantity * item.unitCost, 0);
  }

  getMasterQuantity(inventoryItemId: number): number {
    const item = this.masterInventory.find(i => i.id === inventoryItemId);
    return item ? item.quantity : 0;
  }

  get pagedOperationItems(): OperationInventoryItem[] {
    const start = (this.currentInventoryPage - 1) * this.pageSize;
    return (this.todaysOperation?.items ?? []).slice(start, start + this.pageSize);
  }

  get operationItemsTotalPages(): number {
    return this.getTotalPages(this.todaysOperation?.items.length ?? 0);
  }

  get pagedMasterInventory(): InventoryItem[] {
    const start = (this.pullInventoryPage - 1) * this.pageSize;
    return this.masterInventory.slice(start, start + this.pageSize);
  }

  get masterInventoryTotalPages(): number {
    return this.getTotalPages(this.masterInventory.length);
  }

  get pagedAuditLogs(): InventoryAuditLog[] {
    const start = (this.logsPage - 1) * this.pageSize;
    return this.auditLogs.slice(start, start + this.pageSize);
  }

  get auditLogTotalPages(): number {
    return this.getTotalPages(this.auditLogs.length);
  }

  setCurrentInventoryPage(page: number): void {
    this.currentInventoryPage = this.clampPage(page, this.operationItemsTotalPages);
  }

  setPullInventoryPage(page: number): void {
    this.pullInventoryPage = this.clampPage(page, this.masterInventoryTotalPages);
  }

  setLogsPage(page: number): void {
    this.logsPage = this.clampPage(page, this.auditLogTotalPages);
  }

  private ensurePageBounds(): void {
    this.currentInventoryPage = this.clampPage(this.currentInventoryPage, this.operationItemsTotalPages);
    this.pullInventoryPage = this.clampPage(this.pullInventoryPage, this.masterInventoryTotalPages);
    this.logsPage = this.clampPage(this.logsPage, this.auditLogTotalPages);
  }

  private getTotalPages(totalItems: number): number {
    return Math.max(1, Math.ceil(totalItems / this.pageSize));
  }

  private clampPage(page: number, totalPages: number): number {
    return Math.min(Math.max(page, 1), totalPages);
  }
}