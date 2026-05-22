import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface LoyaltyCustomer {
  id: string;
  name: string;
  points: number;
}

@Injectable({ providedIn: 'root' })
export class LoyaltyStore {
  private readonly customersSubject = new BehaviorSubject<LoyaltyCustomer[]>([]);
  readonly customers$ = this.customersSubject.asObservable();

  // Simulate fetch from backend
  fetchCustomerByQr(qr: string) {
    // TODO: Replace with real API call
    const found = this.customersSubject.value.find(c => c.id === qr);
    return found || null;
  }

  addPoints(qr: string, points: number) {
    const customers = this.customersSubject.value.map(c =>
      c.id === qr ? { ...c, points: c.points + points } : c
    );
    this.customersSubject.next(customers);
  }
}
