import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceStore, StaffAppFeature } from '../shared/attendance/attendance.store';
import { AppClockStore } from '../shared/testing/app-clock.store';

interface AdminNavItem {
  label: string;
  path: string;
  feature?: StaffAppFeature;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  isSidebarOpen = false;
  testClockInput = '';
  testClockFeedback = '';

  readonly navItems: AdminNavItem[] = [
    { label: '🗓 Schedule Center', path: '/admin/schedule-center', feature: 'schedule-center' },
    { label: '🛒 POS', path: '/admin/pos', feature: 'pos' },
    { label: '🔔 Queue Board', path: '/admin/queue-board', feature: 'queue-board' },
    { label: '⏰ Clock In/Out', path: '/admin/clock-in-out' },
    { label: '👥 HR', path: '/admin/hr', feature: 'hr' },
    { label: '📋 Menu', path: '/admin/menu', feature: 'menu' },
    { label: '🔨 Menu Builder', path: '/admin/menu-builder', feature: 'menu-builder' },
    { label: '📦 Master Inventory', path: '/admin/master-inventory', feature: 'master-inventory' },
    { label: '💰 Finance', path: '/admin/finance', feature: 'finance' },
    { label: '📊 Reports', path: '/admin/reports', feature: 'reports' },
    { label: '🏪 Store Inventory', path: '/admin/store-inventory', feature: 'store-inventory' },
    { label: '🎪 Pop-up Inventory', path: '/admin/popup-inventory', feature: 'popup-inventory' },
    { label: '🎉 Event Inventory', path: '/admin/event-inventory', feature: 'event-inventory' },
    { label: '🎊 Event Operations', path: '/admin/event-operations', feature: 'event-operations' }
  ];

  constructor(
    private readonly attendanceStore: AttendanceStore,
    private readonly appClock: AppClockStore
  ) {
    this.testClockInput = this.appClock.getInputValue();
  }

  get testClockLabel(): string {
    return this.appClock.isOverrideActive
      ? `Testing date: ${this.appClock.now().toLocaleString()}`
      : 'Using real device time';
  }

  get adminSession() {
    return this.attendanceStore.getAdminSession();
  }

  get appSession() {
    return this.attendanceStore.getAppSession();
  }

  get hasSignedInSession(): boolean {
    return this.attendanceStore.hasSignedInStaffSession();
  }

  get hasInternalAccess(): boolean {
    return this.hasSignedInSession || this.attendanceStore.canAccessAdminRoute();
  }

  get hasUnlockedAdmin(): boolean {
    return this.attendanceStore.hasUnlockedAdminSession();
  }

  get visibleNavItems(): AdminNavItem[] {
    if (!this.hasInternalAccess) {
      return [];
    }

    if (this.attendanceStore.canAccessAdminRoute()) {
      return this.navItems;
    }

    return this.navItems.filter(item => !item.feature || this.attendanceStore.canAccessFeature(item.feature));
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  applyTestClock(): void {
    const wasApplied = this.appClock.setOverride(this.testClockInput);
    this.testClockFeedback = wasApplied
      ? 'testing clock updated.'
      : 'enter a valid testing date and time.';
    this.testClockInput = this.appClock.getInputValue();
  }

  resetTestClock(): void {
    this.appClock.clearOverride();
    this.testClockInput = '';
    this.testClockFeedback = 'testing clock reset to real time.';
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  signOutSession(): void {
    if (this.hasSignedInSession) {
      this.attendanceStore.signOutStaffSession();
    }

    if (this.attendanceStore.canAccessAdminRoute()) {
      this.attendanceStore.clearAdminSession();
    }
  }
}
