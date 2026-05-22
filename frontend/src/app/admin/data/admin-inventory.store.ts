import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { RemoteStateService } from '../../shared/state/remote-state.service';

export type InventoryUnit = 'ml' | 'grams' | 'piece';

export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: InventoryUnit;
  unitCost: number;
}

export interface MenuIngredient {
  inventoryItemId: number;
  inventoryItemName: string;
  amount: number;
  unit: InventoryUnit;
}

export interface MenuDefinition {
  id: number;
  name: string;
  category: string;
  price: number;
  ingredients: MenuIngredient[];
  notes: string;
  available: boolean;
}

const STORAGE_KEYS = {
  inventory: 'mbk.admin.inventory',
  categories: 'mbk.admin.categories',
  menu: 'mbk.admin.menu'
};

@Injectable({ providedIn: 'root' })
export class AdminInventoryStore {
  private readonly remoteState = inject(RemoteStateService);
  private readonly inventorySubject = new BehaviorSubject<InventoryItem[]>(
    this.normalizeInventory(this.getStoredValue(STORAGE_KEYS.inventory, []))
  );

  private readonly categorySubject = new BehaviorSubject<string[]>(
    this.getStoredValue(STORAGE_KEYS.categories, [])
  );

  private readonly menuSubject = new BehaviorSubject<MenuDefinition[]>(
    this.normalizeMenu(this.getStoredValue(STORAGE_KEYS.menu, []))
  );

  readonly inventory$ = this.inventorySubject.asObservable();
  readonly categories$ = this.categorySubject.asObservable();
  readonly menuItems$ = this.menuSubject.asObservable();

  addInventoryItem(payload: Omit<InventoryItem, 'id'>): void {
    const item: InventoryItem = {
      id: this.createNumericId(),
      name: payload.name.trim().toLowerCase(),
      quantity: payload.quantity,
      unit: payload.unit,
      unitCost: payload.unitCost
    };
    const nextItems = [item, ...this.inventorySubject.value];
    this.inventorySubject.next(nextItems);
    this.persistValue(STORAGE_KEYS.inventory, nextItems);
  }

  adjustInventory(id: number, delta: number): boolean {
    let isValid = true;
    let didFindItem = false;
    const nextInventory = this.inventorySubject.value.map(item => {
      if (item.id !== id) {
        return item;
      }

      didFindItem = true;
      const nextQuantity = item.quantity + delta;
      if (nextQuantity < 0) {
        isValid = false;
        return item;
      }

      return { ...item, quantity: nextQuantity };
    });

    if (isValid && didFindItem) {
      this.inventorySubject.next(nextInventory);
      this.persistValue(STORAGE_KEYS.inventory, nextInventory);
    }

    return isValid && didFindItem;
  }

  deleteInventoryItem(id: number): void {
    const nextInventory = this.inventorySubject.value.filter(item => item.id !== id);
    this.inventorySubject.next(nextInventory);
    this.persistValue(STORAGE_KEYS.inventory, nextInventory);
  }

  updateInventoryItem(id: number, payload: Omit<InventoryItem, 'id'>): boolean {
    const normalizedName = payload.name.trim().toLowerCase();
    if (!normalizedName || !Number.isFinite(payload.quantity) || payload.quantity < 0 || !Number.isFinite(payload.unitCost) || payload.unitCost < 0) {
      return false;
    }

    let didUpdate = false;
    const nextInventory = this.inventorySubject.value.map(item => {
      if (item.id !== id) {
        return item;
      }

      didUpdate = true;
      return {
        ...item,
        name: normalizedName,
        quantity: payload.quantity,
        unit: payload.unit,
        unitCost: payload.unitCost
      };
    });

    if (!didUpdate) {
      return false;
    }

    this.inventorySubject.next(nextInventory);
    this.persistValue(STORAGE_KEYS.inventory, nextInventory);

    const nextMenu = this.menuSubject.value.map(menuItem => ({
      ...menuItem,
      ingredients: menuItem.ingredients.map(ingredient => {
        if (ingredient.inventoryItemId !== id) {
          return ingredient;
        }

        return {
          ...ingredient,
          inventoryItemName: normalizedName,
          unit: payload.unit
        };
      })
    }));

    this.menuSubject.next(nextMenu);
    this.persistValue(STORAGE_KEYS.menu, nextMenu);
    return true;
  }

  getInventoryItemById(id: number): InventoryItem | undefined {
    return this.inventorySubject.value.find(item => item.id === id);
  }

  getInventoryItemByName(name: string, unit?: InventoryUnit): InventoryItem | undefined {
    const normalizedName = name.trim().toLowerCase();
    if (!normalizedName) {
      return undefined;
    }

    return this.inventorySubject.value.find(item => {
      if (item.name !== normalizedName) {
        return false;
      }

      if (!unit) {
        return true;
      }

      return item.unit === unit;
    });
  }

  upsertInventoryItem(
    payload: Omit<InventoryItem, 'id'>,
    options: { preserveExistingQuantity?: boolean } = {}
  ): { item: InventoryItem; created: boolean; costChanged: boolean } | null {
    const normalizedName = payload.name.trim().toLowerCase();
    if (!normalizedName || !Number.isFinite(payload.quantity) || payload.quantity < 0 || !Number.isFinite(payload.unitCost) || payload.unitCost < 0) {
      return null;
    }

    const existing = this.getInventoryItemByName(normalizedName, payload.unit);
    if (!existing) {
      const item: InventoryItem = {
        id: this.createNumericId(),
        name: normalizedName,
        quantity: payload.quantity,
        unit: payload.unit,
        unitCost: payload.unitCost
      };

      const nextItems = [item, ...this.inventorySubject.value];
      this.inventorySubject.next(nextItems);
      this.persistValue(STORAGE_KEYS.inventory, nextItems);
      return { item, created: true, costChanged: false };
    }

    const costChanged = existing.unitCost !== payload.unitCost;
    const nextQuantity = options.preserveExistingQuantity
      ? existing.quantity
      : Math.max(existing.quantity, payload.quantity);

    const didUpdate = this.updateInventoryItem(existing.id, {
      name: normalizedName,
      quantity: nextQuantity,
      unit: payload.unit,
      unitCost: payload.unitCost
    });

    const updated = didUpdate
      ? this.getInventoryItemById(existing.id)
      : existing;

    if (!updated) {
      return null;
    }

    return { item: updated, created: false, costChanged };
  }

  addMenuDefinition(payload: Omit<MenuDefinition, 'id'>): void {
    this.addCategory(payload.category);

    const entry: MenuDefinition = {
      ...payload,
      id: this.createNumericId()
    };
    const nextMenu = [entry, ...this.menuSubject.value];
    this.menuSubject.next(nextMenu);
    this.persistValue(STORAGE_KEYS.menu, nextMenu);
  }

  upsertMenuDefinition(payload: Omit<MenuDefinition, 'id'>): { item: MenuDefinition; created: boolean } | null {
    const normalizedName = payload.name.trim().toLowerCase();
    const normalizedCategory = payload.category.trim().toLowerCase();

    if (!normalizedName || !normalizedCategory || !Number.isFinite(payload.price) || payload.price <= 0) {
      return null;
    }

    this.addCategory(normalizedCategory);
    const existing = this.menuSubject.value.find(item => item.name === normalizedName);

    if (!existing) {
      const entry: MenuDefinition = {
        ...payload,
        name: normalizedName,
        category: normalizedCategory,
        notes: payload.notes.trim().toLowerCase(),
        id: this.createNumericId()
      };

      const nextMenu = [entry, ...this.menuSubject.value];
      this.menuSubject.next(nextMenu);
      this.persistValue(STORAGE_KEYS.menu, nextMenu);
      return { item: entry, created: true };
    }

    const didUpdate = this.updateMenuDefinition(existing.id, {
      ...payload,
      name: normalizedName,
      category: normalizedCategory,
      notes: payload.notes.trim().toLowerCase()
    });

    const updated = didUpdate
      ? this.getMenuDefinitionById(existing.id)
      : existing;

    if (!updated) {
      return null;
    }

    return { item: updated, created: false };
  }

  addCategory(categoryName: string): boolean {
    const normalized = categoryName.trim().toLowerCase();
    if (!normalized) {
      return false;
    }

    const alreadyExists = this.categorySubject.value.includes(normalized);
    if (alreadyExists) {
      return false;
    }

    const nextCategories = [...this.categorySubject.value, normalized];
    this.categorySubject.next(nextCategories);
    this.persistValue(STORAGE_KEYS.categories, nextCategories);
    return true;
  }

  deleteMenuDefinition(id: number): void {
    const nextMenu = this.menuSubject.value.filter(item => item.id !== id);
    this.menuSubject.next(nextMenu);
    this.persistValue(STORAGE_KEYS.menu, nextMenu);
  }

  updateMenuDefinition(id: number, payload: Omit<MenuDefinition, 'id'>): boolean {
    const normalizedName = payload.name.trim().toLowerCase();
    const normalizedCategory = payload.category.trim().toLowerCase();

    if (!normalizedName || !normalizedCategory || !Number.isFinite(payload.price) || payload.price <= 0) {
      return false;
    }

    this.addCategory(normalizedCategory);

    let didUpdate = false;
    const nextMenu = this.menuSubject.value.map(item => {
      if (item.id !== id) {
        return item;
      }

      didUpdate = true;
      return {
        ...item,
        name: normalizedName,
        category: normalizedCategory,
        price: payload.price,
        ingredients: payload.ingredients,
        notes: payload.notes.trim().toLowerCase(),
        available: payload.available
      };
    });

    if (!didUpdate) {
      return false;
    }

    this.menuSubject.next(nextMenu);
    this.persistValue(STORAGE_KEYS.menu, nextMenu);
    return true;
  }

  getMenuDefinitionById(id: number): MenuDefinition | undefined {
    return this.menuSubject.value.find(item => item.id === id);
  }

  setMenuAvailability(id: number, available: boolean): void {
    const nextMenu = this.menuSubject.value.map(item => {
      if (item.id !== id) {
        return item;
      }

      return { ...item, available };
    });

    this.menuSubject.next(nextMenu);
    this.persistValue(STORAGE_KEYS.menu, nextMenu);
  }

  private normalizeMenu(menu: MenuDefinition[]): MenuDefinition[] {
    return menu.map(item => ({
      ...item,
      ingredients: item.ingredients.length > 0 ? item.ingredients : [],
      available: item.available ?? true
    }));
  }

  private normalizeInventory(inventory: InventoryItem[]): InventoryItem[] {
    return inventory.map(item => ({
      ...item,
      unitCost: item.unitCost && item.unitCost > 0 ? item.unitCost : 0
    }));
  }

  private getStoredValue<T>(key: string, fallback: T): T {
    try {
      return this.remoteState.getState<T>(key, fallback);
    } catch {
      return fallback;
    }
  }

  private persistValue<T>(key: string, value: T): void {
    this.remoteState.setState(key, value);
  }

  private createNumericId(): number {
    return Date.now() + Math.floor(Math.random() * 1000);
  }
}
