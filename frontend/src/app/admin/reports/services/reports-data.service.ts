import { Injectable } from '@angular/core';
import { combineLatest, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AdminInventoryStore, InventoryItem, MenuDefinition } from '../../data/admin-inventory.store';
import { FinanceEntry, FinanceStore } from '../../data/finance.store';
import { InventoryAuditLog, InventoryOperation, InventoryOperationsStore } from '../../data/inventory-operations.store';
import { LoyaltyCustomer, LoyaltyStore } from '../../data/loyalty.store';
import { Order, OrdersStore, PaymentMethod } from '../../data/orders.store';
import { REPORTS_NAV } from '../data/report-mock.data';
import {
  GlobalReportFilters,
  KpiCard,
  ReportCategoryKey,
  ReportPageData,
  ReportRole,
  ReportsNavItem,
  ReportRow
} from '../models/report.models';
import { ActionLogEntry, ActionLogStore } from '../../../shared/logging/action-log.store';
import { AttendanceStore } from '../../../shared/attendance/attendance.store';


interface OrderSummary {
  grossSales: number;
  discounts: number;
  netSales: number;
  estimatedCogs: number;
  ordersCount: number;
}

interface PaymentBreakdown {
  cash: number;
  gcash: number;
  maya: number;
}

@Injectable({ providedIn: 'root' })
export class ReportsDataService {
  constructor(
    private readonly ordersStore: OrdersStore,
    private readonly financeStore: FinanceStore,
    private readonly inventoryStore: AdminInventoryStore,
    private readonly operationsStore: InventoryOperationsStore,
    private readonly loyaltyStore: LoyaltyStore,
    private readonly actionLogStore: ActionLogStore,
    private readonly attendanceStore: AttendanceStore
  ) {}

  getVisibleNav(): Observable<ReportsNavItem[]> {
    return of(
      REPORTS_NAV.filter(item => item.allowedRoles.includes(this.getCurrentRole()))
    );
  }

  getReportPageData(category: ReportCategoryKey, filters: GlobalReportFilters): Observable<ReportPageData | null> {
    return combineLatest([
      this.ordersStore.getAllOrders(),
      this.financeStore.entries$,
      this.inventoryStore.inventory$,
      this.inventoryStore.menuItems$,
      this.operationsStore.operations$,
      this.operationsStore.auditLog$,
      this.loyaltyStore.customers$
    ]).pipe(
      map(([orders, financeEntries, inventory, menuItems, operations, auditLogs, customers]) => {
        switch (category) {
          case 'sales':
            return this.buildSalesReport(orders, menuItems, inventory, filters);
          case 'financial':
            return this.buildFinancialReport(orders, financeEntries, menuItems, inventory, filters);
          case 'inventory':
            return this.buildInventoryReport(inventory, menuItems, operations, auditLogs, filters);
          case 'customer':
            return this.buildCustomerReport(orders, customers, filters);
          case 'operations':
            return this.buildOperationsReport(orders, operations, auditLogs, filters);
          case 'production':
            return this.buildProductionReport(operations, auditLogs, filters);
          case 'marketing':
            return this.buildMarketingReport(orders, menuItems, inventory, filters);
          default:
            return null;
        }
      })
    );
  }

  getAuditLogs(filters?: GlobalReportFilters): Observable<ReportPageData> {
    return this.actionLogStore.logs$.pipe(
      map(logs => {
        const scopedLogs = filters ? logs.filter(log => this.inDateRange(log.timestamp, filters)) : logs;
        const recentLogs = scopedLogs.slice(0, 150);
        const warningCount = scopedLogs.filter(log => log.status === 'warning' || log.status === 'error').length;
        const exportCount = scopedLogs.filter(log => log.action.includes('export') || log.action.includes('payslip')).length;
        const uniqueActors = new Set(scopedLogs.map(log => log.performedByName || 'System')).size;

        return {
          key: 'operations',
          title: 'Audit Logs',
          description: 'Live history of HR, attendance, POS, order, finance, and inventory actions recorded in the app.',
          kpis: [
            { id: 'audit-total', label: 'Total Log Events', value: `${scopedLogs.length}`, delta: `${recentLogs.length} shown`, trend: scopedLogs.length > 0 ? 'up' : 'flat', tone: 'default' },
            { id: 'audit-warnings', label: 'Warnings / Errors', value: `${warningCount}`, delta: warningCount > 0 ? 'Needs review' : 'Clean', trend: warningCount > 0 ? 'down' : 'up', tone: warningCount > 0 ? 'warning' : 'success' },
            { id: 'audit-exports', label: 'Exports & Payslips', value: `${exportCount}`, delta: 'HR output actions', trend: exportCount > 0 ? 'up' : 'flat', tone: 'default' },
            { id: 'audit-actors', label: 'Distinct Actors', value: `${uniqueActors}`, delta: 'Named staff or system actors', trend: uniqueActors > 0 ? 'up' : 'flat', tone: 'success' }
          ],
          charts: [
            {
              id: 'audit-events',
              title: 'Audit Event Volume',
              subtitle: 'Last 7 days of recorded actions',
              series: this.buildAuditEventSeries(scopedLogs)
            }
          ],
          table: {
            title: 'Audit Timeline',
            subtitle: 'Track actions across the modules that mutate business-critical state.',
            columns: [
              { key: 'timestamp', label: 'Timestamp', sortable: true, visible: true },
              { key: 'module', label: 'Module', sortable: true, visible: true },
              { key: 'actor', label: 'Actor', sortable: true, visible: true },
              { key: 'action', label: 'Action', sortable: true, visible: true },
              { key: 'details', label: 'Details', sortable: true, visible: true },
              { key: 'status', label: 'Status', sortable: true, visible: true }
            ],
            rows: this.buildAuditRows(recentLogs)
          }
        };
      })
    );
  }

  private buildAuditRows(logs: ActionLogEntry[]): ReportRow[] {
    return logs.map(log => ({
      id: log.id,
      timestamp: new Date(log.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }),
      module: log.module,
      actor: log.performedByName || 'System',
      action: log.action,
      details: log.summary,
      status: log.status
    }));
  }

  private buildAuditEventSeries(logs: ActionLogEntry[]) {
    const series = Array.from({ length: 7 }, (_, offset) => {
      const currentDate = this.startOfDay(new Date());
      currentDate.setDate(currentDate.getDate() - (6 - offset));
      const key = currentDate.toISOString().slice(0, 10);
      const value = logs.filter(log => log.timestamp.slice(0, 10) === key).length;

      return {
        label: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
        value
      };
    });

    return series;
  }

  private buildSalesReport(
    orders: Order[],
    menuItems: MenuDefinition[],
    inventory: InventoryItem[],
    filters: GlobalReportFilters
  ): ReportPageData {
    const filteredOrders = this.getFilteredOrders(orders, filters);
    const selectedSummary = this.summarizeOrders(filteredOrders, menuItems, inventory);
    const daySummary = this.summarizeOrders(this.getOrdersWithinDays(orders, 1, filters.branch), menuItems, inventory);
    const weekSummary = this.summarizeOrders(this.getOrdersWithinDays(orders, 7, filters.branch), menuItems, inventory);
    const monthSummary = this.summarizeOrders(this.getOrdersWithinDays(orders, 30, filters.branch), menuItems, inventory);
    const grossMargin = selectedSummary.netSales > 0
      ? ((selectedSummary.netSales - selectedSummary.estimatedCogs) / selectedSummary.netSales) * 100
      : 0;

    return {
      key: 'sales',
      title: 'Sales Reports',
      description: 'Live sales reporting from paid orders. Gross sales are before discounts, net sales are after discounts, and drink cost is estimated from menu recipes linked to master inventory unit costs.',
      kpis: [
        this.buildKpi('Gross Sales Today', this.formatCurrency(daySummary.grossSales), `${daySummary.ordersCount} paid orders`, daySummary.grossSales > 0 ? 'up' : 'flat', 'success'),
        this.buildKpi('Gross Sales 7d', this.formatCurrency(weekSummary.grossSales), `${weekSummary.ordersCount} paid orders`, weekSummary.grossSales > 0 ? 'up' : 'flat', 'success'),
        this.buildKpi('Gross Sales 30d', this.formatCurrency(monthSummary.grossSales), `${monthSummary.ordersCount} paid orders`, monthSummary.grossSales > 0 ? 'up' : 'flat', 'success'),
        this.buildKpi('Gross Margin', `${grossMargin.toFixed(1)}%`, this.formatCurrency(selectedSummary.netSales - selectedSummary.estimatedCogs), grossMargin >= 0 ? 'up' : 'down', grossMargin >= 45 ? 'success' : 'warning')
      ],
      charts: [
        {
          id: 'sales-gross-trend',
          title: 'Gross Sales Trend',
          subtitle: 'Last 7 days of paid order sales before discounts',
          series: this.buildLastSevenDayOrderSeries(orders, menuItems, inventory, filters.branch, 'grossSales')
        },
        {
          id: 'sales-net-trend',
          title: 'Net Sales Trend',
          subtitle: 'Last 7 days of paid order sales after discounts',
          series: this.buildLastSevenDayOrderSeries(orders, menuItems, inventory, filters.branch, 'netSales')
        }
      ],
      table: {
        title: 'Daily Sales Ledger',
        subtitle: 'Daily paid-order summary with gross sales, discounts, net sales, estimated cost, and gross profit.',
        columns: [
          { key: 'date', label: 'Date', sortable: true, visible: true },
          { key: 'orders', label: 'Orders', sortable: true, visible: true },
          { key: 'grossSales', label: 'Gross Sales', sortable: true, visible: true },
          { key: 'discounts', label: 'Discounts', sortable: true, visible: true },
          { key: 'netSales', label: 'Net Sales', sortable: true, visible: true },
          { key: 'estimatedCogs', label: 'Est. Drink Cost', sortable: true, visible: true },
          { key: 'grossProfit', label: 'Gross Profit', sortable: true, visible: true },
          { key: 'avgTicket', label: 'Avg Ticket', sortable: true, visible: true }
        ],
        rows: this.buildDailyOrderRows(filteredOrders, menuItems, inventory)
      }
    };
  }

  private buildFinancialReport(
    orders: Order[],
    financeEntries: FinanceEntry[],
    menuItems: MenuDefinition[],
    inventory: InventoryItem[],
    filters: GlobalReportFilters
  ): ReportPageData {
    const filteredOrders = this.getFilteredOrders(orders, filters);
    const filteredEntries = this.getFilteredFinanceEntries(financeEntries, filters);
    const summary = this.summarizeOrders(filteredOrders, menuItems, inventory);
    const paymentBreakdown = this.getOrderPaymentBreakdown(filteredOrders);
    const spendings = filteredEntries
      .filter(entry => entry.type === 'spending')
      .reduce((sum, entry) => sum + entry.amount, 0);
    const manualSales = filteredEntries
      .filter(entry => entry.type === 'sale' && !this.isPosFinanceCategory(entry.category))
      .reduce((sum, entry) => sum + entry.amount, 0);
    const operatingProfit = summary.netSales + manualSales - summary.estimatedCogs - spendings;
    const rows = this.buildDailyFinancialRows(filteredOrders, filteredEntries, menuItems, inventory);

    return {
      key: 'financial',
      title: 'Financial Reports',
      description: 'Live financial report combining paid-order sales, manual finance adjustments, spending entries, and estimated drink cost from recipe-linked inventory.',
      kpis: [
        this.buildKpi('Gross Sales', this.formatCurrency(summary.grossSales), `${summary.ordersCount} paid orders`, summary.grossSales > 0 ? 'up' : 'flat', 'success'),
        this.buildKpi('Net Sales', this.formatCurrency(summary.netSales), this.formatCurrency(summary.discounts) + ' discounts', summary.netSales > 0 ? 'up' : 'flat', 'success'),
        this.buildKpi('Cash Sales', this.formatCurrency(paymentBreakdown.cash), this.formatCurrency(paymentBreakdown.gcash + paymentBreakdown.maya) + ' digital sales', paymentBreakdown.cash > 0 ? 'up' : 'flat', 'default'),
        this.buildKpi('Operating Profit', this.formatCurrency(operatingProfit), manualSales > 0 ? this.formatCurrency(manualSales) + ' manual sales adj.' : 'No manual sales adjustments', operatingProfit >= 0 ? 'up' : 'down', operatingProfit >= 0 ? 'success' : 'danger')
      ],
      charts: [
        {
          id: 'financial-net-sales',
          title: 'Net Sales vs Spendings',
          subtitle: 'Last 7 days of net sales against logged spendings',
          series: this.buildLastSevenDayFinancialSeries(orders, financeEntries, menuItems, inventory, filters.branch, 'netSales')
        },
        {
          id: 'financial-payment-mix',
          title: 'Payment Method Mix',
          subtitle: 'Paid order totals by payment method in selected range',
          series: [
            { label: 'Cash', value: Math.round(paymentBreakdown.cash) },
            { label: 'GCash', value: Math.round(paymentBreakdown.gcash) },
            { label: 'Maya', value: Math.round(paymentBreakdown.maya) }
          ]
        }
      ],
      table: {
        title: 'Daily Financial Ledger',
        subtitle: 'Daily view of gross sales, net sales, manual finance adjustments, spendings, estimated drink cost, and operating profit.',
        columns: [
          { key: 'date', label: 'Date', sortable: true, visible: true },
          { key: 'grossSales', label: 'Gross Sales', sortable: true, visible: true },
          { key: 'discounts', label: 'Discounts', sortable: true, visible: true },
          { key: 'netSales', label: 'Net Sales', sortable: true, visible: true },
          { key: 'cashSales', label: 'Cash Sales', sortable: true, visible: true },
          { key: 'gcashSales', label: 'GCash Sales', sortable: true, visible: true },
          { key: 'mayaSales', label: 'Maya Sales', sortable: true, visible: true },
          { key: 'manualSales', label: 'Manual Sales Adj.', sortable: true, visible: true },
          { key: 'spendings', label: 'Spendings', sortable: true, visible: true },
          { key: 'estimatedCogs', label: 'Est. Drink Cost', sortable: true, visible: true },
          { key: 'operatingProfit', label: 'Operating Profit', sortable: true, visible: true }
        ],
        rows
      }
    };
  }

  private buildInventoryReport(
    inventory: InventoryItem[],
    menuItems: MenuDefinition[],
    operations: InventoryOperation[],
    auditLogs: InventoryAuditLog[],
    filters: GlobalReportFilters
  ): ReportPageData {
    const filteredLogs = auditLogs.filter(log => this.inDateRange(log.timestamp, filters));
    const openOperations = operations.filter(operation => operation.status === 'open');
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
    const lowStockItems = inventory.filter(item => item.quantity <= this.getLowStockThreshold(item));
    const rows = inventory
      .map(item => {
        const linkedMenuItems = menuItems.filter(menuItem =>
          menuItem.ingredients.some(ingredient => ingredient.inventoryItemId === item.id)
        ).length;
        const usage = filteredLogs
          .filter(log => log.inventoryItemId === item.id && log.action === 'deduct')
          .reduce((sum, log) => sum + log.quantity, 0);
        const latestLog = filteredLogs
          .filter(log => log.inventoryItemId === item.id)
          .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())[0];

        return {
          id: `inventory-${item.id}`,
          item: item.name,
          currentStock: item.quantity,
          unit: item.unit,
          unitCost: this.formatCurrency(item.unitCost),
          valuation: this.formatCurrency(item.quantity * item.unitCost),
          linkedMenuItems,
          usage,
          status: item.quantity <= this.getLowStockThreshold(item) ? 'low stock' : 'healthy',
          lastMovement: latestLog ? `${latestLog.action} ${latestLog.quantity} ${latestLog.unit}` : 'no movement logged'
        };
      })
      .sort((left, right) => String(left.item).localeCompare(String(right.item)));

    return {
      key: 'inventory',
      title: 'Inventory Reports',
      description: 'Live inventory valuation, low-stock risk, usage, and menu linkage sourced from master inventory and operation audit logs.',
      kpis: [
        this.buildKpi('Inventory Value', this.formatCurrency(totalValue), `${inventory.length} master items`, totalValue > 0 ? 'up' : 'flat', 'success'),
        this.buildKpi('Low Stock Alerts', `${lowStockItems.length}`, lowStockItems.length > 0 ? 'Replenish soon' : 'Healthy stock', lowStockItems.length > 0 ? 'down' : 'up', lowStockItems.length > 0 ? 'warning' : 'success'),
        this.buildKpi('Open Operations', `${openOperations.length}`, openOperations.length > 0 ? 'Sessions consuming stock' : 'No active sessions', openOperations.length > 0 ? 'flat' : 'up'),
        this.buildKpi('Usage Events', `${filteredLogs.filter(log => log.action === 'deduct').length}`, `${filteredLogs.length} audit rows in range`, filteredLogs.length > 0 ? 'up' : 'flat')
      ],
      charts: [
        {
          id: 'inventory-valuation',
          title: 'Top Inventory Value',
          subtitle: 'Highest-value master inventory items',
          series: inventory
            .map(item => ({ label: item.name, value: Math.round(item.quantity * item.unitCost) }))
            .sort((left, right) => right.value - left.value)
            .slice(0, 7)
        },
        {
          id: 'inventory-usage',
          title: 'Top Ingredient Usage',
          subtitle: 'Deduction volume from operation audit logs',
          series: this.buildUsageSeries(filteredLogs)
        }
      ],
      table: {
        title: 'Inventory Position',
        subtitle: 'Current stock, valuation, usage, and recipe linkage for each master inventory item.',
        columns: [
          { key: 'item', label: 'Item', sortable: true, visible: true },
          { key: 'currentStock', label: 'Current Stock', sortable: true, visible: true },
          { key: 'unit', label: 'Unit', sortable: true, visible: true },
          { key: 'unitCost', label: 'Unit Cost', sortable: true, visible: true },
          { key: 'valuation', label: 'Valuation', sortable: true, visible: true },
          { key: 'linkedMenuItems', label: 'Menu Links', sortable: true, visible: true },
          { key: 'usage', label: 'Usage', sortable: true, visible: true },
          { key: 'status', label: 'Status', sortable: true, visible: true },
          { key: 'lastMovement', label: 'Last Movement', sortable: true, visible: true }
        ],
        rows
      }
    };
  }

  private buildCustomerReport(
    orders: Order[],
    customers: LoyaltyCustomer[],
    filters: GlobalReportFilters
  ): ReportPageData {
    const filteredOrders = this.getFilteredOrders(orders, filters);
    const customerMap = new Map<string, { purchases: number; lifetimeValue: number; loyaltyUsed: boolean }>();

    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const name = item.guestLabel?.trim().toLowerCase();
        if (!name) {
          return;
        }

        const existing = customerMap.get(name) ?? { purchases: 0, lifetimeValue: 0, loyaltyUsed: false };
        customerMap.set(name, {
          purchases: existing.purchases + item.quantity,
          lifetimeValue: existing.lifetimeValue + ((item.unitPrice * item.quantity) - item.discount),
          loyaltyUsed: existing.loyaltyUsed
        });
      });
    });

    customers.forEach(customer => {
      const key = customer.name.trim().toLowerCase();
      const existing = customerMap.get(key) ?? { purchases: 0, lifetimeValue: 0, loyaltyUsed: false };
      customerMap.set(key, {
        ...existing,
        loyaltyUsed: true
      });
    });

    const rows = Array.from(customerMap.entries())
      .map(([name, summary], index) => ({
        id: `customer-${index}`,
        customerId: `CUST-${String(index + 1).padStart(4, '0')}`,
        name,
        purchases: summary.purchases,
        lifetimeValue: this.formatCurrency(summary.lifetimeValue),
        repeat: summary.purchases > 1,
        loyaltyUsed: summary.loyaltyUsed,
        growthSegment: summary.lifetimeValue >= 2500 ? 'vip' : summary.purchases > 1 ? 'active' : 'new'
      }))
      .sort((left, right) => String(right.lifetimeValue).localeCompare(String(left.lifetimeValue)));

    const repeatCustomers = rows.filter(row => row.repeat).length;
    const totalLifetimeValue = Array.from(customerMap.values()).reduce((sum, customer) => sum + customer.lifetimeValue, 0);

    return {
      key: 'customer',
      title: 'Customer Reports',
      description: 'Customer insights from tagged guest names and loyalty profiles. More tagged orders improve the usefulness of this report.',
      kpis: [
        this.buildKpi('Tracked Customers', `${rows.length}`, `${customers.length} loyalty profiles`, rows.length > 0 ? 'up' : 'flat', rows.length > 0 ? 'success' : 'default'),
        this.buildKpi('Repeat Customers', `${repeatCustomers}`, rows.length > 0 ? `${((repeatCustomers / rows.length) * 100).toFixed(1)}% repeat rate` : 'No tagged orders yet', repeatCustomers > 0 ? 'up' : 'flat', repeatCustomers > 0 ? 'success' : 'default'),
        this.buildKpi('Customer Value', this.formatCurrency(totalLifetimeValue), rows.length > 0 ? this.formatCurrency(totalLifetimeValue / rows.length) + ' avg' : 'No tracked value', totalLifetimeValue > 0 ? 'up' : 'flat'),
        this.buildKpi('Loyalty Linked', `${rows.filter(row => row.loyaltyUsed).length}`, 'Customers matched to loyalty profiles', rows.some(row => row.loyaltyUsed) ? 'up' : 'flat')
      ],
      charts: [
        {
          id: 'customer-value',
          title: 'Top Customer Value',
          subtitle: 'Highest-value tagged customers',
          series: rows.slice(0, 7).map(row => ({ label: String(row.name), value: this.parseCurrency(row.lifetimeValue) }))
        },
        {
          id: 'customer-segments',
          title: 'Customer Segment Mix',
          subtitle: 'Distribution of tracked customer value tiers',
          series: [
            { label: 'VIP', value: rows.filter(row => row.growthSegment === 'vip').length },
            { label: 'Active', value: rows.filter(row => row.growthSegment === 'active').length },
            { label: 'New', value: rows.filter(row => row.growthSegment === 'new').length }
          ]
        }
      ],
      table: {
        title: 'Customer Ledger',
        subtitle: 'Guest names and loyalty-linked customers derived from live order tags.',
        columns: [
          { key: 'customerId', label: 'Customer ID', sortable: true, visible: true },
          { key: 'name', label: 'Name', sortable: true, visible: true },
          { key: 'purchases', label: 'Purchases', sortable: true, visible: true },
          { key: 'lifetimeValue', label: 'Lifetime Value', sortable: true, visible: true },
          { key: 'repeat', label: 'Repeat', sortable: true, visible: true },
          { key: 'loyaltyUsed', label: 'Loyalty Linked', sortable: true, visible: true },
          { key: 'growthSegment', label: 'Segment', sortable: true, visible: true }
        ],
        rows
      }
    };
  }

  private buildOperationsReport(
    orders: Order[],
    operations: InventoryOperation[],
    auditLogs: InventoryAuditLog[],
    filters: GlobalReportFilters
  ): ReportPageData {
    const filteredOrders = this.getFilteredOrders(orders, filters);
    const filteredOperations = operations.filter(operation => this.inDateRange(operation.openedAt || operation.date, filters));
    const filteredLogs = auditLogs.filter(log => this.inDateRange(log.timestamp, filters));
    const activeOrders = filteredOrders.filter(order => order.status === 'queued' || order.status === 'preparing' || order.status === 'ready');
    const cancelledOrders = filteredOrders.filter(order => order.status === 'cancelled');
    const rows = filteredOperations.map(operation => ({
      id: operation.id,
      date: operation.date,
      type: operation.type,
      status: operation.status,
      openedBy: operation.openedBy,
      items: operation.items.length,
      pulledValue: this.formatCurrency(operation.items.reduce((sum, item) => sum + (item.pulledQuantity * item.unitCost), 0)),
      startingCash: this.formatCurrency(operation.startingCash ?? 0),
      cashSales: this.formatCurrency(operation.cashSalesTotal ?? 0),
      expectedClosingCash: this.formatCurrency(operation.expectedClosingCash ?? (operation.startingCash ?? 0)),
      endingCash: this.formatCurrency(operation.endingCash ?? 0),
      cashVariance: this.formatCurrency(operation.cashVariance ?? 0),
      notes: operation.notes || 'no notes'
    }));

    return {
      key: 'operations',
      title: 'Operations Reports',
      description: 'Live operational reporting from queue orders, operation sessions, and inventory audit logs.',
      kpis: [
        this.buildKpi('Active Queue Orders', `${activeOrders.length}`, activeOrders.length > 0 ? 'Queue in motion' : 'Queue is clear', activeOrders.length > 0 ? 'flat' : 'up', activeOrders.length > 0 ? 'default' : 'success'),
        this.buildKpi('Cancelled Orders', `${cancelledOrders.length}`, filteredOrders.length > 0 ? `${((cancelledOrders.length / filteredOrders.length) * 100).toFixed(1)}% cancel rate` : 'No orders in range', cancelledOrders.length > 0 ? 'down' : 'flat', cancelledOrders.length > 0 ? 'warning' : 'success'),
        this.buildKpi('Open Sessions', `${filteredOperations.filter(operation => operation.status === 'open').length}`, `${filteredOperations.length} sessions in range`, filteredOperations.some(operation => operation.status === 'open') ? 'flat' : 'up'),
        this.buildKpi('Inventory Audit Events', `${filteredLogs.length}`, `${filteredLogs.filter(log => log.action === 'restore').length} restores`, filteredLogs.length > 0 ? 'up' : 'flat')
      ],
      charts: [
        {
          id: 'operations-session-mix',
          title: 'Session Mix',
          subtitle: 'Operation sessions by channel',
          series: [
            { label: 'Store', value: filteredOperations.filter(operation => operation.type === 'store').length },
            { label: 'Pop-up', value: filteredOperations.filter(operation => operation.type === 'popup').length },
            { label: 'Event', value: filteredOperations.filter(operation => operation.type === 'event').length }
          ]
        },
        {
          id: 'operations-order-status',
          title: 'Order Status Mix',
          subtitle: 'Orders by current workflow status',
          series: [
            { label: 'Queued', value: filteredOrders.filter(order => order.status === 'queued').length },
            { label: 'Preparing', value: filteredOrders.filter(order => order.status === 'preparing').length },
            { label: 'Ready', value: filteredOrders.filter(order => order.status === 'ready').length },
            { label: 'Completed', value: filteredOrders.filter(order => order.status === 'completed').length },
            { label: 'Cancelled', value: cancelledOrders.length }
          ]
        }
      ],
      table: {
        title: 'Operation Sessions',
        subtitle: 'Opened sessions, stock pulled, and cash reconciliation across store, pop-up, and event operations.',
        columns: [
          { key: 'date', label: 'Date', sortable: true, visible: true },
          { key: 'type', label: 'Type', sortable: true, visible: true },
          { key: 'status', label: 'Status', sortable: true, visible: true },
          { key: 'openedBy', label: 'Opened By', sortable: true, visible: true },
          { key: 'items', label: 'Items', sortable: true, visible: true },
          { key: 'pulledValue', label: 'Pulled Value', sortable: true, visible: true },
          { key: 'startingCash', label: 'Starting Cash', sortable: true, visible: true },
          { key: 'cashSales', label: 'Cash Sales', sortable: true, visible: true },
          { key: 'expectedClosingCash', label: 'Expected Cash', sortable: true, visible: true },
          { key: 'endingCash', label: 'Ending Cash', sortable: true, visible: true },
          { key: 'cashVariance', label: 'Cash Variance', sortable: true, visible: true },
          { key: 'notes', label: 'Notes', sortable: true, visible: true }
        ],
        rows
      }
    };
  }

  private getFilteredOrders(orders: Order[], filters: GlobalReportFilters): Order[] {
    const search = filters.search.trim().toLowerCase();

    return orders
      .filter(order => order.status !== 'cancelled')
      .filter(order => order.paymentStatus === 'paid' || order.paymentStatus === 'partial')
      .filter(order => this.inDateRange(order.createdAt, filters))
      .filter(order => filters.branch === 'all' || this.mapOrderSourceToBranch(order.source) === filters.branch)
      .filter(order => {
        if (!search) {
          return true;
        }

        return [
          order.orderNumber,
          order.source,
          order.notes,
          ...order.items.map(item => item.itemName),
          ...order.items.map(item => item.guestLabel)
        ].some(value => (value || '').toLowerCase().includes(search));
      });
  }

  private getFilteredFinanceEntries(entries: FinanceEntry[], filters: GlobalReportFilters): FinanceEntry[] {
    const search = filters.search.trim().toLowerCase();

    return entries
      .filter(entry => this.inDateRange(entry.createdAt, filters))
      .filter(entry => filters.financeEntryType === 'all' || entry.type === filters.financeEntryType)
      .filter(entry => filters.financeCategory === 'all' || entry.category === filters.financeCategory)
      .filter(entry => {
        if (filters.financeEntrySource === 'all') {
          return true;
        }

        const paymentMethod = this.getSystemPaymentMethodFromEntry(entry);
        const isSystem = paymentMethod !== null;
        if (filters.financeEntrySource === 'system') {
          return isSystem;
        }

        if (filters.financeEntrySource === 'manual') {
          return !isSystem;
        }

        if (filters.financeEntrySource === 'system-cash') {
          return paymentMethod === PaymentMethod.CASH;
        }

        if (filters.financeEntrySource === 'system-gcash') {
          return paymentMethod === PaymentMethod.GCASH;
        }

        if (filters.financeEntrySource === 'system-maya') {
          return paymentMethod === PaymentMethod.MAYA;
        }

        return true;
      })
      .filter(entry => {
        if (!search) {
          return true;
        }

        return [entry.note, entry.category, entry.type, entry.createdAt]
          .some(value => value.toLowerCase().includes(search));
      });
  }

  private getOrdersWithinDays(orders: Order[], days: number, branch: string): Order[] {
    const now = new Date().getTime();
    const from = new Date(now - (days * 24 * 60 * 60 * 1000)).toISOString();
    return this.getFilteredOrders(orders, {
      dateRange: { from, to: new Date().toISOString() },
      branch,
      search: '',
      financeCategory: 'all',
      financeEntryType: 'all',
      financeEntrySource: 'all'
    });
  }

  private summarizeOrders(orders: Order[], menuItems: MenuDefinition[], inventory: InventoryItem[]): OrderSummary {
    return orders.reduce<OrderSummary>((summary, order) => {
      const estimatedCogs = this.estimateOrderCost(order, menuItems, inventory);
      return {
        grossSales: summary.grossSales + order.totalAmount,
        discounts: summary.discounts + order.discountApplied,
        netSales: summary.netSales + order.finalAmount,
        estimatedCogs: summary.estimatedCogs + estimatedCogs,
        ordersCount: summary.ordersCount + 1
      };
    }, {
      grossSales: 0,
      discounts: 0,
      netSales: 0,
      estimatedCogs: 0,
      ordersCount: 0
    });
  }

  private buildDailyOrderRows(orders: Order[], menuItems: MenuDefinition[], inventory: InventoryItem[]): ReportRow[] {
    const rows = new Map<string, OrderSummary>();

    orders.forEach(order => {
      const key = this.dateKey(order.createdAt);
      const existing = rows.get(key) ?? { grossSales: 0, discounts: 0, netSales: 0, estimatedCogs: 0, ordersCount: 0 };
      const estimatedCogs = this.estimateOrderCost(order, menuItems, inventory);
      rows.set(key, {
        grossSales: existing.grossSales + order.totalAmount,
        discounts: existing.discounts + order.discountApplied,
        netSales: existing.netSales + order.finalAmount,
        estimatedCogs: existing.estimatedCogs + estimatedCogs,
        ordersCount: existing.ordersCount + 1
      });
    });

    return Array.from(rows.entries())
      .sort((left, right) => right[0].localeCompare(left[0]))
      .map(([date, summary]) => ({
        id: `sales-${date}`,
        date,
        orders: summary.ordersCount,
        grossSales: this.formatCurrency(summary.grossSales),
        discounts: this.formatCurrency(summary.discounts),
        netSales: this.formatCurrency(summary.netSales),
        estimatedCogs: this.formatCurrency(summary.estimatedCogs),
        grossProfit: this.formatCurrency(summary.netSales - summary.estimatedCogs),
        avgTicket: this.formatCurrency(summary.ordersCount > 0 ? summary.netSales / summary.ordersCount : 0)
      }));
  }

  private buildDailyFinancialRows(
    orders: Order[],
    financeEntries: FinanceEntry[],
    menuItems: MenuDefinition[],
    inventory: InventoryItem[]
  ): ReportRow[] {
    const rows = new Map<string, {
      grossSales: number;
      discounts: number;
      netSales: number;
      cashSales: number;
      gcashSales: number;
      mayaSales: number;
      manualSales: number;
      spendings: number;
      estimatedCogs: number;
    }>();

    orders.forEach(order => {
      const key = this.dateKey(order.createdAt);
      const existing = rows.get(key) ?? {
        grossSales: 0,
        discounts: 0,
        netSales: 0,
        cashSales: 0,
        gcashSales: 0,
        mayaSales: 0,
        manualSales: 0,
        spendings: 0,
        estimatedCogs: 0
      };
      const paymentBreakdown = this.getOrderPaymentBreakdown([order]);
      rows.set(key, {
        ...existing,
        grossSales: existing.grossSales + order.totalAmount,
        discounts: existing.discounts + order.discountApplied,
        netSales: existing.netSales + order.finalAmount,
        cashSales: existing.cashSales + paymentBreakdown.cash,
        gcashSales: existing.gcashSales + paymentBreakdown.gcash,
        mayaSales: existing.mayaSales + paymentBreakdown.maya,
        estimatedCogs: existing.estimatedCogs + this.estimateOrderCost(order, menuItems, inventory)
      });
    });

    financeEntries.forEach(entry => {
      const key = this.dateKey(entry.createdAt);
      const existing = rows.get(key) ?? {
        grossSales: 0,
        discounts: 0,
        netSales: 0,
        cashSales: 0,
        gcashSales: 0,
        mayaSales: 0,
        manualSales: 0,
        spendings: 0,
        estimatedCogs: 0
      };
      rows.set(key, {
        ...existing,
        manualSales: existing.manualSales + (entry.type === 'sale' && !this.isPosFinanceCategory(entry.category) ? entry.amount : 0),
        spendings: existing.spendings + (entry.type === 'spending' ? entry.amount : 0)
      });
    });

    return Array.from(rows.entries())
      .sort((left, right) => right[0].localeCompare(left[0]))
      .map(([date, summary]) => ({
        id: `financial-${date}`,
        date,
        grossSales: this.formatCurrency(summary.grossSales),
        discounts: this.formatCurrency(summary.discounts),
        netSales: this.formatCurrency(summary.netSales),
        cashSales: this.formatCurrency(summary.cashSales),
        gcashSales: this.formatCurrency(summary.gcashSales),
        mayaSales: this.formatCurrency(summary.mayaSales),
        manualSales: this.formatCurrency(summary.manualSales),
        spendings: this.formatCurrency(summary.spendings),
        estimatedCogs: this.formatCurrency(summary.estimatedCogs),
        operatingProfit: this.formatCurrency(summary.netSales + summary.manualSales - summary.estimatedCogs - summary.spendings)
      }));
  }

  private buildLastSevenDayOrderSeries(
    orders: Order[],
    menuItems: MenuDefinition[],
    inventory: InventoryItem[],
    branch: string,
    metric: keyof OrderSummary
  ) {
    return Array.from({ length: 7 }).map((_, index) => {
      const day = this.startOfDay(new Date());
      day.setDate(day.getDate() - (6 - index));
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      const dailyOrders = this.getFilteredOrders(orders, {
        dateRange: { from: day.toISOString(), to: nextDay.toISOString() },
        branch,
        search: '',
        financeCategory: 'all',
        financeEntryType: 'all',
        financeEntrySource: 'all'
      });
      const summary = this.summarizeOrders(dailyOrders, menuItems, inventory);

      return {
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        value: Math.round(summary[metric] as number)
      };
    });
  }

  private buildLastSevenDayFinancialSeries(
    orders: Order[],
    financeEntries: FinanceEntry[],
    menuItems: MenuDefinition[],
    inventory: InventoryItem[],
    branch: string,
    metric: 'netSales' | 'operatingProfit'
  ) {
    return Array.from({ length: 7 }).map((_, index) => {
      const day = this.startOfDay(new Date());
      day.setDate(day.getDate() - (6 - index));
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      const filters: GlobalReportFilters = {
        dateRange: { from: day.toISOString(), to: nextDay.toISOString() },
        branch,
        search: '',
        financeCategory: 'all',
        financeEntryType: 'all',
        financeEntrySource: 'all'
      };
      const dailyOrders = this.getFilteredOrders(orders, filters);
      const dailyEntries = financeEntries.filter(entry => this.inDateRange(entry.createdAt, filters));
      const summary = this.summarizeOrders(dailyOrders, menuItems, inventory);
      const spendings = dailyEntries.filter(entry => entry.type === 'spending').reduce((sum, entry) => sum + entry.amount, 0);
      const manualSales = dailyEntries.filter(entry => entry.type === 'sale' && !this.isPosFinanceCategory(entry.category)).reduce((sum, entry) => sum + entry.amount, 0);
      const value = metric === 'netSales'
        ? summary.netSales
        : summary.netSales + manualSales - summary.estimatedCogs - spendings;

      return {
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        value: Math.round(value)
      };
    });
  }

  private buildProductionReport(
    operations: InventoryOperation[],
    auditLogs: InventoryAuditLog[],
    filters: GlobalReportFilters
  ): ReportPageData {
    const filteredOps = operations.filter(op => this.inDateRange(op.openedAt || op.date, filters));
    const filteredLogs = auditLogs.filter(log => this.inDateRange(log.timestamp, filters));
    const pullLogs = filteredLogs.filter(log => log.action === 'deduct');
    const totalPulled = pullLogs.reduce((sum, log) => sum + log.quantity, 0);
    const uniqueIngredients = new Set(pullLogs.map(log => log.inventoryItemId)).size;
    const rows = filteredOps.map(op => ({
      id: op.id,
      date: op.date,
      sessionType: op.type,
      openedBy: op.openedBy,
      items: op.items.length,
      totalPulled: op.items.reduce((sum, item) => sum + item.pulledQuantity, 0),
      pulledValue: this.formatCurrency(op.items.reduce((sum, item) => sum + (item.pulledQuantity * item.unitCost), 0)),
      status: op.status
    }));

    return {
      key: 'production',
      title: 'Production Reports',
      description: 'Session-level ingredient pull and production analytics derived from operation session records.',
      kpis: [
        this.buildKpi('Sessions in Range', `${filteredOps.length}`, `${filteredOps.filter(op => op.status === 'open').length} still open`, filteredOps.length > 0 ? 'up' : 'flat'),
        this.buildKpi('Total Deductions', `${pullLogs.length}`, `${totalPulled.toFixed(1)} units pulled total`, pullLogs.length > 0 ? 'up' : 'flat'),
        this.buildKpi('Unique Ingredients', `${uniqueIngredients}`, 'Distinct items used in range', uniqueIngredients > 0 ? 'up' : 'flat'),
        this.buildKpi('Avg Items / Session', filteredOps.length > 0 ? (pullLogs.length / filteredOps.length).toFixed(1) : '0', 'Deduction events per session', filteredOps.length > 0 ? 'up' : 'flat')
      ],
      charts: [
        {
          id: 'production-sessions',
          title: 'Sessions per Day',
          subtitle: 'Operation sessions opened in the last 7 days',
          series: this.buildSessionDailySeries(operations)
        },
        {
          id: 'production-ingredient-usage',
          title: 'Top Ingredient Pull',
          subtitle: 'Most deducted ingredients in selected range',
          series: this.buildUsageSeries(filteredLogs)
        }
      ],
      table: {
        title: 'Session Pull Log',
        subtitle: 'Per-session ingredient pull summary from operation sessions.',
        columns: [
          { key: 'date', label: 'Date', sortable: true, visible: true },
          { key: 'sessionType', label: 'Session Type', sortable: true, visible: true },
          { key: 'openedBy', label: 'Opened By', sortable: true, visible: true },
          { key: 'items', label: 'Line Items', sortable: true, visible: true },
          { key: 'totalPulled', label: 'Total Pulled', sortable: true, visible: true },
          { key: 'pulledValue', label: 'Pulled Value', sortable: true, visible: true },
          { key: 'status', label: 'Status', sortable: true, visible: true }
        ],
        rows
      }
    };
  }

  private buildMarketingReport(
    orders: Order[],
    menuItems: MenuDefinition[],
    inventory: InventoryItem[],
    filters: GlobalReportFilters
  ): ReportPageData {
    const filteredOrders = this.getFilteredOrders(orders, filters);
    const discountedOrders = filteredOrders.filter(order => order.discountApplied > 0);
    const totalDiscounts = discountedOrders.reduce((sum, order) => sum + order.discountApplied, 0);
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.finalAmount, 0);

    return {
      key: 'marketing',
      title: 'Marketing Reports',
      description: 'Promotional and discount activity derived from paid order data.',
      kpis: [
        this.buildKpi('Orders with Discounts', `${discountedOrders.length}`, `of ${filteredOrders.length} paid orders`, discountedOrders.length > 0 ? 'up' : 'flat', 'success'),
        this.buildKpi('Total Discounts Given', this.formatCurrency(totalDiscounts), filteredOrders.length > 0 ? `${((discountedOrders.length / Math.max(filteredOrders.length, 1)) * 100).toFixed(1)}% promo rate` : 'No orders in range', totalDiscounts > 0 ? 'up' : 'flat'),
        this.buildKpi('Net Sales (Promo Orders)', this.formatCurrency(discountedOrders.reduce((sum, o) => sum + o.finalAmount, 0)), 'Revenue from discounted orders', totalRevenue > 0 ? 'up' : 'flat', 'success'),
        this.buildKpi('Avg Discount per Order', this.formatCurrency(discountedOrders.length > 0 ? totalDiscounts / discountedOrders.length : 0), 'Average discount value applied', discountedOrders.length > 0 ? 'flat' : 'flat')
      ],
      charts: [
        {
          id: 'marketing-discounts-trend',
          title: 'Daily Discount Activity',
          subtitle: 'Discounted orders in the last 7 days',
          series: this.buildDailyDiscountSeries(orders, filters.branch)
        },
        {
          id: 'marketing-gross-vs-net',
          title: 'Gross vs Net Sales Trend',
          subtitle: 'Last 7 days: gross sales vs net sales after discounts',
          series: this.buildLastSevenDayOrderSeries(orders, menuItems, inventory, filters.branch, 'grossSales')
        }
      ],
      table: {
        title: 'Daily Discount Activity',
        subtitle: 'Orders, discounts given, and net sales by day in selected range.',
        columns: [
          { key: 'date', label: 'Date', sortable: true, visible: true },
          { key: 'orders', label: 'Total Orders', sortable: true, visible: true },
          { key: 'discountedOrders', label: 'Discounted Orders', sortable: true, visible: true },
          { key: 'totalDiscounts', label: 'Discounts Given', sortable: true, visible: true },
          { key: 'netSales', label: 'Net Sales', sortable: true, visible: true }
        ],
        rows: this.buildDailyMarketingRows(filteredOrders)
      }
    };
  }

  private buildUsageSeries(auditLogs: InventoryAuditLog[]) {
    const usageByItem = new Map<string, number>();

    auditLogs
      .filter(log => log.action === 'deduct')
      .forEach(log => {
        usageByItem.set(log.inventoryItemName, (usageByItem.get(log.inventoryItemName) || 0) + log.quantity);
      });

    return Array.from(usageByItem.entries())
      .map(([label, value]) => ({ label, value: Math.round(value) }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 7);
  }

  private buildSessionDailySeries(operations: InventoryOperation[]) {
    return Array.from({ length: 7 }).map((_, index) => {
      const day = this.startOfDay(new Date());
      day.setDate(day.getDate() - (6 - index));
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const count = operations.filter(op => {
        const t = new Date(op.openedAt || op.date).getTime();
        return t >= day.getTime() && t < nextDay.getTime();
      }).length;
      return {
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        value: count
      };
    });
  }

  private buildDailyDiscountSeries(orders: Order[], branch: string) {
    return Array.from({ length: 7 }).map((_, index) => {
      const day = this.startOfDay(new Date());
      day.setDate(day.getDate() - (6 - index));
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const dayOrders = orders.filter(order => {
        const t = new Date(order.createdAt).getTime();
        return t >= day.getTime() && t < nextDay.getTime()
          && (order.paymentStatus === 'paid' || order.paymentStatus === 'partial')
          && order.status !== 'cancelled'
          && (branch === 'all' || this.mapOrderSourceToBranch(order.source) === branch);
      });
      return {
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        value: dayOrders.filter(o => o.discountApplied > 0).length
      };
    });
  }

  private buildDailyMarketingRows(orders: Order[]): ReportRow[] {
    const rows = new Map<string, { orders: number; discountedOrders: number; totalDiscounts: number; netSales: number }>();
    orders.forEach(order => {
      const key = this.dateKey(order.createdAt);
      const existing = rows.get(key) ?? { orders: 0, discountedOrders: 0, totalDiscounts: 0, netSales: 0 };
      rows.set(key, {
        orders: existing.orders + 1,
        discountedOrders: existing.discountedOrders + (order.discountApplied > 0 ? 1 : 0),
        totalDiscounts: existing.totalDiscounts + order.discountApplied,
        netSales: existing.netSales + order.finalAmount
      });
    });
    return Array.from(rows.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, summary]) => ({
        id: `marketing-${date}`,
        date,
        orders: summary.orders,
        discountedOrders: summary.discountedOrders,
        totalDiscounts: this.formatCurrency(summary.totalDiscounts),
        netSales: this.formatCurrency(summary.netSales)
      }));
  }

  private estimateOrderCost(order: Order, menuItems: MenuDefinition[], inventory: InventoryItem[]): number {
    const menuById = new Map(menuItems.map(item => [String(item.id), item]));
    const menuByName = new Map(menuItems.map(item => [item.name.trim().toLowerCase(), item]));
    const inventoryById = new Map(inventory.map(item => [item.id, item]));

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

  private getOrderPaymentBreakdown(orders: Order[]): PaymentBreakdown {
    const totals = this.ordersStore.getPaymentMethodTotals(orders);
    return {
      cash: totals.cash,
      gcash: totals.gcash,
      maya: totals.maya
    };
  }

  private getSystemPaymentMethodFromEntry(entry: FinanceEntry): PaymentMethod | null {
    if (entry.type !== 'sale' || !this.isPosFinanceCategory(entry.category)) {
      return null;
    }

    if (entry.category === `pos-${PaymentMethod.GCASH}`) {
      return PaymentMethod.GCASH;
    }

    if (entry.category === `pos-${PaymentMethod.MAYA}`) {
      return PaymentMethod.MAYA;
    }

    return PaymentMethod.CASH;
  }

  private isPosFinanceCategory(category: string): boolean {
    return category === 'pos' || category.startsWith('pos-');
  }

  private inDateRange(dateValue: string, filters: GlobalReportFilters): boolean {
    const from = new Date(filters.dateRange.from);
    const to = new Date(filters.dateRange.to);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    const target = new Date(dateValue).getTime();
    return target >= from.getTime() && target <= to.getTime();
  }

  private mapOrderSourceToBranch(source?: Order['source']): string {
    if (source === 'popup') {
      return 'north';
    }

    if (source === 'event') {
      return 'east';
    }

    return 'main';
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

  private dateKey(dateValue: string): string {
    return new Date(dateValue).toISOString().slice(0, 10);
  }

  private startOfDay(dateValue: Date): Date {
    const day = new Date(dateValue);
    day.setHours(0, 0, 0, 0);
    return day;
  }

  private getCurrentRole(): ReportRole {
    return this.attendanceStore.canAccessAdminRoute() ? 'admin' : 'staff';
  }

  private parseCurrency(value: unknown): number {
    return Number(String(value).replace(/[^0-9.-]+/g, '')) || 0;
  }

  private formatCurrency(value: number): string {
    return `PHP ${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private buildKpi(
    label: string,
    value: string,
    delta: string,
    trend: 'up' | 'down' | 'flat',
    tone: KpiCard['tone'] = 'default'
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
