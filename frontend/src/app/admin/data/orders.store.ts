import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppClockStore } from '../../shared/testing/app-clock.store';
import { RemoteStateService } from '../../shared/state/remote-state.service';

export enum PaymentMethod {
  CASH = 'cash',
  GCASH = 'gcash',
  MAYA = 'maya'
}

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number; // Amount in Pesos
}

export interface PaymentMethodTotals {
  cash: number;
  gcash: number;
  maya: number;
}

export interface OrderItem {
  itemId: string;
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  guestId?: string;
  guestLabel?: string;
  notes?: string;
  subtotal: number;
}

export interface OrderInventoryMovement {
  operationId: string;
  operationType: 'store' | 'popup' | 'event';
  operationItemId: string;
  inventoryItemId: number;
  inventoryItemName: string;
  quantity: number;
  unit: string;
  restoredAt?: string;
}

export interface OrderCancellation {
  cancelledAt: string;
  cancelledBy: string;
  reason?: string;
  restocked: boolean;
}

export interface Order {
  id: string;
  createdAt: string;
  orderNumber: string;
  items: OrderItem[];
  status: 'queued' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  statusChangedAt: string;
  totalAmount: number;
  discountApplied: number;
  finalAmount: number;
  paymentStatus: 'pending' | 'paid' | 'partial';
  paymentMethods?: PaymentSplit[]; // Array of payment splits
  loyaltyPoints: number;
  notes?: string;
  source?: 'store' | 'popup' | 'event';
  inventoryMovements: OrderInventoryMovement[];
  cancellation?: OrderCancellation;
}

export interface QueueStats {
  totalQueued: number;
  totalPreparing: number;
  averageWaitTime: number;
  oldestOrder: number;
}

const STORAGE_KEY = 'mbk.orders.queue';
const ORDER_COUNTER_KEY = 'mbk.order.counter';
const CROSS_DEVICE_SYNC_INTERVAL_MS = 1000;

@Injectable({ providedIn: 'root' })
export class OrdersStore {
  private readonly remoteState = inject(RemoteStateService);
  private readonly ordersSubject = new BehaviorSubject<Order[]>(this.loadOrders());
  readonly orders$ = this.ordersSubject.asObservable();

  private readonly orderCounterSubject = new BehaviorSubject<number>(this.loadOrderCounter());
  readonly orderCounter$ = this.orderCounterSubject.asObservable();
  private isSyncInFlight = false;

  constructor(private readonly appClock: AppClockStore) {
    this.cleanupOldOrders();
    this.startCrossDeviceSync();
    this.listenToRealtimeStateMutations();
  }

  createOrder(
    items: OrderItem[],
    source: 'store' | 'popup' | 'event' = 'store',
    notes?: string,
    inventoryMovements: OrderInventoryMovement[] = [],
    additionalDiscount = 0,
    paymentMethods: PaymentSplit[] = []
  ): Order {
    const counter = this.orderCounterSubject.value + 1;
    this.orderCounterSubject.next(counter);
    this.persistOrderCounter(counter);

    const totalAmount = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const discountApplied = items.reduce((sum, item) => sum + item.discount, 0) + additionalDiscount;
    const finalAmount = Math.max(totalAmount - discountApplied, 0);

    const normalizedPaymentMethods = this.normalizePaymentMethods(paymentMethods, finalAmount);
    const paymentTotal = normalizedPaymentMethods.reduce((sum, split) => sum + split.amount, 0);
    const nowIso = this.appClock.isoNow();
    const newOrder: Order = {
      id: `order-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      createdAt: nowIso,
      orderNumber: `#${String(counter).padStart(4, '0')}`,
      items,
      status: 'queued',
      statusChangedAt: nowIso,
      totalAmount,
      discountApplied,
      finalAmount,
      paymentStatus: paymentTotal >= finalAmount && finalAmount > 0 ? 'paid' : 'pending',
      paymentMethods: normalizedPaymentMethods,
      loyaltyPoints: Math.floor(finalAmount / 10),
      notes,
      source,
      inventoryMovements
    };

    const nextOrders = [newOrder, ...this.ordersSubject.value];
    this.ordersSubject.next(nextOrders);
    this.persistOrders(nextOrders);

    return newOrder;
  }

  updateOrderStatus(
    orderId: string,
    newStatus: 'queued' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  ): Order | null {
    const orders = this.ordersSubject.value;
    let updatedOrder: Order | null = null;

    const nextOrders = orders.map(order => {
      if (order.id !== orderId) {
        return order;
      }

      updatedOrder = {
        ...order,
        status: newStatus,
        statusChangedAt: this.appClock.isoNow()
      };

      return updatedOrder;
    });

    this.ordersSubject.next(nextOrders);
    this.persistOrders(nextOrders);
    return updatedOrder;
  }

  updatePaymentStatus(orderId: string, paymentStatus: 'paid' | 'partial' | 'pending'): Order | null {
    const orders = this.ordersSubject.value;
    let updatedOrder: Order | null = null;

    const nextOrders = orders.map(order => {
      if (order.id !== orderId) {
        return order;
      }

      updatedOrder = {
        ...order,
        paymentStatus
      };

      return updatedOrder;
    });

    this.ordersSubject.next(nextOrders);
    this.persistOrders(nextOrders);
    return updatedOrder;
  }

  addItemToOrder(orderId: string, item: OrderItem): Order | null {
    const orders = this.ordersSubject.value;
    let updatedOrder: Order | null = null;

    const nextOrders = orders.map(order => {
      if (order.id !== orderId || order.status !== 'queued') {
        return order;
      }

      const newItems = [...order.items, item];
      const totalAmount = newItems.reduce((sum, entry) => sum + (entry.unitPrice * entry.quantity), 0);
      const discountApplied = newItems.reduce((sum, entry) => sum + entry.discount, 0);
      const finalAmount = Math.max(totalAmount - discountApplied, 0);

      updatedOrder = {
        ...order,
        items: newItems,
        totalAmount,
        discountApplied,
        finalAmount,
        loyaltyPoints: Math.floor(finalAmount / 10)
      };

      return updatedOrder;
    });

    this.ordersSubject.next(nextOrders);
    this.persistOrders(nextOrders);
    return updatedOrder;
  }

  getQueueStats(): QueueStats {
    const orders = this.ordersSubject.value;
    const activeOrders = orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled');
    const queuedOrders = activeOrders.filter(order => order.status === 'queued');
    const preparingOrders = activeOrders.filter(order => order.status === 'preparing');

    let averageWaitTime = 0;
    let oldestOrder = 0;

    if (activeOrders.length > 0) {
      const now = this.appClock.now().getTime();
      const waitTimes = activeOrders.map(order => (now - new Date(order.createdAt).getTime()) / (1000 * 60));
      averageWaitTime = Math.round(waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length);
      oldestOrder = Math.round(Math.max(...waitTimes));
    }

    return {
      totalQueued: queuedOrders.length,
      totalPreparing: preparingOrders.length,
      averageWaitTime,
      oldestOrder
    };
  }

  getOrdersByStatus(status: 'queued' | 'preparing' | 'ready' | 'completed' | 'cancelled'): Observable<Order[]> {
    return new Observable(observer => {
      const sub = this.orders$.subscribe(orders => {
        observer.next(orders.filter(order => order.status === status));
      });
      return () => sub.unsubscribe();
    });
  }

  getActiveOrders(): Observable<Order[]> {
    return new Observable(observer => {
      const sub = this.orders$.subscribe(orders => {
        observer.next(orders.filter(order => order.status !== 'completed' && order.status !== 'cancelled'));
      });
      return () => sub.unsubscribe();
    });
  }

  getResolvedOrders(): Observable<Order[]> {
    return new Observable(observer => {
      const sub = this.orders$.subscribe(orders => {
        observer.next(
          orders.filter(order => order.status === 'completed' || order.status === 'cancelled')
        );
      });
      return () => sub.unsubscribe();
    });
  }

  getOrderById(orderId: string): Order | null {
    return this.ordersSubject.value.find(order => order.id === orderId) || null;
  }

  cancelOrder(
    orderId: string,
    restocked: boolean = false,
    cancelledBy = 'Queue Board',
    reason?: string
  ): Order | null {
    const order = this.getOrderById(orderId);
    if (!order || order.status === 'completed' || order.status === 'cancelled') {
      return null;
    }

    const cancelledAt = this.appClock.isoNow();
    let cancelledOrder: Order | null = null;

    const nextOrders = this.ordersSubject.value.map(existingOrder => {
      if (existingOrder.id !== orderId) {
        return existingOrder;
      }

      cancelledOrder = {
        ...existingOrder,
        status: 'cancelled',
        statusChangedAt: cancelledAt,
        inventoryMovements: existingOrder.inventoryMovements.map(movement =>
          restocked && !movement.restoredAt ? { ...movement, restoredAt: cancelledAt } : movement
        ),
        cancellation: {
          cancelledAt,
          cancelledBy,
          reason,
          restocked
        }
      };

      return cancelledOrder;
    });

    this.ordersSubject.next(nextOrders);
    this.persistOrders(nextOrders);
    return cancelledOrder;
  }

  clearCompletedOrders(): number {
    const nextOrders = this.ordersSubject.value.filter(
      order => order.status !== 'completed' && order.status !== 'cancelled'
    );
    const removedCount = this.ordersSubject.value.length - nextOrders.length;
    this.ordersSubject.next(nextOrders);
    this.persistOrders(nextOrders);
    return removedCount;
  }

  getAllOrders(): Observable<Order[]> {
    return this.orders$;
  }

  getTodaysOrders(): Order[] {
    const today = this.appClock.now();
    today.setHours(0, 0, 0, 0);

    return this.ordersSubject.value.filter(order => {
      const orderDate = new Date(order.createdAt);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });
  }

  getDailySalesTotal(): number {
    return this.getTodaysOrders()
      .filter(order => order.paymentStatus === 'paid' || order.paymentStatus === 'partial')
      .reduce((sum, order) => sum + order.finalAmount, 0);
  }

  getOrderPaymentBreakdown(order: Order): PaymentSplit[] {
    const normalized = this.normalizePaymentMethods(order.paymentMethods ?? [], order.finalAmount ?? 0);
    if (normalized.length > 0) {
      return normalized;
    }

    // Backward compatibility for legacy paid orders that were saved without explicit split data.
    if ((order.paymentStatus === 'paid' || order.paymentStatus === 'partial') && order.finalAmount > 0) {
      return [{ method: PaymentMethod.CASH, amount: order.finalAmount }];
    }

    return [];
  }

  getPaymentMethodTotals(orders: Order[]): PaymentMethodTotals {
    return orders.reduce<PaymentMethodTotals>((totals, order) => {
      const breakdown = this.getOrderPaymentBreakdown(order);
      breakdown.forEach(split => {
        if (split.method === PaymentMethod.CASH) {
          totals.cash += split.amount;
        } else if (split.method === PaymentMethod.GCASH) {
          totals.gcash += split.amount;
        } else if (split.method === PaymentMethod.MAYA) {
          totals.maya += split.amount;
        }
      });
      return totals;
    }, { cash: 0, gcash: 0, maya: 0 });
  }

  getOrdersByPaymentStatus(status: 'paid' | 'partial' | 'pending'): Order[] {
    return this.getTodaysOrders().filter(order => order.paymentStatus === status);
  }

  private loadOrders(): Order[] {
    try {
      return (this.remoteState.getState<Partial<Order>[]>(STORAGE_KEY, [])).map(order => ({
        id: order.id ?? `order-${Date.now()}`,
        createdAt: order.createdAt ?? this.appClock.isoNow(),
        orderNumber: order.orderNumber ?? '#0000',
        items: (order.items ?? []).map(item => ({
          itemId: item.itemId ?? '',
          itemName: item.itemName ?? '',
          category: item.category ?? '',
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice ?? 0,
          discount: item.discount ?? 0,
          guestId: item.guestId,
          guestLabel: item.guestLabel,
          notes: item.notes,
          subtotal: item.subtotal ?? Math.max((item.unitPrice ?? 0) * (item.quantity ?? 1) - (item.discount ?? 0), 0)
        })),
        status: order.status ?? 'queued',
        statusChangedAt: order.statusChangedAt ?? order.createdAt ?? this.appClock.isoNow(),
        totalAmount: order.totalAmount ?? 0,
        discountApplied: order.discountApplied ?? 0,
        finalAmount: order.finalAmount ?? 0,
        paymentStatus: order.paymentStatus ?? 'pending',
        paymentMethods: this.normalizePaymentMethods(order.paymentMethods ?? [], order.finalAmount ?? 0),
        loyaltyPoints: order.loyaltyPoints ?? 0,
        notes: order.notes,
        source: order.source,
        inventoryMovements: order.inventoryMovements ?? [],
        cancellation: order.cancellation
      }));
    } catch {
      return [];
    }
  }

  private normalizePaymentMethods(splits: PaymentSplit[], finalAmount: number): PaymentSplit[] {
    const validSplits = (Array.isArray(splits) ? splits : [])
      .filter(split => this.isPaymentMethod(split?.method) && Number.isFinite(split?.amount) && split.amount > 0)
      .map(split => ({
        method: split.method,
        amount: Number(split.amount.toFixed(2))
      }));

    if (validSplits.length === 0) {
      return [];
    }

    const grouped = new Map<PaymentMethod, number>();
    validSplits.forEach(split => {
      grouped.set(split.method, (grouped.get(split.method) ?? 0) + split.amount);
    });

    const normalized = Array.from(grouped.entries()).map(([method, amount]) => ({
      method,
      amount: Number(amount.toFixed(2))
    }));

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      return normalized;
    }

    const totalPaid = normalized.reduce((sum, split) => sum + split.amount, 0);
    if (totalPaid <= finalAmount + 0.01) {
      return normalized;
    }

    const scale = finalAmount / totalPaid;
    return normalized.map(split => ({
      method: split.method,
      amount: Number((split.amount * scale).toFixed(2))
    }));
  }

  private isPaymentMethod(value: unknown): value is PaymentMethod {
    return value === PaymentMethod.CASH
      || value === PaymentMethod.GCASH
      || value === PaymentMethod.MAYA;
  }

  private persistOrders(orders: Order[]): void {
    this.remoteState.setState(STORAGE_KEY, orders);
  }

  private loadOrderCounter(): number {
    try {
      return this.remoteState.getState<number>(ORDER_COUNTER_KEY, 0);
    } catch {
      return 0;
    }
  }

  private persistOrderCounter(counter: number): void {
    this.remoteState.setState(ORDER_COUNTER_KEY, counter);
  }

  private cleanupOldOrders(): void {
    const orders = this.ordersSubject.value;
    const oneHourAgo = new Date(this.appClock.now().getTime() - 60 * 60 * 1000);

    const nextOrders = orders.filter(order => {
      if (order.status === 'completed' || order.status === 'cancelled') {
        return new Date(order.statusChangedAt) > oneHourAgo;
      }

      return true;
    });

    if (nextOrders.length !== orders.length) {
      this.ordersSubject.next(nextOrders);
      this.persistOrders(nextOrders);
    }
  }

  private startCrossDeviceSync(): void {
    void this.syncFromRemote();

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        void this.syncFromRemote();
      });

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          void this.syncFromRemote();
        }
      });
    }

    setInterval(() => {
      void this.syncFromRemote();
    }, CROSS_DEVICE_SYNC_INTERVAL_MS);
  }

  async syncNow(): Promise<void> {
    await this.syncFromRemote();
  }

  private listenToRealtimeStateMutations(): void {
    this.remoteState.stateEvents$.subscribe(event => {
      const affectsOrders = event.type === 'reset'
        ? (event.keys?.includes(STORAGE_KEY) ?? false)
          || (event.keys?.includes(ORDER_COUNTER_KEY) ?? false)
          || (event.prefixes?.some(prefix => STORAGE_KEY.startsWith(prefix) || ORDER_COUNTER_KEY.startsWith(prefix)) ?? false)
        : event.key === STORAGE_KEY || event.key === ORDER_COUNTER_KEY;

      if (affectsOrders) {
        void this.syncFromRemote();
      }
    });
  }

  private async syncFromRemote(): Promise<void> {
    if (this.isSyncInFlight) {
      return;
    }

    this.isSyncInFlight = true;
    try {
      const [remoteOrders, remoteCounter] = await Promise.all([
        this.remoteState.refreshKey<Order[]>(STORAGE_KEY),
        this.remoteState.refreshKey<number>(ORDER_COUNTER_KEY)
      ]);

      if (remoteOrders && !this.areOrdersEqual(remoteOrders, this.ordersSubject.value)) {
        this.ordersSubject.next(remoteOrders);
      }

      if (Number.isFinite(remoteCounter) && remoteCounter !== this.orderCounterSubject.value) {
        this.orderCounterSubject.next(remoteCounter as number);
      }
    } finally {
      this.isSyncInFlight = false;
    }
  }

  private areOrdersEqual(left: Order[], right: Order[]): boolean {
    if (left.length !== right.length) {
      return false;
    }

    return JSON.stringify(left) === JSON.stringify(right);
  }
}
