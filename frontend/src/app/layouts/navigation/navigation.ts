import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { map } from 'rxjs';
import { AdminInventoryStore } from '../../admin/data/admin-inventory.store';
import { CustomerAccountStore } from '../../shared/customer/customer-account.store';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navigation.html',
  styleUrl: './navigation.scss',
})
export class Navigation {
  private readonly inventoryStore = inject(AdminInventoryStore);
  readonly customerSession = inject(CustomerAccountStore).session;
  readonly liveMenuItems$ = this.inventoryStore.menuItems$.pipe(
    map(items => items.map(item => item.name))
  );
  readonly liveMenuCount$ = this.liveMenuItems$.pipe(map(items => items.length));
}
