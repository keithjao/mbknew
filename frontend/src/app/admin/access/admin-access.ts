import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AttendanceStore } from '../../shared/attendance/attendance.store';

@Component({
  selector: 'app-admin-access',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-access.html',
  styleUrl: './admin-access.scss'
})
export class AdminAccess {
  authMode: 'master' | 'staff' = 'master';
  username = '';
  password = '';
  newPassword = '';
  confirmNewPassword = '';
  staffUsername = '';
  staffPassword = '';
  staffNewPassword = '';
  staffConfirmNewPassword = '';
  feedback = '';
  feedbackTone: 'success' | 'error' | 'info' = 'info';

  private readonly attendanceStore = inject(AttendanceStore);
  private readonly router = inject(Router);

  constructor() {
    this.username = this.attendanceStore.getMasterAdminUsername();
  }

  get adminSession() {
    return this.attendanceStore.getAdminSession();
  }

  get appSession() {
    return this.attendanceStore.getAppSession();
  }

  get signedInStaff() {
    return this.attendanceStore.getSignedInStaff();
  }

  get hasMasterAdminSession(): boolean {
    return this.attendanceStore.isMasterAdminActive();
  }

  get hasStaffWorkspaceSession(): boolean {
    return this.attendanceStore.hasSignedInStaffSession() && !this.hasMasterAdminSession;
  }

  get hasUnlockedAdminAccess(): boolean {
    return this.attendanceStore.canAccessAdminRoute();
  }

  get isSignedInStaffAdmin(): boolean {
    return this.signedInStaff?.role === 'admin';
  }

  get workspaceRoute(): string {
    if (this.hasUnlockedAdminAccess || this.isSignedInStaffAdmin) {
      return '/admin/master-inventory';
    }

    return '/admin/pos';
  }

  get requiresPasswordChange(): boolean {
    return this.hasMasterAdminSession && this.attendanceStore.isMasterAdminPasswordChangeRequired();
  }

  get bootstrapCredentials(): { username: string; password: string } | null {
    return this.attendanceStore.getMasterAdminBootstrapCredentials();
  }

  get requiresStaffPasswordChange(): boolean {
    return this.hasStaffWorkspaceSession && this.attendanceStore.isSignedInStaffPasswordChangeRequired();
  }

  openAuthMode(mode: 'master' | 'staff'): void {
    this.authMode = mode;
    this.feedback = '';
  }

  async signIn(): Promise<void> {
    const result = await this.attendanceStore.authenticateMasterAdmin(this.username, this.password);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);

    if (result.ok) {
      this.password = '';
      if (!result.requiresPasswordChange) {
        void this.router.navigateByUrl('/admin/pos');
      }
    }
  }

  async signInStaff(): Promise<void> {
    const result = await this.attendanceStore.authenticateStaffWorkspace(this.staffUsername, this.staffPassword);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);

    if (result.ok) {
      this.staffPassword = '';
      if (!result.requiresPasswordChange) {
        void this.router.navigateByUrl('/admin/pos');
      }
    }
  }

  async updatePassword(): Promise<void> {
    const result = await this.attendanceStore.changeMasterAdminPassword(this.newPassword, this.confirmNewPassword);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);

    if (result.ok) {
      this.newPassword = '';
      this.confirmNewPassword = '';
      void this.router.navigateByUrl('/admin/pos');
    }
  }

  signOut(): void {
    this.attendanceStore.clearAdminSession();
    this.password = '';
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.setFeedback('info', 'master admin signed out.');
    void this.router.navigateByUrl('/admin/access');
  }

  async updateStaffPassword(): Promise<void> {
    const result = await this.attendanceStore.changeSignedInStaffWorkspacePassword(this.staffNewPassword, this.staffConfirmNewPassword);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);

    if (result.ok) {
      this.staffNewPassword = '';
      this.staffConfirmNewPassword = '';
      void this.router.navigateByUrl('/admin/pos');
    }
  }

  signOutStaff(): void {
    this.attendanceStore.signOutStaffSession();
    this.staffPassword = '';
    this.staffNewPassword = '';
    this.staffConfirmNewPassword = '';
    this.setFeedback('info', 'staff workspace signed out.');
    void this.router.navigateByUrl('/admin/access');
  }

  async resetLocalData(): Promise<void> {
    await this.attendanceStore.resetLocalAppData();
    this.setFeedback('success', 'PostgreSQL app data cleared.');
    globalThis.location.assign('/admin/access');
  }

  restoreBootstrapAdmin(): void {
    this.attendanceStore.resetMasterAdminAccess();
    this.username = this.attendanceStore.getMasterAdminUsername();
    this.password = '';
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.setFeedback('success', 'master admin restored to bootstrap credentials. use the temporary password shown above.');
  }

  useBootstrapCredentials(): void {
    if (!this.bootstrapCredentials) {
      return;
    }

    this.username = this.bootstrapCredentials.username;
    this.password = this.bootstrapCredentials.password;
  }

  private setFeedback(tone: 'success' | 'error' | 'info', message: string): void {
    this.feedbackTone = tone;
    this.feedback = message;
  }
}
