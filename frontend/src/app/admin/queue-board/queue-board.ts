import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { InventoryOperationsStore } from '../data/inventory-operations.store';
import { OrdersStore, Order, OrderItem, PaymentMethod } from '../data/orders.store';
import { AppClockStore } from '../../shared/testing/app-clock.store';
import { OperationType } from '../data/inventory-operations.store';

type QueueSourceFilter = 'all' | OperationType;

@Component({
  selector: 'app-queue-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './queue-board.html',
  styleUrls: ['./queue-board.scss']
})
export class QueueBoard implements OnInit, OnDestroy {
  readonly sourceFilters: Array<{ value: QueueSourceFilter; label: string }> = [
    { value: 'all', label: 'All inventories' },
    { value: 'store', label: 'Store' },
    { value: 'popup', label: 'Pop-up' },
    { value: 'event', label: 'Event' }
  ];

  selectedSourceFilter: QueueSourceFilter = 'all';

  allOrders: Order[] = [];
  queuedOrders: Order[] = [];
  preparingOrders: Order[] = [];
  readyOrders: Order[] = [];
  resolvedOrders: Order[] = [];

  selectedOrder: Order | null = null;
  showOrderDetail = false;

  private readonly subscription = new Subscription();
  private refreshIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    public ordersStore: OrdersStore,
    private readonly inventoryOperationsStore: InventoryOperationsStore,
    private readonly appClock: AppClockStore
  ) {
    this.subscription.add(
      this.ordersStore.orders$.subscribe(orders => {
        this.allOrders = orders;
        this.refreshVisibleOrders();
      })
    );
  }

  ngOnInit(): void {
    void this.ordersStore.syncNow();
    this.refreshIntervalId = setInterval(() => {
      void this.ordersStore.syncNow();
    }, 1200);
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
    this.subscription.unsubscribe();
  }

  setSourceFilter(value: QueueSourceFilter): void {
    this.selectedSourceFilter = value;
    this.refreshVisibleOrders();
  }

  get filteredSourceLabel(): string {
    return this.selectedSourceFilter === 'all'
      ? 'all inventories'
      : this.selectedSourceFilter === 'popup'
        ? 'pop-up inventory'
        : `${this.selectedSourceFilter} inventory`;
  }

  startPreparing(order: Order): void {
    this.ordersStore.updateOrderStatus(order.id, 'preparing');
  }

  moveBackToQueued(order: Order): void {
    this.ordersStore.updateOrderStatus(order.id, 'queued');
  }

  markReady(order: Order): void {
    this.ordersStore.updateOrderStatus(order.id, 'ready');
  }

  markComplete(order: Order): void {
    this.ordersStore.updateOrderStatus(order.id, 'completed');
  }

  cancelOrder(order: Order): void {
    const restockEligible = this.canRestockOrder(order);
    const confirmation = restockEligible
      ? `Cancel ${order.orderNumber} and restore deducted ingredients to the ${order.source ?? 'current'} inventory?`
      : `Cancel ${order.orderNumber}? Inventory will not be restored.`;

    if (!confirm(confirmation)) {
      return;
    }

    if (restockEligible && !this.canRestoreInventory(order)) {
      alert('Unable to restore inventory for this order. No changes were saved.');
      return;
    }

    if (restockEligible && !this.restoreInventory(order)) {
      alert('Unable to restore inventory for this order. No changes were saved.');
      return;
    }

    this.ordersStore.cancelOrder(
      order.id,
      restockEligible,
      'Queue Board',
      restockEligible ? 'Cancelled before preparation started' : 'Cancelled after preparation started'
    );
  }

  viewOrderDetails(order: Order): void {
    this.selectedOrder = order;
    this.showOrderDetail = true;
  }

  closeOrderDetail(): void {
    this.showOrderDetail = false;
    this.selectedOrder = null;
  }

  getWaitTime(order: Order): string {
    const elapsed = (this.appClock.now().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60);
    const minutes = Math.floor(elapsed);
    const seconds = Math.floor((elapsed - minutes) * 60);
    return `${minutes}m ${seconds}s`;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getItemTotal(unitPrice: number, quantity: number, discount: number): number {
    return (unitPrice * quantity) - discount;
  }

  getOrderPaymentSummary(order: Order): string {
    const splits = this.ordersStore.getOrderPaymentBreakdown(order);
    if (splits.length === 0) {
      return 'No payment data';
    }

    return splits
      .map(split => `${this.getPaymentMethodLabel(split.method)} ₱${split.amount.toFixed(2)}`)
      .join(' • ');
  }

  getOrderPaymentCompactLabel(order: Order): string {
    const splits = this.ordersStore.getOrderPaymentBreakdown(order);
    if (splits.length === 0) {
      return 'No payment';
    }

    return splits.map(split => this.getPaymentMethodLabel(split.method)).join(' + ');
  }

  getPaymentMethodLabel(method: PaymentMethod): string {
    if (method === PaymentMethod.CASH) {
      return 'Cash';
    }

    if (method === PaymentMethod.GCASH) {
      return 'GCash';
    }

    if (method === PaymentMethod.MAYA) {
      return 'Maya';
    }

    return 'Unknown';
  }

  clearResolvedOrders(): void {
    const removedCount = this.ordersStore.clearCompletedOrders();
    if (removedCount === 0) {
      alert('There are no resolved orders to clear.');
    }
  }

  getResolvedTimestamp(order: Order): string {
    return order.cancellation?.cancelledAt || order.statusChangedAt;
  }

  canRestockOrder(order: Order): boolean {
    return order.status === 'queued' && order.inventoryMovements.some(movement => !movement.restoredAt);
  }

  getGuestSummary(order: Order): string {
    const summary = new Map<string, { label: string; count: number }>();

    order.items.forEach(item => {
      const key = item.guestId || item.guestLabel || 'guest-general';
      const label = item.guestLabel || 'General';
      const current = summary.get(key);

      if (current) {
        current.count += item.quantity;
      } else {
        summary.set(key, { label, count: item.quantity });
      }
    });

    return Array.from(summary.values())
      .map(group => `${group.label} · ${group.count}`)
      .join(' • ');
  }

  getGuestProgressLabel(order: Order, item: OrderItem): string {
    const guestKey = item.guestId || item.guestLabel || item.itemId;
    const guestItems = order.items.filter(candidate => {
      const candidateKey = candidate.guestId || candidate.guestLabel || candidate.itemId;
      return candidateKey === guestKey;
    });
    const position = guestItems.findIndex(candidate => candidate === item) + 1;
    const label = item.guestLabel || 'General';

    return `${label} ${position}/${guestItems.length}`;
  }

  trackByOrderId(index: number, order: Order): string {
    return order.id;
  }

  trackByItemId(index: number, item: OrderItem): string {
    return item.itemId + index;
  }

  private refreshVisibleOrders(): void {
    const visibleOrders = this.selectedSourceFilter === 'all'
      ? this.allOrders
      : this.allOrders.filter(order => order.source === this.selectedSourceFilter);

    this.queuedOrders = visibleOrders.filter(order => order.status === 'queued');
    this.preparingOrders = visibleOrders.filter(order => order.status === 'preparing');
    this.readyOrders = visibleOrders.filter(order => order.status === 'ready');
    this.resolvedOrders = visibleOrders.filter(order => order.status === 'completed' || order.status === 'cancelled');
  }

  private restoreInventory(order: Order): boolean {
    const pendingMovements = order.inventoryMovements.filter(movement => !movement.restoredAt);

    return pendingMovements.every(movement =>
      this.inventoryOperationsStore.restoreToOperation(
        movement.operationId,
        movement.operationItemId,
        movement.quantity,
        'Queue Board',
        `Restored after cancelling order ${order.orderNumber}`
      )
    );
  }

  private canRestoreInventory(order: Order): boolean {
    const operations = this.inventoryOperationsStore.getAllOperations();

    return order.inventoryMovements
      .filter(movement => !movement.restoredAt)
      .every(movement => {
        const operation = operations.find(candidate => candidate.id === movement.operationId);
        return !!operation?.items.some(item => item.id === movement.operationItemId);
      });
  }
}