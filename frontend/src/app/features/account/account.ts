import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CustomerAccountStore } from '../../shared/customer/customer-account.store';

interface AuthRoadmapState {
  title: string;
  status: string;
  description: string;
}

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account.html',
  styleUrl: './account.scss'
})
export class Account {
  private readonly customerAccountStore = inject(CustomerAccountStore);

  readonly accountMode = signal<'sign-in' | 'sign-up'>('sign-in');
  readonly customerAccounts = this.customerAccountStore.accounts;
  readonly customerSession = this.customerAccountStore.session;
  readonly currentAccount = computed(() => {
    const session = this.customerSession();
    if (!session) {
      return null;
    }

    return this.customerAccounts().find(account => account.id === session.customerId) ?? null;
  });
  readonly authRoadmap: AuthRoadmapState[] = [
    {
      title: 'email verification pending',
      status: 'backend planned',
      description: 'show the waiting state after sign up with resend verification as the primary action.'
    },
    {
      title: 'email verified',
      status: 'backend planned',
      description: 'confirm the verified account cleanly and unlock account-only experiences without adding noise.'
    },
    {
      title: 'forgot password request',
      status: 'backend planned',
      description: 'collect the email, confirm the reset send, and avoid exposing whether the address exists.'
    },
    {
      title: 'password reset success',
      status: 'backend planned',
      description: 'guide the customer back into sign in with one calm success state instead of a modal stack.'
    },
    {
      title: 'account security hold',
      status: 'backend planned',
      description: 'show retry limits, support messaging, and recovery next steps without turning the page into an error wall.'
    }
  ];

  signInEmail = '';
  signInPassword = '';
  signUpName = '';
  signUpEmail = '';
  signUpPassword = '';
  signUpConfirmPassword = '';
  accountFeedback = '';
  accountFeedbackTone: 'success' | 'error' | 'info' = 'info';

  openAccountMode(mode: 'sign-in' | 'sign-up'): void {
    this.accountMode.set(mode);
  }

  async signInCustomer(): Promise<void> {
    const result = await this.customerAccountStore.signIn(this.signInEmail, this.signInPassword);
    this.setAccountFeedback(result.ok ? 'success' : 'error', result.message);

    if (result.ok) {
      this.signInPassword = '';
    }
  }

  async signUpCustomer(): Promise<void> {
    const result = await this.customerAccountStore.signUp(
      this.signUpName,
      this.signUpEmail,
      this.signUpPassword,
      this.signUpConfirmPassword
    );
    this.setAccountFeedback(result.ok ? 'success' : 'error', result.message);

    if (result.ok) {
      this.signUpName = '';
      this.signUpEmail = '';
      this.signUpPassword = '';
      this.signUpConfirmPassword = '';
    }
  }

  signOutCustomer(): void {
    this.customerAccountStore.signOut();
    this.setAccountFeedback('info', 'you have been signed out.');
  }

  private setAccountFeedback(tone: 'success' | 'error' | 'info', message: string): void {
    this.accountFeedbackTone = tone;
    this.accountFeedback = message;
  }
}
