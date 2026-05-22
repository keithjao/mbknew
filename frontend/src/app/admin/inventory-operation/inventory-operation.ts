import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AdminInventoryStore, InventoryItem, InventoryUnit } from '../data/admin-inventory.store';
import { AttendanceStore } from '../../shared/attendance/attendance.store';
import {
  InventoryOperationsStore,
  InventoryOperation,
  OperationInventoryItem,
  InventoryAuditLog
} from '../data/inventory-operations.store';
import { Order, OrdersStore, PaymentMethod } from '../data/orders.store';

type InventoryInstanceType = 'store' | 'popup' | 'event';

@Component({
  selector: 'app-inventory-operation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-operation.html',
  styleUrls: ['../store-inventory/store-inventory.scss']
})
export class InventoryOperationPage implements OnInit, OnDestroy {
  readonly pageSize = 10;
  masterInventory: InventoryItem[] = [];
  todaysOperation: InventoryOperation | undefined = undefined;
  auditLogs: InventoryAuditLog[] = [];
  orders: Order[] = [];

  selectedItems: Map<number, number> = new Map();
  selectedItemsToAdd: Map<number, number> = new Map();

  activeTab: 'overview' | 'pull' | 'logs' = 'overview';
  feedback = '';
  operationNotes = '';
  startingCash = 0; // Cash on hand at open
  endingCash = 0; // Cash on hand at close
  closeNotes = '';
  showCloseConfirm = false;
  currentInventoryPage = 1;
  pullInventoryPage = 1;
  logsPage = 1;

  private readonly subscription = new Subscription();
  private readonly route = inject(ActivatedRoute);
  private readonly attendanceStore = inject(AttendanceStore);
  private readonly inventoryType: InventoryInstanceType = this.resolveInventoryType();

  constructor(
    private readonly inventoryStore: AdminInventoryStore,
    private readonly operationsStore: InventoryOperationsStore,
    private readonly ordersStore: OrdersStore
  ) {}

  get displayTitle(): string {
    switch (this.inventoryType) {
      case 'popup':
        return 'Pop-up';
      case 'event':
        return 'Event';
      default:
        return 'Store';
    }
  }

  get inventoryLabel(): string {
    switch (this.inventoryType) {
      case 'popup':
        return 'pop-up';
      case 'event':
        return 'event';
      default:
        return 'store';
    }
  }

  get currentUserName(): string {
    return this.attendanceStore.getSignedInStaff()?.fullName
      || this.attendanceStore.getAppSession().actingStaffName
      || 'signed-in staff';
  }

  get showOperationTotalValue(): boolean {
    return this.attendanceStore.canAccessAdminRoute();
  }

  get operationStartingCash(): number {
    return this.sanitizeCashValue(this.todaysOperation?.startingCash ?? this.startingCash);
  }

  get operationCashSales(): number {
    return this.getCashSalesForOperation(this.todaysOperation);
  }

  get expectedClosingCash(): number {
    return Number((this.operationStartingCash + this.operationCashSales).toFixed(2));
  }

  get closingVariancePreview(): number {
    return Number((this.sanitizeCashValue(this.endingCash) - this.expectedClosingCash).toFixed(2));
  }

  ngOnInit(): void {
    this.subscription.add(
      this.inventoryStore.inventory$.subscribe(items => {
        this.masterInventory = items;
        this.ensurePageBounds();
      })
    );

    this.subscription.add(
      this.operationsStore.operations$.subscribe(() => {
        this.todaysOperation = this.operationsStore.getTodaysOperation(this.inventoryType);
        this.ensurePageBounds();
      })
    );

    this.subscription.add(
      this.operationsStore.auditLog$.subscribe(() => {
        this.auditLogs = this.operationsStore.getAuditLogsByType(this.inventoryType);
        this.ensurePageBounds();
      })
    );

    this.subscription.add(
      this.ordersStore.getAllOrders().subscribe(orders => {
        this.orders = orders;
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
          id: `${this.inventoryType}-${masterItem.id}-${Date.now()}`,
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
      this.operationsStore.openOperation(
        this.inventoryType,
        items,
        this.currentUserName,
        this.operationNotes,
        this.sanitizeCashValue(this.startingCash)
      );
      this.feedback = `${this.displayTitle} operation opened successfully!`;
      this.selectedItems.clear();
      this.operationNotes = '';
      this.startingCash = 0;
      setTimeout(() => (this.feedback = ''), 3000);
    } catch (error: unknown) {
      this.feedback = error instanceof Error ? error.message : 'unable to open operation.';
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
          id: `${this.inventoryType}-${masterItem.id}-${Date.now()}`,
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
      this.operationsStore.addItemsToOperation(this.todaysOperation.id, items, this.currentUserName);
      this.feedback = 'Items added successfully!';
      this.selectedItemsToAdd.clear();
      setTimeout(() => (this.feedback = ''), 3000);
    } catch (error: unknown) {
      this.feedback = error instanceof Error ? error.message : 'unable to add items.';
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
      this.currentUserName,
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

    const cashSalesTotal = this.operationCashSales;
    const expected = Number((this.operationStartingCash + cashSalesTotal).toFixed(2));
    const endingCash = this.sanitizeCashValue(this.endingCash);
    const variance = Number((endingCash - expected).toFixed(2));

    this.operationsStore.closeOperation(
      this.todaysOperation.id,
      this.currentUserName,
      this.closeNotes,
      endingCash,
      cashSalesTotal
    );
    this.feedback = `${this.displayTitle} operation closed. Cash variance: ₱${variance.toFixed(2)}.`;
    this.todaysOperation = undefined;
    this.closeNotes = '';
    this.endingCash = 0;
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

  private resolveInventoryType(): InventoryInstanceType {
    const rawType = String(this.route.snapshot.data['inventoryType'] ?? 'store').toLowerCase();
    if (rawType === 'popup' || rawType === 'event') {
      return rawType;
    }

    return 'store';
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

  private getCashSalesForOperation(operation: InventoryOperation | undefined): number {
    if (!operation) {
      return 0;
    }

    return this.orders
      .filter(order => order.source === operation.type)
      .filter(order => order.createdAt.slice(0, 10) === operation.date)
      .filter(order => order.status !== 'cancelled')
      .filter(order => order.paymentStatus === 'paid' || order.paymentStatus === 'partial')
      .reduce((sum, order) => {
        const cashAmount = this.ordersStore.getOrderPaymentBreakdown(order)
          .filter(split => split.method === PaymentMethod.CASH)
          .reduce((methodSum, split) => methodSum + split.amount, 0);
        return sum + cashAmount;
      }, 0);
  }

  private sanitizeCashValue(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Number(value.toFixed(2));
  }
}
