import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  AdminInventoryStore,
  InventoryItem,
  InventoryUnit
} from '../data/admin-inventory.store';
import { FinanceStore } from '../data/finance.store';
import { InventorySessionStore, InventoryLog } from '../data/inventory-session.store';

@Component({
  selector: 'app-master-inventory',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./master-inventory.scss'],
  templateUrl: './master-inventory.html'
})
export class MasterInventory {
  readonly pageSize = 10;

  inventory: InventoryItem[] = [];
  deleteTarget: InventoryItem | null = null;
  feedback = '';
  logs: InventoryLog[] = [];
  editingItemId: number | null = null;
  inventoryPage = 1;
  logPage = 1;
  private readonly subscription = new Subscription();


  constructor(
    private readonly store: AdminInventoryStore,
    private readonly financeStore: FinanceStore,
    private readonly sessionStore: InventorySessionStore
  ) {
    this.subscription.add(this.store.inventory$.subscribe(items => {
      this.inventory = items;
      this.ensurePageBounds();
    }));
    this.subscription.add(this.sessionStore.logs$.subscribe(logs => {
      this.logs = logs;
      this.ensurePageBounds();
    }));
    this.fetchLogs();
  }

  fetchLogs(): void {
    this.sessionStore.fetchLogs();
  }

  addItem(name: string, quantity: number, unit: string, unitCost: number, form: HTMLFormElement): void {
    if (!name.trim() || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      this.feedback = 'enter valid name, quantity, and price per unit.';
      return;
    }

    this.store.addInventoryItem({
      name,
      quantity,
      unit: unit as InventoryUnit,
      unitCost
    });

    this.financeStore.recordSpending(
      quantity * unitCost,
      `initial stock: ${name.trim().toLowerCase()}`,
      'inventory'
    );

    this.feedback = 'item added to master inventory.';
    form.reset();
  }

  addStock(id: number, amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      this.feedback = 'enter a valid quantity.';
      return;
    }

    const item = this.store.getInventoryItemById(id);
    const didAdjust = this.store.adjustInventory(id, amount);

    if (didAdjust && item) {
      this.financeStore.recordSpending(
        amount * item.unitCost,
        `restock: ${item.name}`,
        'inventory'
      );
    }

    this.feedback = didAdjust
      ? 'stock added.'
      : 'unable to add stock for this item.';
  }

  deductItem(id: number, amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      this.feedback = 'enter a valid deduction quantity.';
      return;
    }

    const didDeduct = this.store.adjustInventory(id, -amount);
    this.feedback = didDeduct
      ? 'stock deducted.'
      : 'deduction exceeds available inventory.';
  }

  openDeleteDialog(item: InventoryItem): void {
    this.deleteTarget = item;
    this.feedback = '';
  }

  closeDeleteDialog(): void {
    this.deleteTarget = null;
  }

  confirmDelete(typedName: string): void {
    if (!this.deleteTarget) {
      return;
    }

    if (typedName.trim().toLowerCase() !== this.deleteTarget.name.trim().toLowerCase()) {
      this.feedback = `type "${this.deleteTarget.name}" exactly to delete this inventory item.`;
      return;
    }

    const deletedName = this.deleteTarget.name;
    this.store.deleteInventoryItem(this.deleteTarget.id);
    this.closeDeleteDialog();
    this.feedback = `${deletedName} removed from master inventory.`;
  }

  deleteItem(id: number): void {
    const target = this.inventory.find(item => item.id === id);
    if (!target) {
      this.feedback = 'inventory item not found.';
      return;
    }

    this.openDeleteDialog(target);
  }

  startEdit(item: InventoryItem): void {
    this.editingItemId = item.id;
    this.feedback = '';
  }

  cancelEdit(): void {
    this.editingItemId = null;
  }

  saveEdit(id: number, name: string, quantity: number, unit: string, unitCost: number): void {
    const didUpdate = this.store.updateInventoryItem(id, {
      name,
      quantity,
      unit: unit as InventoryUnit,
      unitCost
    });

    this.feedback = didUpdate
      ? 'inventory item updated.'
      : 'enter valid inventory name, quantity, unit, and cost.';

    if (didUpdate) {
      this.editingItemId = null;
    }
  }

  get pagedInventory(): InventoryItem[] {
    const start = (this.inventoryPage - 1) * this.pageSize;
    return this.inventory.slice(start, start + this.pageSize);
  }

  get inventoryTotalPages(): number {
    return this.getTotalPages(this.inventory.length);
  }

  get pagedLogs(): InventoryLog[] {
    const start = (this.logPage - 1) * this.pageSize;
    return this.logs.slice(start, start + this.pageSize);
  }

  get logTotalPages(): number {
    return this.getTotalPages(this.logs.length);
  }

  setInventoryPage(page: number): void {
    this.inventoryPage = this.clampPage(page, this.inventoryTotalPages);
  }

  setLogPage(page: number): void {
    this.logPage = this.clampPage(page, this.logTotalPages);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private ensurePageBounds(): void {
    this.inventoryPage = this.clampPage(this.inventoryPage, this.inventoryTotalPages);
    this.logPage = this.clampPage(this.logPage, this.logTotalPages);
  }

  private getTotalPages(totalItems: number): number {
    return Math.max(1, Math.ceil(totalItems / this.pageSize));
  }

  private clampPage(page: number, totalPages: number): number {
    return Math.min(Math.max(page, 1), totalPages);
  }
}