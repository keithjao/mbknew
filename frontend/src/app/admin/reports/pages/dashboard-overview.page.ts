import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';
import { AdminInventoryStore, InventoryItem } from '../../data/admin-inventory.store';
import { FinanceEntry, FinanceStore } from '../../data/finance.store';
import { InventoryOperation, InventoryOperationsStore } from '../../data/inventory-operations.store';
import { LoyaltyCustomer, LoyaltyStore } from '../../data/loyalty.store';
import { Order, OrdersStore } from '../../data/orders.store';
import { AnalyticsChartComponent } from '../components/analytics-chart.component';
import { ExportDropdownComponent } from '../components/export-dropdown.component';
import { ReportFilterBarComponent } from '../components/filter-bar.component';
import { KpiCardComponent } from '../components/kpi-card.component';
import { AnalyticsChart, GlobalReportFilters, KpiCard } from '../models/report.models';
import { ReportsStateService } from '../services/reports-state.service';

@Component({
  selector: 'app-dashboard-overview-page',
  standalone: true,
  imports: [CommonModule, ReportFilterBarComponent, KpiCardComponent, AnalyticsChartComponent, ExportDropdownComponent],
  template: `
    <section class="report-page">
      <header class="page-head">
        <div>
          <h2>Dashboard Overview</h2>
          <p>Live admin snapshot for sales, queue health, stock pressure, and operational activity.</p>
        </div>
        <app-export-dropdown></app-export-dropdown>
      </header>

      <app-report-filter-bar
        [filters]="state.current"
        (searchChange)="state.updateSearch($event)"
        (branchChange)="state.updateBranch($event)"
        (dateRangeChange)="state.updateDateRange($event.from, $event.to)"
        (reset)="state.reset()"
      ></app-report-filter-bar>

      <div class="kpi-grid">
        <app-kpi-card *ngFor="let card of kpis" [card]="card"></app-kpi-card>
      </div>

      <div class="chart-grid">
        <app-analytics-chart *ngFor="let chart of charts" [chart]="chart"></app-analytics-chart>
      </div>

      <section class="split-grid">
        <article class="block">
          <h3>Best Selling Products</h3>
          <ol>
            <li *ngFor="let item of bestSellers">{{ item }}</li>
          </ol>
        </article>

        <article class="block warning">
          <h3>Low Stock Alerts</h3>
          <ul>
            <li *ngFor="let item of lowStock">{{ item }}</li>
          </ul>
        </article>

        <article class="block">
          <h3>Operations Snapshot</h3>
          <ul>
            <li *ngFor="let item of operationsSnapshot">{{ item }}</li>
          </ul>
        </article>
      </section>
    </section>
  `,
  styles: [
    `
    .report-page { display: grid; gap: 1rem; }
    .page-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
    }
    .page-head h2 { margin: 0; font-size: 1.4rem; }
    .page-head p { margin: 0.3rem 0 0; color: var(--ink-soft); font-size: 0.88rem; }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .chart-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .split-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .block {
      border: 1px solid var(--line);
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.84);
      padding: 1rem;
      min-height: 11rem;
    }

    .block.warning {
      border-color: rgba(180, 135, 40, 0.45);
    }

    .block h3 {
      margin: 0;
      font-size: 0.95rem;
    }

    .block ul,
    .block ol {
      margin: 0.7rem 0 0;
      padding-left: 1rem;
      color: var(--ink-soft);
      font-size: 0.86rem;
      display: grid;
      gap: 0.42rem;
    }

    @media (max-width: 1200px) {
      .chart-grid { grid-template-columns: 1fr; }
      .split-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 900px) {
      .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .split-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 640px) {
      .kpi-grid { grid-template-columns: 1fr; }
      .page-head { flex-direction: column; }
    }
    `
  ]
})
export class DashboardOverviewPage implements OnInit, OnDestroy {
  kpis: KpiCard[] = [];
  charts: AnalyticsChart[] = [];
  bestSellers: string[] = [];
  lowStock: string[] = [];
  operationsSnapshot: string[] = [];

  private readonly subscription = new Subscription();

  constructor(
    readonly state: ReportsStateService,
    private readonly ordersStore: OrdersStore,
    private readonly financeStore: FinanceStore,
    private readonly inventoryStore: AdminInventoryStore,
    private readonly operationsStore: InventoryOperationsStore,
    private readonly loyaltyStore: LoyaltyStore
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      combineLatest([
        this.ordersStore.getAllOrders(),
        this.financeStore.entries$,
        this.inventoryStore.inventory$,
        this.operationsStore.operations$,
        this.loyaltyStore.customers$,
        this.state.filters$
      ]).subscribe(([orders, financeEntries, inventory, operations, customers, filters]) => {
        this.refreshDashboard(orders, financeEntries, inventory, operations, customers, filters);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private refreshDashboard(
    orders: Order[],
    financeEntries: FinanceEntry[],
    inventory: InventoryItem[],
    operations: InventoryOperation[],
    customers: LoyaltyCustomer[],
    filters: GlobalReportFilters
  ): void {
    const filteredOrders = orders.filter(order => this.matchesOrder(order, filters));
    const nonCancelledOrders = filteredOrders.filter(order => order.status !== 'cancelled');
    const activeQueueOrders = filteredOrders.filter(order => ['queued', 'preparing', 'ready'].includes(order.status));
    const resolvedOrders = filteredOrders.filter(order => order.status === 'completed' || order.status === 'cancelled');
    const filteredSpendings = financeEntries.filter(entry => entry.type === 'spending' && this.inDateRange(entry.createdAt, filters));
    const openOperations = operations.filter(operation => operation.status === 'open');

    const salesTotal = nonCancelledOrders.reduce((sum, order) => sum + order.finalAmount, 0);
    const spendTotal = filteredSpendings.reduce((sum, entry) => sum + entry.amount, 0);
    const avgTicket = nonCancelledOrders.length > 0 ? salesTotal / nonCancelledOrders.length : 0;
    const lowStockItems = inventory.filter(item => item.quantity <= this.getLowStockThreshold(item));
    const cancelledOrders = resolvedOrders.filter(order => order.status === 'cancelled');

    this.kpis = [
      this.buildKpi('Gross Sales', this.formatCurrency(salesTotal), `${nonCancelledOrders.length} orders`, salesTotal > 0 ? 'up' : 'flat', 'success'),
      this.buildKpi('Average Ticket', this.formatCurrency(avgTicket), activeQueueOrders.length > 0 ? `${activeQueueOrders.length} still in queue` : 'Queue is clear', avgTicket > 0 ? 'up' : 'flat'),
      this.buildKpi('Net After Spending', this.formatCurrency(salesTotal - spendTotal), spendTotal > 0 ? `${this.formatCurrency(spendTotal)} spending` : 'No spending logged', salesTotal >= spendTotal ? 'up' : 'down', salesTotal >= spendTotal ? 'success' : 'warning'),
      this.buildKpi('Low Stock Alerts', `${lowStockItems.length}`, lowStockItems.length > 0 ? 'Needs replenishment' : 'Healthy stock', lowStockItems.length > 0 ? 'down' : 'up', lowStockItems.length > 0 ? 'warning' : 'success'),
      this.buildKpi('Resolved Orders', `${resolvedOrders.length}`, cancelledOrders.length > 0 ? `${cancelledOrders.length} cancelled` : 'No cancellations', 'flat')
    ];

    this.charts = [
      {
        id: 'orders-trend-live',
        title: 'Orders Trend',
        subtitle: 'Orders created across the last 7 days',
        series: this.buildDailySeries(nonCancelledOrders, order => order.createdAt, order => 1)
      },
      {
        id: 'revenue-trend-live',
        title: 'Revenue Trend',
        subtitle: 'Final order value across the last 7 days',
        series: this.buildDailySeries(nonCancelledOrders, order => order.createdAt, order => order.finalAmount)
      },
      {
        id: 'source-mix-live',
        title: 'Source Mix',
        subtitle: 'Orders by admin channel',
        series: [
          { label: 'Store', value: nonCancelledOrders.filter(order => order.source === 'store').length },
          { label: 'Pop-up', value: nonCancelledOrders.filter(order => order.source === 'popup').length },
          { label: 'Event', value: nonCancelledOrders.filter(order => order.source === 'event').length }
        ]
      }
    ];

    this.bestSellers = this.buildBestSellers(nonCancelledOrders);
    this.lowStock = lowStockItems.length > 0
      ? lowStockItems.slice(0, 5).map(item => `${item.name} - ${item.quantity} ${item.unit}`)
      : ['No low-stock items in the current inventory.'];
    this.operationsSnapshot = [
      `${openOperations.length} operation${openOperations.length === 1 ? '' : 's'} open today`,
      `${activeQueueOrders.length} active order${activeQueueOrders.length === 1 ? '' : 's'} in the queue`,
      `${customers.length} loyalty customer${customers.length === 1 ? '' : 's'} linked`,
      `${cancelledOrders.length} cancelled order${cancelledOrders.length === 1 ? '' : 's'} in range`
    ];
  }

  private matchesOrder(order: Order, filters: GlobalReportFilters): boolean {
    const search = filters.search.toLowerCase();
    const searchMatches = !search || [
      order.orderNumber,
      order.notes,
      order.source,
      ...order.items.map(item => item.itemName),
      ...order.items.map(item => item.guestLabel)
    ].some(value => (value || '').toLowerCase().includes(search));

    const branchMatches = filters.branch === 'all' || this.mapSourceToBranch(order.source) === filters.branch;
    return this.inDateRange(order.createdAt, filters) && branchMatches && searchMatches;
  }

  private inDateRange(dateValue: string, filters: GlobalReportFilters): boolean {
    const from = new Date(filters.dateRange.from);
    const to = new Date(filters.dateRange.to);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    const target = new Date(dateValue).getTime();
    return target >= from.getTime() && target <= to.getTime();
  }

  private buildDailySeries<T>(items: T[], getDate: (item: T) => string, getValue: (item: T) => number) {
    const endDate = new Date(this.state.current.dateRange.to || new Date().toISOString());
    endDate.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }).map((_, index) => {
      const day = new Date(endDate);
      day.setDate(endDate.getDate() - (6 - index));
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      const value = items.reduce((sum, item) => {
        const itemDate = new Date(getDate(item));
        return itemDate >= day && itemDate < nextDay ? sum + getValue(item) : sum;
      }, 0);

      return {
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        value: Math.round(value)
      };
    });
  }

  private buildBestSellers(orders: Order[]): string[] {
    const itemCounts = new Map<string, number>();

    orders.forEach(order => {
      order.items.forEach(item => {
        itemCounts.set(item.itemName, (itemCounts.get(item.itemName) || 0) + item.quantity);
      });
    });

    const bestSellers = Array.from(itemCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([name, count]) => `${name} - ${count} cup${count === 1 ? '' : 's'}`);

    return bestSellers.length > 0 ? bestSellers : ['No sales recorded for the selected range.'];
  }

  private getLowStockThreshold(item: InventoryItem): number {
    if (item.unit === 'piece') {
      return 100;
    }

    if (item.unit === 'ml') {
      return 5000;
    }

    return 500;
  }

  private mapSourceToBranch(source?: Order['source']): string {
    if (source === 'popup') {
      return 'north';
    }

    if (source === 'event') {
      return 'east';
    }

    return 'main';
  }

  private formatCurrency(value: number): string {
    return `PHP ${value.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;
  }

  private buildKpi(
    label: string,
    value: string,
    delta: string,
    trend: 'up' | 'down' | 'flat',
    tone: 'default' | 'success' | 'warning' | 'danger' = 'default'
  ): KpiCard {
    return {
      id: label.toLowerCase().replace(/\s+/g, '-'),
      label,
      value,
      delta,
      trend,
      tone
    };
  }
}
