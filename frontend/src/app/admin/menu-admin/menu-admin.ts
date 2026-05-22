import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  AdminInventoryStore,
  InventoryItem,
  InventoryUnit,
  MenuDefinition,
  MenuIngredient
} from '../data/admin-inventory.store';

interface IngredientDraft {
  item: InventoryItem;
  amount: number;
}

@Component({
  selector: 'app-menu-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-admin.html',
  styleUrl: './menu-admin.scss'
})
export class MenuAdmin implements OnInit, OnDestroy {
  menuItems: MenuDefinition[] = [];
  inventory: InventoryItem[] = [];
  categories: string[] = [];
  deleteTarget: MenuDefinition | null = null;
  editingItem: MenuDefinition | null = null;
  editingItemId: number | null = null;
  editIngredients: IngredientDraft[] = [];
  feedback = '';
  private readonly subscription = new Subscription();

  constructor(private readonly store: AdminInventoryStore) {}

  ngOnInit(): void {
    this.subscription.add(this.store.menuItems$.subscribe(items => {
      this.menuItems = items;

      if (this.editingItemId !== null) {
        this.editingItem = items.find(item => item.id === this.editingItemId) ?? null;
        if (!this.editingItem) {
          this.cancelEdit();
        }
      }

      if (this.deleteTarget) {
        this.deleteTarget = items.find(item => item.id === this.deleteTarget?.id) ?? null;
      }
    }));

    this.subscription.add(this.store.inventory$.subscribe(items => {
      this.inventory = items;
      this.editIngredients = this.editIngredients.filter(draft =>
        items.some(item => item.id === draft.item.id)
      );
    }));

    this.subscription.add(this.store.categories$.subscribe(categories => {
      this.categories = categories;
    }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  openDeleteDialog(item: MenuDefinition): void {
    this.deleteTarget = item;
  }

  closeDeleteDialog(): void {
    this.deleteTarget = null;
  }

  confirmDelete(typedName: string): void {
    if (!this.deleteTarget) {
      return;
    }

    if (typedName.trim().toLowerCase() !== this.deleteTarget.name) {
      this.feedback = `type \"${this.deleteTarget.name}\" exactly to delete this menu item.`;
      return;
    }

    const deletedItemName = this.deleteTarget.name;
    this.store.deleteMenuDefinition(this.deleteTarget.id);
    this.closeDeleteDialog();
    this.feedback = `${deletedItemName} removed from menu.`;
  }

  setAvailability(id: number, available: boolean): void {
    this.store.setMenuAvailability(id, available);
  }

  startEdit(item: MenuDefinition): void {
    this.editingItem = item;
    this.editingItemId = item.id;
    this.editIngredients = item.ingredients
      .map(ingredient => {
        const inventoryItem = this.inventory.find(entry => entry.id === ingredient.inventoryItemId);
        return inventoryItem
          ? { item: inventoryItem, amount: ingredient.amount }
          : null;
      })
      .filter((draft): draft is IngredientDraft => draft !== null);
    this.feedback = '';
  }

  cancelEdit(): void {
    this.editingItem = null;
    this.editingItemId = null;
    this.editIngredients = [];
  }

  toggleIngredient(item: InventoryItem, checked: boolean): void {
    if (checked && !this.editIngredients.some(draft => draft.item.id === item.id)) {
      this.editIngredients = [...this.editIngredients, { item, amount: 1 }];
      return;
    }

    if (!checked) {
      this.editIngredients = this.editIngredients.filter(draft => draft.item.id !== item.id);
    }
  }

  updateIngredientAmount(itemId: number, value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    this.editIngredients = this.editIngredients.map(draft =>
      draft.item.id === itemId ? { ...draft, amount: value } : draft
    );
  }

  isIngredientSelected(itemId: number): boolean {
    return this.editIngredients.some(draft => draft.item.id === itemId);
  }

  ingredientAmount(itemId: number): number {
    return this.editIngredients.find(draft => draft.item.id === itemId)?.amount ?? 1;
  }

  saveEdit(
    itemId: number,
    name: string,
    category: string,
    price: number,
    notes: string,
    available: boolean
  ): void {
    if (!name.trim() || !category.trim() || !Number.isFinite(price) || price <= 0) {
      this.feedback = 'fill in name, category, and a valid price.';
      return;
    }

    const ingredients: MenuIngredient[] = this.editIngredients.map(draft => ({
      inventoryItemId: draft.item.id,
      inventoryItemName: draft.item.name,
      amount: draft.amount,
      unit: draft.item.unit as InventoryUnit
    }));

    const didUpdate = this.store.updateMenuDefinition(itemId, {
      name,
      category,
      price,
      ingredients,
      notes,
      available
    });

    this.feedback = didUpdate
      ? 'menu item updated.'
      : 'unable to save menu item changes.';

    if (didUpdate) {
      this.cancelEdit();
    }
  }
}
