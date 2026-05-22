import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminInventoryStore, MenuDefinition } from '../data/admin-inventory.store';
import { FinanceStore } from '../data/finance.store';
import { QrScanner } from './qr-scanner';
import { LoyaltyCustomer, LoyaltyStore } from '../data/loyalty.store';
import { InventoryAuditLog, InventoryOperation, InventoryOperationsStore, OperationType } from '../data/inventory-operations.store';
import { OrdersStore, OrderItem, Order, OrderInventoryMovement, PaymentMethod, PaymentSplit } from '../data/orders.store';
import { AttendanceStore, StaffAccount, StaffAppSession } from '../../shared/attendance/attendance.store';
import { StaffBudgetStore, WastageRecord } from '../../shared/staff/staff-budget.store';
import { ActionLogStore } from '../../shared/logging/action-log.store';

interface PosOrderItem {
  menuId: number;
  name: string;
  category: string;
  price: number;
  discount: number; // Amount in Pesos, not percentage
  ingredients: MenuDefinition['ingredients'];
  guestId: string;
  guestLabel: string;
}

interface PosGuestTag {
  id: string;
  label: string;
}

interface PosOrderGroup {
  guestId: string;
  label: string;
  items: PosOrderItem[];
}

interface PosOrderGroupView extends PosOrderGroup {
  itemCount: number;
  itemIndexes: number[];
}

interface PosMenuStatus {
  remainingOrders: number | null;
  outOfStock: boolean;
  lowStock: boolean;
}

interface InventoryOption {
  type: OperationType;
  label: string;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, QrScanner],
  templateUrl: './pos.html',
  styleUrl: './pos.scss'
})
export class Pos implements OnInit, OnDestroy {
  readonly PaymentMethod = PaymentMethod; // Expose enum to template
  menuItems: MenuDefinition[] = [];
  orderItems: PosOrderItem[] = [];
  orderGroups: PosOrderGroupView[] = [];
  recentOrders: Order[] = [];
  staffAccounts: StaffAccount[] = [];
  wastageRecords: WastageRecord[] = [];
  guestTags: PosGuestTag[] = [];
  guestItemCounts: Record<string, number> = {};
  inventorySource: 'store' | 'popup' | 'event' = 'store';
  availableInventoryOptions: InventoryOption[] = [];
  activeGuestLabel = '';
  operationStatus = '';
  isOperationActive = false;
  appSession: StaffAppSession;
  operatorCode = '';
  operatorPin = '';
  menuSearch = '';
  selectedMenuCategory = 'all';
  selectedMenuStatus = 'all';
  wastageMenuId: number | null = null;
  wastageQuantity = 1;
  wastageReason = '';
  wastageNotes = '';
  wastageAssignments: Record<string, string> = {};
  showQrScanner = false;
  loyaltyCustomer: LoyaltyCustomer | null = null;
  feedback = '';
  total = 0;
  itemDiscountTotal = 0;
  discountAmount = 0;
  finalTotal = 0;
  orderNotes = '';
  guestLabelDraft = '';
  activeGuestId = '';
  menuStatusById: Record<number, PosMenuStatus> = {};
  paymentMethods: PaymentSplit[] = []; // Track split payments
  showPaymentModal = false; // Show payment entry modal
  activeOrderTab: 'order' | 'payment' = 'order'; // Tab state for order panel
  wastageFilter: 'all' | 'open' | 'charged' = 'all'; // Filter for waste board
  private nextGuestNumber = 1;
  private readonly subscription = new Subscription();

  constructor(
    private readonly store: AdminInventoryStore,
    private readonly financeStore: FinanceStore,
    private readonly loyaltyStore: LoyaltyStore,
    private readonly operationsStore: InventoryOperationsStore,
    private readonly ordersStore: OrdersStore,
    private readonly attendanceStore: AttendanceStore,
    private readonly staffBudgetStore: StaffBudgetStore,
    private readonly actionLogStore: ActionLogStore
  ) {
    this.appSession = this.attendanceStore.getAppSession();
    this.refreshInventoryOptions();
  }

  ngOnInit(): void {
    this.resetGuestTags();

    this.subscription.add(this.store.menuItems$.subscribe(items => {
      this.menuItems = items;
      this.wastageMenuId = this.wastageMenuId && items.some(item => item.id === this.wastageMenuId)
        ? this.wastageMenuId
        : items[0]?.id ?? null;
      this.refreshMenuStatuses();
    }));

    this.subscription.add(this.attendanceStore.staff$.subscribe(staff => {
      this.staffAccounts = staff
        .filter(entry => entry.active)
        .sort((left, right) => left.fullName.localeCompare(right.fullName));
      this.refreshWastageAssignments();
    }));

    this.subscription.add(this.attendanceStore.appSession$.subscribe(session => {
      this.appSession = session;
      this.refreshWastageAssignments();
    }));

    this.subscription.add(this.staffBudgetStore.wastage$.subscribe(records => {
      this.wastageRecords = [...records].sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
      this.refreshWastageAssignments();
    }));

    this.subscription.add(this.ordersStore.getActiveOrders().subscribe(orders => {
      // Show last 5 active orders
      this.recentOrders = orders.slice(0, 5);
    }));

    this.subscription.add(this.operationsStore.operations$.subscribe(() => {
      this.refreshInventoryOptions();
      this.refreshOperationStatus();
      this.refreshMenuStatuses();
    }));

    this.refreshOperationStatus();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  addToOrder(item: MenuDefinition): void {
    if (!this.isOperationActive) {
      this.feedback = `❌ Open a ${this.inventorySource} inventory session before adding items`;
      setTimeout(() => (this.feedback = ''), 4000);
      return;
    }

    if (!item.available) {
      this.feedback = '❌ Item is marked not available';
      setTimeout(() => (this.feedback = ''), 3000);
      return;
    }

    if (this.getMenuStatus(item).outOfStock) {
      this.feedback = `❌ ${item.name} is out of stock in the current ${this.inventorySource} inventory`;
      setTimeout(() => (this.feedback = ''), 3000);
      return;
    }

    const activeGuest = this.ensureActiveGuestTag();

    this.orderItems = [
      ...this.orderItems,
      {
        menuId: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        discount: 0,
        ingredients: item.ingredients,
        guestId: activeGuest.id,
        guestLabel: activeGuest.label
      }
    ];
    this.computeTotal();
    this.refreshOrderView();
  }

  removeOrderItem(index: number): void {
    this.orderItems = this.orderItems.filter((_, i) => i !== index);
    this.computeTotal();
    this.refreshOrderView();
  }

  setInventorySource(value: string): void {
    if (value === 'store' || value === 'popup' || value === 'event') {
      this.inventorySource = value;
      this.refreshOperationStatus();
      this.refreshMenuStatuses();
    }
  }

  get currentInventoryLabel(): string {
    return this.availableInventoryOptions.find(option => option.type === this.inventorySource)?.label
      ?? this.getInventoryLabel(this.inventorySource);
  }

  get menuCategories(): string[] {
    return [...new Set(this.menuItems.map(item => item.category))].sort((left, right) => left.localeCompare(right));
  }

  get currentStaffName(): string {
    return this.currentOperator?.fullName || 'No operator signed in';
  }

  get currentOperator(): StaffAccount | undefined {
    const actingStaffId = this.appSession.actingStaffId;
    return actingStaffId ? this.staffAccounts.find(staff => staff.id === actingStaffId) : undefined;
  }

  get hasOperatorSession(): boolean {
    return !!this.currentOperator && this.attendanceStore.canAccessFeature('pos');
  }

  get selectedWastageMenuItem(): MenuDefinition | null {
    return this.menuItems.find(item => item.id === this.wastageMenuId) ?? null;
  }

  get openWastageCount(): number {
    return this.wastageRecords.filter(r => r.status === 'open').length;
  }

  get filteredWastageRecords(): WastageRecord[] {
    if (this.wastageFilter === 'open') return this.wastageRecords.filter(r => r.status === 'open');
    if (this.wastageFilter === 'charged') return this.wastageRecords.filter(r => r.status !== 'open');
    return this.wastageRecords;
  }

  get filteredMenuItems(): MenuDefinition[] {
    const normalizedSearch = this.menuSearch.trim().toLowerCase();

    return this.menuItems.filter(item => {
      const status = this.getMenuStatus(item);
      const matchesSearch = !normalizedSearch
        || item.name.toLowerCase().includes(normalizedSearch)
        || item.category.toLowerCase().includes(normalizedSearch)
        || item.notes.toLowerCase().includes(normalizedSearch);
      const matchesCategory = this.selectedMenuCategory === 'all' || item.category === this.selectedMenuCategory;
      const matchesStatus = this.selectedMenuStatus === 'all'
        || (this.selectedMenuStatus === 'available' && item.available && !status.outOfStock)
        || (this.selectedMenuStatus === 'not-available' && !item.available)
        || (this.selectedMenuStatus === 'out-of-stock' && status.outOfStock)
        || (this.selectedMenuStatus === 'low-stock' && status.lowStock);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }

  getMenuStatus(item: MenuDefinition): PosMenuStatus {
    return this.menuStatusById[item.id] ?? {
      remainingOrders: null,
      outOfStock: false,
      lowStock: false
    };
  }

  applyDiscount(discountAmount: number): void {
    this.discountAmount = Math.min(discountAmount, this.total);
    this.computeTotal();
  }

  applyDiscountPercentage(percentage: number): void {
    this.discountAmount = (this.total * percentage) / 100;
    this.computeTotal();
  }

  onQrScanned(qrValue: string): void {
    this.loyaltyCustomer = this.loyaltyStore.fetchCustomerByQr(qrValue);
    this.showQrScanner = false;

    if (this.loyaltyCustomer) {
      this.guestLabelDraft = this.loyaltyCustomer.name;
      this.activeGuestLabel = this.loyaltyCustomer.name;

      if (this.orderItems.length > 0 || this.activeGuestId) {
        this.onGuestLabelInput(this.loyaltyCustomer.name);
      }
    }

    this.feedback = this.loyaltyCustomer
      ? `✓ Loyalty customer linked: ${this.loyaltyCustomer.name}`
      : '❌ Customer QR not found';
    setTimeout(() => (this.feedback = ''), 4000);
  }

  signInOperator(): void {
    const staff = this.attendanceStore.getStaffByCode(this.operatorCode);
    if (!staff || !staff.active) {
      this.setFeedback('❌ Enter a valid active staff code to sign in.', 4000);
      return;
    }

    const result = this.attendanceStore.signInPosSession(staff.id, this.operatorPin);
    this.setFeedback(result.ok ? `✓ ${result.message}` : `❌ ${result.message}`, result.ok ? 3000 : 4000);

    if (result.ok) {
      this.operatorCode = '';
      this.operatorPin = '';
    }
  }

  signOutOperator(): void {
    const operatorName = this.currentStaffName;
    this.attendanceStore.signOutStaffSession();
    this.setFeedback(`✓ ${operatorName} signed out.`, 3000);
  }

  clearOrder(): void {
    this.orderItems = [];
    this.total = 0;
    this.itemDiscountTotal = 0;
    this.discountAmount = 0;
    this.finalTotal = 0;
    this.loyaltyCustomer = null;
    this.orderNotes = '';
    this.paymentMethods = [];
    this.showPaymentModal = false;
    this.activeOrderTab = 'order';
    this.resetGuestTags();
    this.refreshOrderView();
  }

  addPaymentSplit(method: PaymentMethod | string, amount: number): void {
    const paymentMethod = this.parsePaymentMethod(method);
    if (!paymentMethod) {
      this.setFeedback('❌ Select a valid payment method.', 3000);
      return;
    }

    const remaining = this.getRemainingPaymentAmount();
    if (remaining <= 0) {
      this.setFeedback('❌ Order is already fully paid.', 3000);
      return;
    }

    const useExactRemaining = !Number.isFinite(amount) || amount <= 0;
    const sanitizedAmount = Number((useExactRemaining ? remaining : amount).toFixed(2));
    const existingIndex = this.paymentMethods.findIndex(split => split.method === paymentMethod);

    if (existingIndex >= 0) {
      const nextPaymentMethods = [...this.paymentMethods];
      nextPaymentMethods[existingIndex] = {
        method: paymentMethod,
        amount: Number((nextPaymentMethods[existingIndex].amount + sanitizedAmount).toFixed(2))
      };
      this.paymentMethods = nextPaymentMethods;
    } else {
      this.paymentMethods = [...this.paymentMethods, { method: paymentMethod, amount: sanitizedAmount }];
    }

    if (useExactRemaining) {
      this.setFeedback(`✓ Added exact remaining amount ₱${remaining.toFixed(2)}.`, 2500);
    }
  }

  removePaymentSplit(index: number): void {
    this.paymentMethods = this.paymentMethods.filter((_, i) => i !== index);
  }

  getTotalPaymentAmount(): number {
    return this.paymentMethods.reduce((sum, split) => sum + split.amount, 0);
  }

  getRemainingPaymentAmount(): number {
    return Number(Math.max(this.finalTotal - this.getTotalPaymentAmount(), 0).toFixed(2));
  }

  isPaymentComplete(): boolean {
    return this.finalTotal > 0 && this.getTotalPaymentAmount() + 0.01 >= this.finalTotal;
  }

  getChangeAmount(): number {
    return Number(Math.max(this.getTotalPaymentAmount() - this.finalTotal, 0).toFixed(2));
  }

  getPaymentMethodLabel(method: PaymentMethod): string {
    const labels: Record<PaymentMethod, string> = {
      [PaymentMethod.CASH]: 'Cash',
      [PaymentMethod.GCASH]: 'GCash',
      [PaymentMethod.MAYA]: 'Maya'
    };
    return labels[method];
  }

  createNextGuest(): void {
    const label = `Guest ${this.nextGuestNumber}`;
    const tag: PosGuestTag = {
      id: this.createGuestId(),
      label
    };

    this.guestTags = [...this.guestTags, tag];
    this.activeGuestId = tag.id;
    this.guestLabelDraft = '';
    this.nextGuestNumber += 1;
    this.refreshOrderView();
  }

  onGuestLabelInput(value: string): void {
    this.guestLabelDraft = value;
    const trimmedValue = value.trim();

    if (!trimmedValue && !this.activeGuestId && this.orderItems.length === 0) {
      this.activeGuestLabel = '';
      return;
    }

    const activeGuest = this.ensureActiveGuestTag();
    const nextLabel = trimmedValue || 'Current order';

    this.guestTags = this.guestTags.map(tag =>
      tag.id === activeGuest.id ? { ...tag, label: nextLabel } : tag
    );

    this.orderItems = this.orderItems.map(item =>
      item.guestId === activeGuest.id ? { ...item, guestLabel: nextLabel } : item
    );

    this.refreshOrderView();
  }

  selectGuestTag(guestId: string): void {
    this.activeGuestId = guestId;
    const selectedGuest = this.guestTags.find(tag => tag.id === guestId);
    this.guestLabelDraft = selectedGuest && selectedGuest.label !== 'Current order'
      ? selectedGuest.label
      : '';
    this.refreshOrderView();
  }

  updateItemGuest(item: PosOrderItem, guestId: string): void {
    const nextGuest = this.guestTags.find(tag => tag.id === guestId);
    if (!nextGuest) {
      return;
    }

    item.guestId = nextGuest.id;
    item.guestLabel = nextGuest.label;
    this.refreshOrderView();
  }

  checkout(): void {
    if (!this.requireOperatorSession('checking out orders')) {
      return;
    }

    if (this.orderItems.length === 0 || this.total <= 0) {
      this.feedback = '❌ No items in order';
      setTimeout(() => (this.feedback = ''), 3000);
      return;
    }

    // Check payment is complete
    if (!this.isPaymentComplete()) {
      const paid = this.getTotalPaymentAmount();
      this.feedback = `❌ Payment incomplete. Amount due: ₱${(this.finalTotal - paid).toFixed(2)}`;
      setTimeout(() => (this.feedback = ''), 4000);
      return;
    }

    // Check if operation is open for selected source
    const operation = this.operationsStore.getTodaysOperation(this.inventorySource);
    if (!operation) {
      this.feedback = `❌ No ${this.inventorySource} operation is open. Cannot process order.`;
      setTimeout(() => (this.feedback = ''), 4000);
      return;
    }

    const itemsMissingRecipes = this.orderItems
      .filter(item => item.ingredients.length === 0)
      .map(item => item.name);

    if (itemsMissingRecipes.length > 0) {
      this.feedback = `❌ Add recipe ingredients in Menu Builder for: ${Array.from(new Set(itemsMissingRecipes)).join(', ')}`;
      setTimeout(() => (this.feedback = ''), 5000);
      return;
    }

    const inventoryMovements = this.deductInventoryForOrder();
    if (!inventoryMovements) {
      this.feedback = '❌ Insufficient inventory for one or more items';
      setTimeout(() => (this.feedback = ''), 3000);
      return;
    }

    // Create order items for orders store
    const orderItems: OrderItem[] = this.orderItems.map(item => ({
      itemId: item.menuId.toString(),
      itemName: item.name,
      category: item.category,
      quantity: 1,
      unitPrice: item.price,
      discount: item.discount,
      guestId: item.guestId,
      guestLabel: item.guestLabel,
      subtotal: item.price - item.discount
    }));

    // Create order in persistent store
    const order = this.ordersStore.createOrder(
      orderItems,
      this.inventorySource,
      this.orderNotes || undefined,
      inventoryMovements,
      this.discountAmount,
      this.paymentMethods
    );
    this.ordersStore.updatePaymentStatus(order.id, 'paid');

    // Record sale in finance with payment-method granularity.
    this.paymentMethods.forEach(split => {
      this.financeStore.recordSale(
        split.amount,
        `POS Checkout - Order ${order.orderNumber} (${this.inventorySource}, ${this.orderItems.length} items) via ${this.getPaymentMethodLabel(split.method)}`,
        `pos-${split.method}`
      );
    });
    const actor = this.getActorContext();
    this.actionLogStore.addLog({
      module: 'orders',
      action: 'order-created',
      summary: `Created ${order.orderNumber} from POS with ${order.items.length} item(s).`,
      status: 'success',
      performedByStaffId: actor.staffId,
      performedByName: actor.name,
      metadata: {
        orderId: order.id,
        source: this.inventorySource,
        finalAmount: order.finalAmount
      }
    });

    // Add loyalty points
    if (this.loyaltyCustomer) {
      const earnedPoints = order.loyaltyPoints;
      this.loyaltyStore.addPoints(this.loyaltyCustomer.id, earnedPoints);
      this.feedback = `✓ Order confirmed! +${earnedPoints} loyalty points for ${this.loyaltyCustomer.name}`;
    } else {
      this.feedback = `✓ Order ${order.orderNumber} created and queued`;
    }

    setTimeout(() => (this.feedback = ''), 4000);
    this.clearOrder();
  }

  recordWastage(): void {
    if (!this.requireOperatorSession('recording wastage')) {
      return;
    }

    const menuItem = this.selectedWastageMenuItem;
    const quantity = Math.max(Math.floor(this.wastageQuantity || 0), 0);
    const reason = this.wastageReason.trim();

    if (!menuItem || quantity <= 0 || !reason) {
      this.setFeedback('❌ Select a menu item, quantity, and reason for wastage.', 4000);
      return;
    }

    if (!this.isOperationActive) {
      this.setFeedback(`❌ Open a ${this.inventorySource} inventory session before recording wastage.`, 4000);
      return;
    }

    if (menuItem.ingredients.length === 0) {
      this.setFeedback('❌ This menu item has no recipe yet.', 3000);
      return;
    }

    const actor = this.getActorContext();
    const wasDeducted = this.deductMenuInventory(menuItem, quantity, actor.name, `Wastage: ${reason}`, 'wastage');
    if (!wasDeducted) {
      this.setFeedback('❌ Insufficient inventory for that wastage entry.', 4000);
      return;
    }

    const result = this.staffBudgetStore.recordWastage({
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity,
      source: this.inventorySource,
      ingredients: menuItem.ingredients,
      reason,
      notes: this.wastageNotes,
      recordedByStaffId: actor.staffId,
      recordedByName: actor.name
    });

    this.setFeedback(result.ok ? '✓ Wastage recorded and deducted from the active inventory.' : `❌ ${result.message}`, result.ok ? 3500 : 4000);

    if (result.ok) {
      this.wastageQuantity = 1;
      this.wastageReason = '';
      this.wastageNotes = '';
      this.refreshMenuStatuses();
    }
  }

  assignWastage(record: WastageRecord): void {
    if (!this.requireOperatorSession('charging wastage')) {
      return;
    }

    const staffId = this.wastageAssignments[record.id];
    const staff = this.staffAccounts.find(entry => entry.id === staffId);
    if (!staff) {
      this.setFeedback('❌ Select a staff member before charging wastage.', 4000);
      return;
    }

    const actor = this.getActorContext();
    const result = this.staffBudgetStore.assignWastage(record.id, {
      staffId: staff.id,
      staffName: staff.fullName,
      monthlyBudget: staff.monthlyDrinkBudget,
      recordedByStaffId: actor.staffId,
      recordedByName: actor.name,
      notes: record.reason
    });

    this.setFeedback(result.ok ? `✓ Wastage charged to ${staff.fullName}.` : `❌ ${result.message}`, result.ok ? 3500 : 4000);
  }

  private deductInventoryForOrder(): OrderInventoryMovement[] | null {
    const operation = this.operationsStore.getTodaysOperation(this.inventorySource);
    if (!operation) {
      return null;
    }

    const inventoryMovements: OrderInventoryMovement[] = [];

    // Check if we have enough inventory for all items
    for (const orderItem of this.orderItems) {
      for (const ingredient of orderItem.ingredients) {
        const operationItem = operation.items.find(
          item => item.inventoryItemId === ingredient.inventoryItemId
        );
        if (!operationItem || operationItem.currentQuantity < ingredient.amount) {
          return null;
        }
      }
    }

    const actor = this.getActorContext();

    // Deduct from operation inventory
    for (const orderItem of this.orderItems) {
      for (const ingredient of orderItem.ingredients) {
        const operationItem = operation.items.find(
          item => item.inventoryItemId === ingredient.inventoryItemId
        );
        if (operationItem) {
          const wasDeducted = this.operationsStore.deductFromOperation(
            operation.id,
            operationItem.id,
            ingredient.amount,
            actor.name,
            `Sold: ${orderItem.name}`
          );

          if (!wasDeducted) {
            return null;
          }

          inventoryMovements.push({
            operationId: operation.id,
            operationType: operation.type,
            operationItemId: operationItem.id,
            inventoryItemId: operationItem.inventoryItemId,
            inventoryItemName: operationItem.name,
            quantity: ingredient.amount,
            unit: operationItem.unit
          });
        }
      }
    }

    return inventoryMovements;
  }

  computeTotal(): void {
    this.total = this.orderItems.reduce((sum, item) => sum + item.price, 0);
    this.itemDiscountTotal = this.orderItems.reduce((sum, item) => sum + item.discount, 0);
    this.finalTotal = Math.max(this.total - this.itemDiscountTotal - this.discountAmount, 0);
  }

  private resetGuestTags(): void {
    this.nextGuestNumber = 1;
    this.guestTags = [];
    this.activeGuestId = '';
    this.guestLabelDraft = '';
    this.activeGuestLabel = '';
  }

  private ensureActiveGuestTag(): PosGuestTag {
    if (this.guestTags.length === 0) {
      const tag: PosGuestTag = {
        id: this.createGuestId(),
        label: this.guestLabelDraft.trim() || this.loyaltyCustomer?.name?.trim() || 'Current order'
      };
      this.guestTags = [tag];
      this.activeGuestId = tag.id;
      this.nextGuestNumber = 2;
      return tag;
    }

    return this.guestTags.find(tag => tag.id === this.activeGuestId) ?? this.guestTags[0];
  }

  private refreshOrderView(): void {
    const guestItemCounts: Record<string, number> = {};

    this.orderItems.forEach(item => {
      guestItemCounts[item.guestId] = (guestItemCounts[item.guestId] || 0) + 1;
    });

    this.guestItemCounts = guestItemCounts;
    this.orderGroups = this.guestTags
      .map(tag => {
        const items: PosOrderItem[] = [];
        const itemIndexes: number[] = [];

        this.orderItems.forEach((item, index) => {
          if (item.guestId === tag.id) {
            items.push(item);
            itemIndexes.push(index);
          }
        });

        return {
          guestId: tag.id,
          label: tag.label,
          items,
          itemIndexes,
          itemCount: items.length
        };
      })
      .filter(group => group.itemCount > 0);

    const activeGuest = this.ensureActiveGuestTag();
    this.activeGuestId = activeGuest.id;
    this.activeGuestLabel = activeGuest.label;
  }

  private refreshOperationStatus(): void {
    const operation = this.operationsStore.getTodaysOperation(this.inventorySource);
    this.isOperationActive = !!operation;
    this.operationStatus = operation
      ? `✓ ${this.getInventoryLabel(operation.type)} open`
      : `❌ No ${this.getInventoryLabel(this.inventorySource).toLowerCase()} open`;
  }

  private refreshInventoryOptions(): void {
    const openSources = (['store', 'popup', 'event'] as OperationType[])
      .filter(type => !!this.operationsStore.getTodaysOperation(type));

    this.availableInventoryOptions = openSources.map(type => ({
      type,
      label: this.getInventoryLabel(type)
    }));

    if (this.availableInventoryOptions.length > 0 && !openSources.includes(this.inventorySource)) {
      this.inventorySource = this.availableInventoryOptions[0].type;
    }
  }

  private getInventoryLabel(type: OperationType): string {
    switch (type) {
      case 'store':
        return 'Store inventory';
      case 'popup':
        return 'Pop-up inventory';
      case 'event':
        return 'Event inventory';
    }
  }

  private refreshMenuStatuses(): void {
    const operation = this.operationsStore.getTodaysOperation(this.inventorySource);

    this.menuStatusById = this.menuItems.reduce<Record<number, PosMenuStatus>>((statusById, item) => {
      statusById[item.id] = this.buildMenuStatus(item, operation);
      return statusById;
    }, {});
  }

  private buildMenuStatus(item: MenuDefinition, operation?: InventoryOperation): PosMenuStatus {
    if (!operation || item.ingredients.length === 0) {
      return {
        remainingOrders: null,
        outOfStock: false,
        lowStock: false
      };
    }

    let remainingOrders = Number.POSITIVE_INFINITY;

    for (const ingredient of item.ingredients) {
      const operationItem = operation.items.find(entry => entry.inventoryItemId === ingredient.inventoryItemId);
      if (!operationItem) {
        remainingOrders = 0;
        break;
      }

      remainingOrders = Math.min(remainingOrders, Math.floor(operationItem.currentQuantity / ingredient.amount));
    }

    if (!Number.isFinite(remainingOrders)) {
      return {
        remainingOrders: null,
        outOfStock: false,
        lowStock: false
      };
    }

    return {
      remainingOrders,
      outOfStock: remainingOrders <= 0,
      lowStock: remainingOrders > 0 && remainingOrders <= 10
    };
  }

  private createGuestId(): string {
    return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  private refreshWastageAssignments(): void {
    const defaultStaffId = this.currentOperator?.id || '';

    this.wastageAssignments = this.wastageRecords.reduce<Record<string, string>>((assignmentMap, record) => {
      assignmentMap[record.id] = this.wastageAssignments[record.id] || record.assignedStaffId || defaultStaffId;
      return assignmentMap;
    }, {});
  }

  private getActorContext(): { staffId?: string; name: string } {
    if (this.currentOperator) {
      return { staffId: this.currentOperator.id, name: this.currentOperator.fullName };
    }

    return {
      staffId: undefined,
      name: 'POS System'
    };
  }

  private requireOperatorSession(action: string): boolean {
    if (this.hasOperatorSession) {
      return true;
    }

    this.setFeedback(`❌ Sign in the current operator before ${action}.`, 4000);
    return false;
  }

  private deductMenuInventory(
    menuItem: MenuDefinition,
    quantity: number,
    performedBy: string,
    note: string,
    action: InventoryAuditLog['action'] = 'deduct'
  ): boolean {
    const operation = this.operationsStore.getTodaysOperation(this.inventorySource);
    if (!operation) {
      return false;
    }

    for (const ingredient of menuItem.ingredients) {
      const operationItem = operation.items.find(item => item.inventoryItemId === ingredient.inventoryItemId);
      if (!operationItem || operationItem.currentQuantity < ingredient.amount * quantity) {
        return false;
      }
    }

    for (const ingredient of menuItem.ingredients) {
      const operationItem = operation.items.find(item => item.inventoryItemId === ingredient.inventoryItemId);
      if (!operationItem) {
        return false;
      }

      const wasDeducted = this.operationsStore.deductFromOperation(
        operation.id,
        operationItem.id,
        ingredient.amount * quantity,
        performedBy,
        note,
        action
      );

      if (!wasDeducted) {
        return false;
      }
    }

    return true;
  }

  private setFeedback(message: string, duration = 3000): void {
    this.feedback = message;
    setTimeout(() => (this.feedback = ''), duration);
  }

  private parsePaymentMethod(value: PaymentMethod | string): PaymentMethod | null {
    if (value === PaymentMethod.CASH || value === PaymentMethod.GCASH || value === PaymentMethod.MAYA) {
      return value;
    }

    return null;
  }
}
