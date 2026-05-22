import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { RemoteStateService } from '../state/remote-state.service';

export interface AppClockState {
  overrideIso: string | null;
}

const STORAGE_KEY = 'mbk.testing.clock';

@Injectable({ providedIn: 'root' })
export class AppClockStore {
  private readonly remoteState = inject(RemoteStateService);
  private readonly stateSubject = new BehaviorSubject<AppClockState>(this.loadState());

  readonly state$ = this.stateSubject.asObservable();

  get state(): AppClockState {
    return this.stateSubject.value;
  }

  get isOverrideActive(): boolean {
    return !!this.state.overrideIso;
  }

  now(): Date {
    return this.state.overrideIso ? new Date(this.state.overrideIso) : new Date();
  }

  isoNow(): string {
    return this.now().toISOString();
  }

  todayKey(): string {
    return this.isoNow().slice(0, 10);
  }

  getInputValue(): string {
    if (!this.state.overrideIso) {
      return '';
    }

    const value = new Date(this.state.overrideIso);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  setOverride(inputValue: string): boolean {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) {
      return false;
    }

    const nextDate = new Date(trimmedValue);
    if (Number.isNaN(nextDate.getTime())) {
      return false;
    }

    const nextState: AppClockState = {
      overrideIso: nextDate.toISOString()
    };

    this.stateSubject.next(nextState);
    this.persistState(nextState);
    return true;
  }

  clearOverride(): void {
    const nextState: AppClockState = { overrideIso: null };
    this.stateSubject.next(nextState);
    this.persistState(nextState);
  }

  private loadState(): AppClockState {
    try {
      const parsed = this.remoteState.getState<Partial<AppClockState> | null>(STORAGE_KEY, null);
      if (!parsed?.overrideIso) {
        return { overrideIso: null };
      }

      const nextDate = new Date(parsed.overrideIso);
      return Number.isNaN(nextDate.getTime())
        ? { overrideIso: null }
        : { overrideIso: nextDate.toISOString() };
    } catch {
      return { overrideIso: null };
    }
  }

  private persistState(state: AppClockState): void {
    this.remoteState.setState(STORAGE_KEY, state);
  }
}
