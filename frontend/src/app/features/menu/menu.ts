import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AdminInventoryStore, MenuDefinition } from '../../admin/data/admin-inventory.store';

interface MenuDisplayItem {
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class Menu {
  filters: string[] = ['all'];
  activeFilter = 'all';
  menu: MenuDisplayItem[] = [];
  filteredMenu: MenuDisplayItem[] = [];
  page = 1;
  pageSize = 12;
  pagedMenu: MenuDisplayItem[] = [];
  totalPages = 1;
  private readonly subscription = new Subscription();

  constructor(private readonly store: AdminInventoryStore) {}

  ngOnInit(): void {
    this.subscription.add(this.store.categories$.subscribe(categories => {
      this.filters = ['all', ...categories];
      if (!this.filters.includes(this.activeFilter)) {
        this.activeFilter = 'all';
      }
      this.filterMenu();
    }));

    this.subscription.add(this.store.menuItems$.subscribe(items => {
      this.menu = items.map(item => this.toDisplayItem(item));
      this.filterMenu();
    }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private toDisplayItem(item: MenuDefinition): MenuDisplayItem {
    return {
      name: item.name,
      description: item.notes || this.ingredientPreview(item),
      price: item.price,
      category: item.category,
      available: item.available
    };
  }

  private ingredientPreview(item: MenuDefinition): string {
    if (item.ingredients.length === 0) {
      return 'crafted in menu builder';
    }

    return item.ingredients
      .slice(0, 2)
      .map(ingredient => `${ingredient.amount} ${ingredient.unit} ${ingredient.inventoryItemName}`)
      .join(', ');
  }

  filterMenu() {
    if (this.activeFilter === 'all') {
      this.filteredMenu = this.menu;
    } else {
      this.filteredMenu = this.menu.filter(item => item.category === this.activeFilter);
    }
    this.page = 1;
    this.updatePagedMenu();
  }

  updatePagedMenu() {
    this.totalPages = Math.ceil(this.filteredMenu.length / this.pageSize) || 1;
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedMenu = this.filteredMenu.slice(start, end);
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.updatePagedMenu();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.updatePagedMenu();
    }
  }
}
