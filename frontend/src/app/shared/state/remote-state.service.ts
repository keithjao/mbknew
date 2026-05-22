import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { resolveApiBase } from '../api/api-base';

@Injectable({ providedIn: 'root' })
export class RemoteStateService {
  private readonly apiBase = `${resolveApiBase()}/state`;
  private readonly snapshot = new Map<string, unknown>();

  constructor(private readonly http: HttpClient) {}

  async initialize(): Promise<void> {
    const response = await firstValueFrom(
      this.http.get<Record<string, unknown>>(this.apiBase).pipe(
        catchError(error => {
          console.warn('Failed to load remote app state. Falling back to local browser state.', error);
          return of({});
        })
      )
    );

    this.snapshot.clear();
    Object.entries(response || {}).forEach(([key, value]) => {
      this.snapshot.set(key, value);
    });
  }

  hasState(key: string): boolean {
    return this.snapshot.has(key);
  }

  getState<T>(key: string, fallback: T): T {
    if (this.snapshot.has(key)) {
      return this.cloneValue(this.snapshot.get(key) as T);
    }

    const migrated = this.tryReadLegacyLocalState<T>(key);
    if (migrated.found) {
      this.snapshot.set(key, migrated.value);
      void this.persistState(key, migrated.value, true);
      return this.cloneValue(migrated.value);
    }

    return fallback;
  }

  setState<T>(key: string, value: T): void {
    this.snapshot.set(key, this.cloneValue(value));
    void this.persistState(key, value, true);
  }

  removeState(key: string): void {
    this.snapshot.delete(key);
    this.removeLegacyLocalState(key);
    void firstValueFrom(
      this.http.delete(`${this.apiBase}/${encodeURIComponent(key)}`).pipe(
        catchError(error => {
          console.warn(`Failed to remove remote state for ${key}.`, error);
          return of(null);
        })
      )
    );
  }

  async resetState(keys: string[] = [], prefixes: string[] = []): Promise<void> {
    keys.forEach(key => this.snapshot.delete(key));

    if (prefixes.length > 0) {
      Array.from(this.snapshot.keys()).forEach(key => {
        if (prefixes.some(prefix => key.startsWith(prefix))) {
          this.snapshot.delete(key);
        }
      });
    }

    keys.forEach(key => this.removeLegacyLocalState(key));
    prefixes.forEach(prefix => this.removeLegacyStateByPrefix(prefix));

    await firstValueFrom(
      this.http.post(`${this.apiBase}/reset`, { keys, prefixes }, { responseType: 'text' }).pipe(
        catchError(error => {
          console.warn('Failed to reset remote app state.', error);
          return of('');
        })
      )
    );
  }

  async refreshKey<T>(key: string): Promise<T | undefined> {
    const endpoint = `${this.apiBase}/${encodeURIComponent(key)}?t=${Date.now()}`;

    const response = await firstValueFrom(
      this.http.get<{ key: string; value: T }>(endpoint, {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache'
        }
      }).pipe(
        catchError(error => {
          if (error?.status === 404) {
            this.snapshot.delete(key);
            return of(null);
          }

          console.warn(`Failed to refresh remote state for ${key}.`, error);
          return of(null);
        })
      )
    );

    if (!response || !Object.prototype.hasOwnProperty.call(response, 'value')) {
      return undefined;
    }

    const nextValue = this.cloneValue(response.value);
    this.snapshot.set(key, nextValue);
    return nextValue;
  }

  private async persistState<T>(key: string, value: T, removeLegacyKey: boolean): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.apiBase}/${encodeURIComponent(key)}`, { value }, { responseType: 'text' }).pipe(
        catchError(error => {
          console.warn(`Failed to persist remote state for ${key}.`, error);
          return of('');
        })
      )
    );

    if (removeLegacyKey) {
      this.removeLegacyLocalState(key);
    }
  }

  private tryReadLegacyLocalState<T>(key: string): { found: boolean; value: T } {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        return { found: false, value: undefined as T };
      }

      return { found: true, value: JSON.parse(raw) as T };
    } catch {
      return { found: false, value: undefined as T };
    }
  }

  private removeLegacyStateByPrefix(prefix: string): void {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith(prefix))
        .forEach(key => localStorage.removeItem(key));
    } catch {
      console.warn(`Failed to clear legacy local state for prefix ${prefix}.`);
    }
  }

  private removeLegacyLocalState(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      console.warn(`Failed to clear legacy local state for ${key}.`);
    }
  }

  private cloneValue<T>(value: T): T {
    if (typeof globalThis.structuredClone === 'function') {
      return globalThis.structuredClone(value);
    }

    if (value === null || value === undefined || typeof value !== 'object') {
      return value;
    }

    return JSON.parse(JSON.stringify(value)) as T;
  }
}
