import { inject, Injectable, signal } from '@angular/core';
import { RemoteStateService } from '../state/remote-state.service';

export interface CustomerAccount {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSession {
  customerId: string;
  fullName: string;
  email: string;
  signedInAt: string;
}

export interface CustomerAuthResult {
  ok: boolean;
  message: string;
}

const STORAGE_KEYS = {
  accounts: 'mbk.customer.accounts',
  session: 'mbk.customer.session'
};

@Injectable({ providedIn: 'root' })
export class CustomerAccountStore {
  private readonly remoteState = inject(RemoteStateService);
  private readonly accountsState = signal<CustomerAccount[]>(this.getStoredAccounts());
  private readonly sessionState = signal<CustomerSession | null>(this.getStoredSession(this.accountsState()));

  readonly accounts = this.accountsState.asReadonly();
  readonly session = this.sessionState.asReadonly();

  constructor() {
    this.persistAccounts(this.accountsState());
    this.persistSession(this.sessionState());
  }

  async signUp(fullName: string, email: string, password: string, confirmPassword: string): Promise<CustomerAuthResult> {
    const normalizedName = fullName.trim();
    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedName) {
      return { ok: false, message: 'enter your full name.' };
    }

    if (!this.isValidEmail(normalizedEmail)) {
      return { ok: false, message: 'enter a valid email address.' };
    }

    if (password !== confirmPassword) {
      return { ok: false, message: 'the password confirmation does not match.' };
    }

    const passwordError = this.validatePassword(password);
    if (passwordError) {
      return { ok: false, message: passwordError };
    }

    if (this.accountsState().some(account => this.normalizeEmail(account.email) === normalizedEmail)) {
      return { ok: false, message: 'an account with that email already exists.' };
    }

    const passwordHash = await this.hashSecret(password);
    const now = new Date().toISOString();
    const account: CustomerAccount = {
      id: this.createId(),
      fullName: normalizedName,
      email: normalizedEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now
    };

    const nextAccounts = [account, ...this.accountsState()];
    this.accountsState.set(nextAccounts);
    this.persistAccounts(nextAccounts);

    const session: CustomerSession = {
      customerId: account.id,
      fullName: account.fullName,
      email: account.email,
      signedInAt: now
    };
    this.sessionState.set(session);
    this.persistSession(session);

    return { ok: true, message: `welcome, ${account.fullName}. your account is ready.` };
  }

  async signIn(email: string, password: string): Promise<CustomerAuthResult> {
    const normalizedEmail = this.normalizeEmail(email);
    const account = this.accountsState().find(entry => this.normalizeEmail(entry.email) === normalizedEmail);

    if (!account) {
      return { ok: false, message: 'no account was found for that email.' };
    }

    const passwordHash = await this.hashSecret(password);
    if (passwordHash !== account.passwordHash) {
      return { ok: false, message: 'the password is incorrect.' };
    }

    const session: CustomerSession = {
      customerId: account.id,
      fullName: account.fullName,
      email: account.email,
      signedInAt: new Date().toISOString()
    };

    this.sessionState.set(session);
    this.persistSession(session);
    return { ok: true, message: `welcome back, ${account.fullName}.` };
  }

  signOut(): void {
    this.sessionState.set(null);
    this.persistSession(null);
  }

  private getStoredAccounts(): CustomerAccount[] {
    try {
      return (this.remoteState.getState<Partial<CustomerAccount>[]>(STORAGE_KEYS.accounts, []))
        .filter(account => !!account.id && !!account.email && !!account.passwordHash)
        .map(account => ({
          id: account.id!,
          fullName: account.fullName?.trim() || 'Guest',
          email: this.normalizeEmail(account.email || ''),
          passwordHash: account.passwordHash || '',
          createdAt: account.createdAt || new Date().toISOString(),
          updatedAt: account.updatedAt || new Date().toISOString()
        }));
    } catch {
      return [];
    }
  }

  private getStoredSession(accounts: CustomerAccount[]): CustomerSession | null {
    try {
      const stored = this.remoteState.getState<Partial<CustomerSession> | null>(STORAGE_KEYS.session, null);
      if (!stored) {
        return null;
      }

      const activeAccount = accounts.find(account => account.id === stored.customerId);
      if (!activeAccount) {
        return null;
      }

      return {
        customerId: activeAccount.id,
        fullName: activeAccount.fullName,
        email: activeAccount.email,
        signedInAt: stored.signedInAt || new Date().toISOString()
      };
    } catch {
      return null;
    }
  }

  private persistAccounts(accounts: CustomerAccount[]): void {
    this.remoteState.setState(STORAGE_KEYS.accounts, accounts);
  }

  private persistSession(session: CustomerSession | null): void {
    if (!session) {
      this.remoteState.removeState(STORAGE_KEYS.session);
      return;
    }

    this.remoteState.setState(STORAGE_KEYS.session, session);
  }

  private normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private validatePassword(password: string): string | null {
    if (password.length < 8) {
      return 'use at least 8 characters for your password.';
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return 'use uppercase, lowercase, and a number in your password.';
    }

    return null;
  }

  private createId(): string {
    return `customer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private async hashSecret(value: string): Promise<string> {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
}