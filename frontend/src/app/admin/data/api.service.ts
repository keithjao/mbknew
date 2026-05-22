import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InventoryItem, MenuDefinition } from './admin-inventory.store';
import { FinanceEntry } from './finance.store';
import { resolveApiBase } from '../../shared/api/api-base';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly BASE = resolveApiBase();

  constructor(private readonly http: HttpClient) {}

  // Inventory
  getInventory(): Observable<InventoryItem[]> {
    return this.http.get<InventoryItem[]>(`${this.BASE}/inventory`);
  }
  addInventory(item: Partial<InventoryItem>): Observable<any> {
    return this.http.post(`${this.BASE}/inventory`, item);
  }

  // Menu
  getMenu(): Observable<MenuDefinition[]> {
    return this.http.get<MenuDefinition[]>(`${this.BASE}/menu`);
  }
  addMenu(item: Partial<MenuDefinition>): Observable<any> {
    return this.http.post(`${this.BASE}/menu`, item);
  }

  // Finance
  getFinance(): Observable<FinanceEntry[]> {
    return this.http.get<FinanceEntry[]>(`${this.BASE}/finance`);
  }
  addFinance(entry: Partial<FinanceEntry>): Observable<any> {
    return this.http.post(`${this.BASE}/finance`, entry);
  }
}
