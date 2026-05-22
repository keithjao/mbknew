import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MenuIngredient } from '../../admin/data/admin-inventory.store';
import { OperationType } from '../../admin/data/inventory-operations.store';
import { ActionLogStore } from '../logging/action-log.store';
import { AppClockStore } from '../testing/app-clock.store';
import { RemoteStateService } from '../state/remote-state.service';

export type StaffBudgetUsageType = 'staff-drink' | 'wastage-charge';
export type WastageStatus = 'open' | 'charged';

export interface StaffBudgetUsageEntry {
  id: string;
  staffId: string;
  staffName: string;
  monthKey: string;
  quantity: number;
  type: StaffBudgetUsageType;
  menuItemId: number;
  menuItemName: string;
  source: OperationType;
  recordedAt: string;
  recordedByStaffId?: string;
  recordedByName?: string;
  notes?: string;
  wastageRecordId?: string;
}

export interface WastageRecord {
  id: string;
  menuItemId: number;
  menuItemName: string;
  quantity: number;
  source: OperationType;
  ingredients: MenuIngredient[];
  reason: string;
  notes?: string;
  recordedAt: string;
  recordedByStaffId?: string;
  recordedByName?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedAt?: string;
  status: WastageStatus;
}

export interface MonthlyBudgetSummary {
  monthKey: string;
  budget: number;
  staffDrinks: number;
  wastageCharges: number;
  used: number;
  remaining: number;
}

export interface StaffDrinkBudgetRequest {
  staffId: string;
  staffName: string;
  monthlyBudget: number;
  quantity: number;
  menuItemId: number;
  menuItemName: string;
  source: OperationType;
  notes?: string;
  recordedByStaffId?: string;
  recordedByName?: string;
}

export interface WastageRecordRequest {
  menuItemId: number;
  menuItemName: string;
  quantity: number;
  source: OperationType;
  ingredients: MenuIngredient[];
  reason: string;
  notes?: string;
  recordedByStaffId?: string;
  recordedByName?: string;
}

export interface WastageAssignmentRequest {
  staffId: string;
  staffName: string;
  monthlyBudget: number;
  recordedByStaffId?: string;
  recordedByName?: string;
  notes?: string;
}

export interface StaffBudgetActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

const STORAGE_KEYS = {
  usage: 'mbk.staff-budget.usage',
  wastage: 'mbk.staff-budget.wastage'
};

@Injectable({ providedIn: 'root' })
export class StaffBudgetStore {
  private readonly remoteState = inject(RemoteStateService);
  private readonly usageSubject = new BehaviorSubject<StaffBudgetUsageEntry[]>(this.loadUsageEntries());
  private readonly wastageSubject = new BehaviorSubject<WastageRecord[]>(this.loadWastageRecords());

  readonly usage$ = this.usageSubject.asObservable();
  readonly wastage$ = this.wastageSubject.asObservable();

  constructor(
    private readonly actionLogStore: ActionLogStore,
    private readonly appClock: AppClockStore
  ) {
    this.persistUsage(this.usageSubject.value);
    this.persistWastage(this.wastageSubject.value);
  }

  getUsageEntries(): StaffBudgetUsageEntry[] {
    return this.usageSubject.value;
  }

  getWastageRecords(): WastageRecord[] {
    return this.wastageSubject.value;
  }

  getMonthlyBudgetSummary(staffId: string, monthlyBudget: number, referenceDate?: Date): MonthlyBudgetSummary {
    const activeReferenceDate = referenceDate || this.appClock.now();
    const monthKey = this.getMonthKey(activeReferenceDate);
    const usage = this.usageSubject.value.filter(entry => entry.staffId === staffId && entry.monthKey === monthKey);
    const staffDrinks = usage
      .filter(entry => entry.type === 'staff-drink')
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const wastageCharges = usage
      .filter(entry => entry.type === 'wastage-charge')
      .reduce((sum, entry) => sum + entry.quantity, 0);
    const budget = Math.max(Math.floor(monthlyBudget || 0), 0);
    const used = staffDrinks + wastageCharges;

    return {
      monthKey,
      budget,
      staffDrinks,
      wastageCharges,
      used,
      remaining: budget - used
    };
  }

  recordStaffDrink(request: StaffDrinkBudgetRequest): StaffBudgetActionResult<StaffBudgetUsageEntry> {
    const quantity = Math.max(Math.floor(request.quantity || 0), 0);
    if (!request.staffId || !request.staffName.trim() || quantity <= 0) {
      return { ok: false, message: 'select a staff member and enter a valid drink quantity.' };
    }

    const summary = this.getMonthlyBudgetSummary(request.staffId, request.monthlyBudget);
    if (quantity > summary.remaining) {
      return { ok: false, message: `${request.staffName} only has ${Math.max(summary.remaining, 0)} drink budget left this month.` };
    }

    const entry = this.createUsageEntry({
      staffId: request.staffId,
      staffName: request.staffName,
      quantity,
      type: 'staff-drink',
      menuItemId: request.menuItemId,
      menuItemName: request.menuItemName,
      source: request.source,
      notes: request.notes,
      recordedByStaffId: request.recordedByStaffId,
      recordedByName: request.recordedByName
    });

    const nextUsage = [entry, ...this.usageSubject.value];
    this.usageSubject.next(nextUsage);
    this.persistUsage(nextUsage);
    this.actionLogStore.addLog({
      module: 'pos',
      action: 'staff-drink-recorded',
      summary: `${request.staffName} used ${quantity} staff drink budget for ${request.menuItemName}.`,
      status: 'success',
      performedByStaffId: request.recordedByStaffId,
      performedByName: request.recordedByName,
      metadata: {
        targetStaffId: request.staffId,
        monthKey: entry.monthKey,
        quantity,
        menuItemId: request.menuItemId,
        source: request.source
      }
    });

    return { ok: true, message: 'staff drink recorded against the monthly budget.', data: entry };
  }

  recordWastage(request: WastageRecordRequest): StaffBudgetActionResult<WastageRecord> {
    const quantity = Math.max(Math.floor(request.quantity || 0), 0);
    if (!request.menuItemName.trim() || quantity <= 0 || request.ingredients.length === 0) {
      return { ok: false, message: 'select a menu item with a valid quantity and recipe before recording wastage.' };
    }

    const record: WastageRecord = {
      id: this.createId('wastage'),
      menuItemId: request.menuItemId,
      menuItemName: request.menuItemName,
      quantity,
      source: request.source,
      ingredients: request.ingredients.map(ingredient => ({ ...ingredient })),
      reason: request.reason.trim(),
      notes: request.notes?.trim() || '',
      recordedAt: this.appClock.isoNow(),
      recordedByStaffId: request.recordedByStaffId,
      recordedByName: request.recordedByName,
      status: 'open'
    };

    const nextRecords = [record, ...this.wastageSubject.value];
    this.wastageSubject.next(nextRecords);
    this.persistWastage(nextRecords);
    this.actionLogStore.addLog({
      module: 'pos',
      action: 'wastage-recorded',
      summary: `${quantity} ${quantity === 1 ? 'drink was' : 'drinks were'} recorded as wastage for ${request.menuItemName}.`,
      status: 'warning',
      performedByStaffId: request.recordedByStaffId,
      performedByName: request.recordedByName,
      metadata: {
        wastageId: record.id,
        quantity,
        menuItemId: request.menuItemId,
        source: request.source
      }
    });

    return { ok: true, message: 'wastage recorded and ready for staff assignment.', data: record };
  }

  assignWastage(wastageId: string, request: WastageAssignmentRequest): StaffBudgetActionResult<WastageRecord> {
    const existing = this.wastageSubject.value.find(record => record.id === wastageId);
    if (!existing) {
      return { ok: false, message: 'wastage record not found.' };
    }

    if (existing.status === 'charged') {
      return { ok: false, message: 'this wastage record has already been charged to a staff budget.' };
    }

    const chargedEntry = this.createUsageEntry({
      staffId: request.staffId,
      staffName: request.staffName,
      quantity: existing.quantity,
      type: 'wastage-charge',
      menuItemId: existing.menuItemId,
      menuItemName: existing.menuItemName,
      source: existing.source,
      notes: request.notes || existing.reason,
      recordedByStaffId: request.recordedByStaffId,
      recordedByName: request.recordedByName,
      wastageRecordId: existing.id
    });

    const nextUsage = [chargedEntry, ...this.usageSubject.value];
    this.usageSubject.next(nextUsage);
    this.persistUsage(nextUsage);

    let updatedRecord: WastageRecord | undefined;
    const nextWastage = this.wastageSubject.value.map(record => {
      if (record.id !== wastageId) {
        return record;
      }

      updatedRecord = {
        ...record,
        status: 'charged',
        assignedStaffId: request.staffId,
        assignedStaffName: request.staffName,
        assignedAt: this.appClock.isoNow()
      };

      return updatedRecord;
    });

    this.wastageSubject.next(nextWastage);
    this.persistWastage(nextWastage);

    const summary = this.getMonthlyBudgetSummary(request.staffId, request.monthlyBudget);
    this.actionLogStore.addLog({
      module: 'pos',
      action: 'wastage-charged',
      summary: `${existing.menuItemName} wastage was charged to ${request.staffName}'s monthly drink budget.`,
      status: summary.remaining < 0 ? 'warning' : 'success',
      performedByStaffId: request.recordedByStaffId,
      performedByName: request.recordedByName,
      metadata: {
        wastageId,
        targetStaffId: request.staffId,
        remainingBudget: summary.remaining,
        quantity: existing.quantity,
        source: existing.source
      }
    });

    return { ok: true, message: 'wastage charged to the selected staff budget.', data: updatedRecord };
  }

  private createUsageEntry(payload: Omit<StaffBudgetUsageEntry, 'id' | 'monthKey' | 'recordedAt'>): StaffBudgetUsageEntry {
    return {
      id: this.createId('budget'),
      monthKey: this.getMonthKey(this.appClock.now()),
      recordedAt: this.appClock.isoNow(),
      ...payload,
      notes: payload.notes?.trim() || ''
    };
  }

  private loadUsageEntries(): StaffBudgetUsageEntry[] {
    try {
      return (this.remoteState.getState<Partial<StaffBudgetUsageEntry>[]>(STORAGE_KEYS.usage, [])).map(entry => ({
        id: entry.id || this.createId('budget'),
        staffId: entry.staffId || '',
        staffName: entry.staffName || 'Unknown Staff',
        monthKey: entry.monthKey || this.getMonthKey(this.appClock.now()),
        quantity: Math.max(Math.floor(entry.quantity || 0), 0),
        type: entry.type || 'staff-drink',
        menuItemId: Number(entry.menuItemId) || 0,
        menuItemName: entry.menuItemName || 'Unknown Item',
        source: entry.source || 'store',
        recordedAt: entry.recordedAt || this.appClock.isoNow(),
        recordedByStaffId: entry.recordedByStaffId,
        recordedByName: entry.recordedByName,
        notes: entry.notes || '',
        wastageRecordId: entry.wastageRecordId
      }));
    } catch {
      return [];
    }
  }

  private loadWastageRecords(): WastageRecord[] {
    try {
      return (this.remoteState.getState<Partial<WastageRecord>[]>(STORAGE_KEYS.wastage, [])).map(record => ({
        id: record.id || this.createId('wastage'),
        menuItemId: Number(record.menuItemId) || 0,
        menuItemName: record.menuItemName || 'Unknown Item',
        quantity: Math.max(Math.floor(record.quantity || 0), 0),
        source: record.source || 'store',
        ingredients: (record.ingredients || []).map(ingredient => ({ ...ingredient })),
        reason: record.reason || 'Wastage recorded',
        notes: record.notes || '',
        recordedAt: record.recordedAt || this.appClock.isoNow(),
        recordedByStaffId: record.recordedByStaffId,
        recordedByName: record.recordedByName,
        assignedStaffId: record.assignedStaffId,
        assignedStaffName: record.assignedStaffName,
        assignedAt: record.assignedAt,
        status: record.status || 'open'
      }));
    } catch {
      return [];
    }
  }

  private persistUsage(entries: StaffBudgetUsageEntry[]): void {
    this.remoteState.setState(STORAGE_KEYS.usage, entries);
  }

  private persistWastage(records: WastageRecord[]): void {
    this.remoteState.setState(STORAGE_KEYS.wastage, records);
  }

  private getMonthKey(referenceDate: Date): string {
    return `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
  }

  private createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}