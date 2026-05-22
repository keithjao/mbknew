import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { AdminInventoryStore, InventoryItem, MenuDefinition } from '../data/admin-inventory.store';
import {
  FinanceEntry,
  FinanceEntryType,
  FinancePeriod,
  FinanceStore
} from '../data/finance.store';
import { Order, OrdersStore, PaymentMethod } from '../data/orders.store';
import { ReportsStateService } from '../reports/services/reports-state.service';
import { AppClockStore } from '../../shared/testing/app-clock.store';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './finance.html',
  styleUrl: './finance.scss'
})
export class Finance implements OnInit, OnDestroy {
  readonly pageSize = 10;
  entries: FinanceEntry[] = [];
  orders: Order[] = [];
  menuItems: MenuDefinition[] = [];
  inventoryItems: InventoryItem[] = [];
  periodEntries: FinanceEntry[] = [];
  filteredEntries: FinanceEntry[] = [];
  pagedEntries: FinanceEntry[] = [];
  selectedPeriod: FinancePeriod = 'month';
  ledgerPage = 1;
  ledgerTotalPages = 1;
  ledgerSearch = '';
  ledgerTypeFilter: 'all' | FinanceEntryType = 'all';
  ledgerSourceFilter: 'all' | 'system' | 'manual' | 'system-cash' | 'system-gcash' | 'system-maya' = 'all';
  ledgerCategoryFilter = 'all';
  entryCategories: string[] = [];
  grossSales = 0;
  totalDiscounts = 0;
  netSales = 0;
  systemSales = 0;
  systemCashSales = 0;
  systemGcashSales = 0;
  systemMayaSales = 0;
  manualSales = 0;
  salesAdjustments = 0;
  totalSpending = 0;
  estimatedCogs = 0;
  operatingProfit = 0;
  ordersCount = 0;
  averageDailyNet = 0;
  averageDailySpending = 0;
  profitMargin = 0;
  topCategories: Array<{ category: string; amount: number; count: number }> = [];
  editingEntryId: number | null = null;
  feedback = '';
  private readonly subscription = new Subscription();

  constructor(
    private readonly financeStore: FinanceStore,
    private readonly ordersStore: OrdersStore,
    private readonly inventoryStore: AdminInventoryStore,
    private readonly reportsState: ReportsStateService,
    private readonly appClock: AppClockStore
  ) {}

  ngOnInit(): void {
    this.hydrateFiltersFromSharedState();

    this.subscription.add(
      combineLatest([
        this.financeStore.entries$,
        this.ordersStore.getAllOrders(),
        this.inventoryStore.menuItems$,
        this.inventoryStore.inventory$
      ]).subscribe(([entries, orders, menuItems, inventoryItems]) => {
        this.entries = entries;
        this.orders = orders;
        this.menuItems = menuItems;
        this.inventoryItems = inventoryItems;
        this.refreshSummary();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  setPeriod(period: FinancePeriod): void {
    this.selectedPeriod = period;
    const dateRange = this.getDateRangeForPeriod(period);
    this.reportsState.updateDateRange(dateRange.from, dateRange.to);
    this.refreshSummary();
  }

  addManualEntry(
    type: string,
    amount: number,
    note: string,
    category: string,
    date: string,
    form: HTMLFormElement
  ): void {
    const didAdd = this.financeStore.addManualEntry(
      type as FinanceEntryType,
      amount,
      note,
      category,
      date
    );

    this.feedback = didAdd
      ? 'finance entry added.'
      : 'enter valid type, amount, and note.';

    if (didAdd) {
      form.reset();
      this.setPeriod(this.selectedPeriod);
    }
  }

  startEdit(entry: FinanceEntry): void {
    this.editingEntryId = entry.id;
    this.feedback = '';
  }

  cancelEdit(): void {
    this.editingEntryId = null;
  }

  saveEntry(
    entryId: number,
    type: string,
    amount: number,
    note: string,
    category: string,
    date: string
  ): void {
    const didUpdate = this.financeStore.updateEntry(entryId, {
      type: type as FinanceEntryType,
      amount,
      note,
      category,
      createdAt: date
    });

    this.feedback = didUpdate
      ? 'finance entry updated.'
      : 'enter valid type, amount, and note.';

    if (didUpdate) {
      this.editingEntryId = null;
      this.refreshSummary();
    }
  }

  deleteEntry(entryId: number): void {
    const didDelete = this.financeStore.deleteEntry(entryId);
    this.feedback = didDelete
      ? 'finance entry deleted.'
      : 'unable to delete finance entry.';

    if (didDelete && this.editingEntryId === entryId) {
      this.editingEntryId = null;
    }

    if (didDelete) {
      this.refreshSummary();
    }
  }

  updateLedgerFilters(): void {
    this.filteredEntries = this.applyLedgerFilters(this.periodEntries);
    this.ledgerPage = 1;
    this.updatePagedEntries();
    this.syncFinanceFiltersToSharedState();
  }

  clearLedgerFilters(): void {
    this.ledgerSearch = '';
    this.ledgerTypeFilter = 'all';
    this.ledgerSourceFilter = 'all';
    this.ledgerCategoryFilter = 'all';
    this.updateLedgerFilters();
  }

  setLedgerPage(page: number): void {
    this.ledgerPage = Math.min(Math.max(page, 1), this.ledgerTotalPages);
    this.updatePagedEntries();
  }

  isSystemEntry(entry: FinanceEntry): boolean {
    return entry.type === 'sale' && (entry.category === 'pos' || entry.category.startsWith('pos-'));
  }

  entrySourceLabel(entry: FinanceEntry): string {
    const paymentMethod = this.getSystemPaymentMethod(entry);
    if (paymentMethod === PaymentMethod.CASH) {
      return 'system-cash';
    }

    if (paymentMethod === PaymentMethod.GCASH) {
      return 'system-gcash';
    }

    if (paymentMethod === PaymentMethod.MAYA) {
      return 'system-maya';
    }

    return this.isSystemEntry(entry) ? 'system' : 'manual';
  }

  todayKey(): string {
    return this.appClock.todayKey();
  }

  private refreshSummary(): void {
    this.periodEntries = this.financeStore.getFilteredEntries(this.selectedPeriod);
    this.entryCategories = Array.from(new Set(this.periodEntries.map(entry => entry.category))).sort();
    if (this.ledgerCategoryFilter !== 'all' && !this.entryCategories.includes(this.ledgerCategoryFilter)) {
      this.ledgerCategoryFilter = 'all';
    }
    this.filteredEntries = this.applyLedgerFilters(this.periodEntries);

    const filteredOrders = this.orders.filter(order => this.matchesPeriod(order.createdAt))
      .filter(order => order.status !== 'cancelled')
      .filter(order => order.paymentStatus === 'paid' || order.paymentStatus === 'partial');

    this.grossSales = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    this.totalDiscounts = filteredOrders.reduce((sum, order) => sum + order.discountApplied, 0);
    this.netSales = filteredOrders.reduce((sum, order) => sum + order.finalAmount, 0);
    const paymentTotals = this.ordersStore.getPaymentMethodTotals(filteredOrders);
    this.systemCashSales = paymentTotals.cash;
    this.systemGcashSales = paymentTotals.gcash;
    this.systemMayaSales = paymentTotals.maya;
    this.systemSales = this.periodEntries
      .filter(entry => this.isSystemEntry(entry))
      .reduce((sum, entry) => sum + entry.amount, 0);
    this.manualSales = this.periodEntries
      .filter(entry => entry.type === 'sale' && !this.isSystemEntry(entry))
      .reduce((sum, entry) => sum + entry.amount, 0);
    this.salesAdjustments = this.manualSales;

    this.totalSpending = this.periodEntries
      .filter(entry => entry.type === 'spending')
      .reduce((sum, entry) => sum + entry.amount, 0);

    this.estimatedCogs = filteredOrders.reduce((sum, order) => sum + this.estimateOrderCost(order), 0);
    this.operatingProfit = this.netSales + this.salesAdjustments - this.totalSpending - this.estimatedCogs;
    this.ordersCount = filteredOrders.length;

    const periodDayCount = this.getPeriodDayCount(filteredOrders, this.periodEntries);
    this.averageDailyNet = this.netSales / periodDayCount;
    this.averageDailySpending = this.totalSpending / periodDayCount;
    this.profitMargin = this.netSales > 0 ? (this.operatingProfit / this.netSales) * 100 : 0;
    this.topCategories = this.buildTopCategorySummaries(this.periodEntries);
    this.updatePagedEntries();
  }

  private applyLedgerFilters(entries: FinanceEntry[]): FinanceEntry[] {
    const search = this.ledgerSearch.trim().toLowerCase();

    return entries
      .filter(entry => this.ledgerTypeFilter === 'all' || entry.type === this.ledgerTypeFilter)
      .filter(entry => {
        if (this.ledgerSourceFilter === 'all') {
          return true;
        }

        if (this.ledgerSourceFilter === 'system') {
          return this.isSystemEntry(entry);
        }

        if (this.ledgerSourceFilter === 'manual') {
          return !this.isSystemEntry(entry);
        }

        const paymentMethod = this.getSystemPaymentMethod(entry);
        if (this.ledgerSourceFilter === 'system-cash') {
          return paymentMethod === PaymentMethod.CASH;
        }

        if (this.ledgerSourceFilter === 'system-gcash') {
          return paymentMethod === PaymentMethod.GCASH;
        }

        if (this.ledgerSourceFilter === 'system-maya') {
          return paymentMethod === PaymentMethod.MAYA;
        }

        return true;
      })
      .filter(entry => this.ledgerCategoryFilter === 'all' || entry.category === this.ledgerCategoryFilter)
      .filter(entry => {
        if (!search) {
          return true;
        }

        return [entry.note, entry.category, entry.type, entry.createdAt]
          .some(value => value.toLowerCase().includes(search));
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  }

  private updatePagedEntries(): void {
    this.ledgerTotalPages = Math.max(1, Math.ceil(this.filteredEntries.length / this.pageSize));
    this.ledgerPage = Math.min(this.ledgerPage, this.ledgerTotalPages);
    const start = (this.ledgerPage - 1) * this.pageSize;
    this.pagedEntries = this.filteredEntries.slice(start, start + this.pageSize);
  }

  private buildTopCategorySummaries(entries: FinanceEntry[]): Array<{ category: string; amount: number; count: number }> {
    const categoryMap = new Map<string, { amount: number; count: number }>();

    entries
      .filter(entry => entry.type === 'spending')
      .forEach(entry => {
        const summary = categoryMap.get(entry.category) ?? { amount: 0, count: 0 };
        categoryMap.set(entry.category, {
          amount: summary.amount + entry.amount,
          count: summary.count + 1
        });
      });

    return Array.from(categoryMap.entries())
      .map(([category, summary]) => ({ category, ...summary }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 5);
  }

  private getPeriodDayCount(orders: Order[], entries: FinanceEntry[]): number {
    if (this.selectedPeriod === 'day') {
      return 1;
    }

    if (this.selectedPeriod === 'week') {
      return 7;
    }

    if (this.selectedPeriod === 'month') {
      return 30;
    }

    const days = new Set([
      ...orders.map(order => order.createdAt.slice(0, 10)),
      ...entries.map(entry => entry.createdAt.slice(0, 10))
    ]);

    return Math.max(days.size, 1);
  }

  private hydrateFiltersFromSharedState(): void {
    const shared = this.reportsState.current;
    this.selectedPeriod = this.getPeriodFromDateRange(shared.dateRange.from, shared.dateRange.to);
    this.ledgerSearch = shared.search;
    this.ledgerTypeFilter = shared.financeEntryType;
    this.ledgerSourceFilter = shared.financeEntrySource;
    this.ledgerCategoryFilter = shared.financeCategory;
  }

  private syncFinanceFiltersToSharedState(): void {
    this.reportsState.updateSearch(this.ledgerSearch);
    this.reportsState.updateFinanceEntryType(this.ledgerTypeFilter);
    this.reportsState.updateFinanceEntrySource(this.ledgerSourceFilter);
    this.reportsState.updateFinanceCategory(this.ledgerCategoryFilter);
  }

  private getDateRangeForPeriod(period: FinancePeriod): { from: string; to: string } {
    const today = this.appClock.now();
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    if (period === 'all') {
      const from = new Date(today);
      from.setFullYear(today.getFullYear() - 1);
      from.setHours(0, 0, 0, 0);
      return {
        from: this.toDateInputValue(from),
        to: this.toDateInputValue(end)
      };
    }

    const lookbackDays = period === 'day' ? 0 : period === 'week' ? 6 : 29;
    const start = new Date(today);
    start.setDate(today.getDate() - lookbackDays);
    start.setHours(0, 0, 0, 0);

    return {
      from: this.toDateInputValue(start),
      to: this.toDateInputValue(end)
    };
  }

  private getPeriodFromDateRange(fromValue: string, toValue: string): FinancePeriod {
    const from = new Date(fromValue);
    const to = new Date(toValue);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
      return 'month';
    }

    const diffDays = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays <= 1) {
      return 'day';
    }

    if (diffDays <= 7) {
      return 'week';
    }

    if (diffDays <= 31) {
      return 'month';
    }

    return 'all';
  }

  private toDateInputValue(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private estimateOrderCost(order: Order): number {
    const menuById = new Map(this.menuItems.map(item => [String(item.id), item]));
    const menuByName = new Map(this.menuItems.map(item => [item.name.trim().toLowerCase(), item]));
    const inventoryById = new Map(this.inventoryItems.map(item => [item.id, item]));

    return order.items.reduce((orderSum, orderItem) => {
      const menuItem = menuById.get(orderItem.itemId) ?? menuByName.get(orderItem.itemName.trim().toLowerCase());
      if (!menuItem) {
        return orderSum;
      }

      const itemCost = menuItem.ingredients.reduce((ingredientSum, ingredient) => {
        const inventoryItem = inventoryById.get(ingredient.inventoryItemId);
        return ingredientSum + ((inventoryItem?.unitCost ?? 0) * ingredient.amount);
      }, 0);

      return orderSum + (itemCost * orderItem.quantity);
    }, 0);
  }

  private matchesPeriod(dateValue: string): boolean {
    if (this.selectedPeriod === 'all') {
      return true;
    }

    const target = new Date(dateValue).getTime();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const lookbackDays = this.selectedPeriod === 'day' ? 1 : this.selectedPeriod === 'week' ? 7 : 30;
    return target >= now - (lookbackDays * dayMs);
  }

  private getSystemPaymentMethod(entry: FinanceEntry): PaymentMethod | null {
    if (!this.isSystemEntry(entry)) {
      return null;
    }

    if (entry.category === `pos-${PaymentMethod.CASH}` || entry.category === 'pos') {
      return PaymentMethod.CASH;
    }

    if (entry.category === `pos-${PaymentMethod.GCASH}`) {
      return PaymentMethod.GCASH;
    }

    if (entry.category === `pos-${PaymentMethod.MAYA}`) {
      return PaymentMethod.MAYA;
    }

    return null;
  }
}
