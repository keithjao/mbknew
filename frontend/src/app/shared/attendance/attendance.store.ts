import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ActionLogStatus, ActionLogStore } from '../logging/action-log.store';
import { AppClockStore } from '../testing/app-clock.store';
import { RemoteStateService } from '../state/remote-state.service';

export type AttendanceRole = 'admin' | 'staff';

export type StaffDepartment = 'operations' | 'kitchen' | 'finance' | 'management' | 'support';
export type EmploymentType = 'full-time' | 'part-time' | 'contractual';
export type ShiftLocation = 'main' | 'north' | 'east' | 'floating';
export type ShiftStatus = 'scheduled' | 'completed' | 'missed' | 'cancelled';
export type AttendanceState = 'open' | 'completed' | 'late' | 'overtime' | 'incomplete';
export type LeaveType = 'vacation' | 'sick' | 'emergency' | 'personal' | 'day-off';
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';
export type HrPermission = 'manageStaff' | 'managePayroll' | 'archiveStaff' | 'manageLeave' | 'manageScheduling' | 'exportPayroll';
export type StaffAppFeature =
  | 'schedule-center'
  | 'clock-in-out'
  | 'pos'
  | 'queue-board'
  | 'store-inventory'
  | 'popup-inventory'
  | 'event-inventory'
  | 'hr'
  | 'menu'
  | 'menu-builder'
  | 'master-inventory'
  | 'finance'
  | 'reports'
  | 'event-operations';

export interface StaffAccount {
  id: string;
  staffCode: string;
  fullName: string;
  workspaceUsername: string;
  passwordHash: string;
  requiresPasswordChange: boolean;
  credentialUpdatedAt: string;
  email: string;
  phone: string;
  role: AttendanceRole;
  department: StaffDepartment;
  employmentType: EmploymentType;
  assignedLocation: ShiftLocation;
  hourlyRate: number;
  monthlyDrinkBudget: number;
  pin: string;
  hireDate: string;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAccountDraft {
  fullName: string;
  workspaceUsername?: string;
  workspacePassword?: string;
  email?: string;
  phone?: string;
  role: AttendanceRole;
  department?: StaffDepartment;
  employmentType: EmploymentType;
  assignedLocation?: ShiftLocation;
  hourlyRate: number;
  monthlyDrinkBudget?: number;
  pin?: string;
  hireDate?: string;
  active?: boolean;
  notes?: string;
}

export interface WorkSchedule {
  id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  unpaidBreakMinutes: number;
  location: ShiftLocation;
  status: ShiftStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkScheduleDraft {
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  unpaidBreakMinutes?: number;
  location: ShiftLocation;
  notes?: string;
}

export interface StaffAvailability {
  id: string;
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  source: 'admin' | 'staff';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAvailabilityDraft {
  staffId: string;
  date: string;
  startTime: string;
  endTime: string;
  source?: 'admin' | 'staff';
  notes?: string;
}

export interface AttendanceLog {
  id: string;
  staffId: string;
  staffCode: string;
  employeeName: string;
  role: AttendanceRole;
  department: StaffDepartment;
  location: ShiftLocation;
  clockInAt: string;
  clockOutAt?: string;
  clockInSelfie: string;
  clockOutSelfie?: string;
  scheduledShiftId?: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  unpaidBreakMinutes: number;
  workedMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  status: AttendanceState;
}

export interface PayrollPolicy {
  overtimeMultiplier: number;
  standardShiftHours: number;
  paymentDays: {
    firstPayoutDay: number;
    secondPayoutDay: number;
    februaryPayoutDay: number;
    leapFebruaryPayoutDay: number;
  };
}

export interface PayrollPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  payoutDate: string;
}

export interface StaffPayrollSummary {
  staffId: string;
  staffCode: string;
  fullName: string;
  role: AttendanceRole;
  department: StaffDepartment;
  hourlyRate: number;
  regularHours: number;
  overtimeHours: number;
  renderedHours: number;
  scheduledHours: number;
  lateMinutes: number;
  shiftsCompleted: number;
  grossPay: number;
}

export interface AttendanceDashboardSummary {
  totalStaff: number;
  activeStaff: number;
  openShifts: number;
  scheduledToday: number;
  completedToday: number;
  lateToday: number;
  missingClockOut: number;
}

export interface AttendanceActionResult {
  ok: boolean;
  message: string;
  log?: AttendanceLog;
}

export interface GeneratedDocument {
  fileName: string;
  mimeType: string;
  content: string;
}

export interface PayslipAttendanceSession {
  date: string;
  clockInTime: string;
  clockOutTime: string;
  renderedHours: number;
  regularHours: number;
  overtimeHours: number;
  lateMinutes: number;
  status: AttendanceState;
}

export interface PayslipData {
  fileName: string;
  period: PayrollPeriod;
  staff: StaffAccount;
  summary: StaffPayrollSummary;
  attendanceSessions: PayslipAttendanceSession[];
}

export interface HrAdminSession {
  actingStaffId: string | null;
  actingStaffName: string;
  actingRole: AttendanceRole | 'guest' | 'bootstrap';
  authenticatedAt?: string;
  permissions: Record<HrPermission, boolean>;
}

export interface StaffAppSession {
  actingStaffId: string | null;
  actingStaffName: string;
  actingRole: AttendanceRole | 'guest';
  signedInAt?: string;
  allowedFeatures: StaffAppFeature[];
}

export interface StaffWorkspaceBootstrapCredentials {
  workspaceUsername: string;
  staffPin: string;
  temporaryPassword: string;
  requiresPasswordChange: boolean;
}

export interface MasterAdminCredentials {
  username: string;
  passwordHash: string;
  requiresPasswordChange: boolean;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  notes?: string;
  status: LeaveRequestStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewedByStaffId?: string;
}

export interface LeaveRequestDraft {
  staffId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  notes?: string;
}

export interface DayOffBlock {
  id: string;
  scope: 'all' | 'staff';
  staffId?: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
  createdByStaffId?: string;
}

export interface DayOffBlockDraft {
  scope: 'all' | 'staff';
  staffId?: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface SchedulingPolicy {
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  fullDayMinutes: number;
  halfDayMinutes: number;
  weekdayMinimumCoverage: number;
  weekendMinimumCoverage: number;
}

export interface CoverageSlotSummary {
  startTime: string;
  endTime: string;
  requiredStaff: number;
  scheduledStaffIds: string[];
  missingStaff: number;
}

export interface DailyCoverageSummary {
  date: string;
  requiredStaff: number;
  totalScheduledShifts: number;
  scheduledStaffCount: number;
  fullyCovered: boolean;
  slots: CoverageSlotSummary[];
  missingSlots: CoverageSlotSummary[];
}

export interface ScheduleConflict {
  type: 'overlap' | 'leave' | 'block' | 'inactive' | 'availability' | 'store-hours' | 'shift-length' | 'coverage';
  severity: 'error' | 'warning';
  message: string;
  relatedId?: string;
}

export const STAFF_ROLES: AttendanceRole[] = ['admin', 'staff'];

export const STAFF_DEPARTMENTS: StaffDepartment[] = [
  'operations',
  'kitchen',
  'finance',
  'management',
  'support'
];

export const EMPLOYMENT_TYPES: EmploymentType[] = ['full-time', 'part-time', 'contractual'];
export const SHIFT_LOCATIONS: ShiftLocation[] = ['main', 'north', 'east', 'floating'];
export const LEAVE_TYPES: LeaveType[] = ['vacation', 'sick', 'emergency', 'personal', 'day-off'];

const STORAGE_KEYS = {
  logs: 'mbk.attendance.logs',
  staff: 'mbk.hr.staff',
  schedules: 'mbk.hr.schedules',
  availability: 'mbk.hr.staff-availability',
  policy: 'mbk.hr.payroll-policy',
  leaveRequests: 'mbk.hr.leave-requests',
  dayOffBlocks: 'mbk.hr.day-off-blocks',
  adminSession: 'mbk.hr.admin-session',
  appSession: 'mbk.staff.app-session',
  masterAdmin: 'mbk.hr.master-admin'
};

const MASTER_ADMIN_SESSION_ID = 'master-admin';
const DEFAULT_MASTER_ADMIN_USERNAME = 'admin';
const DEFAULT_MASTER_ADMIN_PASSWORD = 'MbkMaster@123';
const DEFAULT_MASTER_ADMIN_PASSWORD_HASH = 'bfb110dc032f6a1424bced4d73cd367f433335b98b7e1d873fbfa4ddbeb1eb32';
const LEGACY_MASTER_ADMIN_PASSWORD_HASH = 'bc78e58d55cde1346e68f8e5fe588dedf62fa457aa646a500a53347faff6ee24';
const DEFAULT_STAFF_WORKSPACE_PASSWORD_HASH = '95bfa2fa87872a6b51a2037a8b8f2f62f8c2f6c3354d6ecb40e0ed80d407b449';

const DEFAULT_PAYROLL_POLICY: PayrollPolicy = {
  overtimeMultiplier: 1.25,
  standardShiftHours: 8,
  paymentDays: {
    firstPayoutDay: 15,
    secondPayoutDay: 30,
    februaryPayoutDay: 28,
    leapFebruaryPayoutDay: 29
  }
};

const DEFAULT_SCHEDULING_POLICY: SchedulingPolicy = {
  openTime: '11:00',
  closeTime: '21:00',
  slotMinutes: 30,
  fullDayMinutes: 9 * 60,
  halfDayMinutes: 4 * 60 + 30,
  weekdayMinimumCoverage: 2,
  weekendMinimumCoverage: 3
};

@Injectable({ providedIn: 'root' })
export class AttendanceStore {
  private readonly remoteState = inject(RemoteStateService);
  private readonly appClock = inject(AppClockStore);
  private masterAdminCredentials = this.getStoredMasterAdminCredentials();
  private readonly initialLogs = this.getStoredLogs();
  private readonly initialStaff = this.getStoredStaffAccounts(this.initialLogs);
  private readonly initialSchedules = this.getStoredSchedules();
  private readonly initialAvailability = this.getStoredAvailability();
  private readonly initialLeaveRequests = this.getStoredLeaveRequests();
  private readonly initialDayOffBlocks = this.getStoredDayOffBlocks();

  private readonly logsSubject = new BehaviorSubject<AttendanceLog[]>(this.initialLogs);
  private readonly staffSubject = new BehaviorSubject<StaffAccount[]>(this.initialStaff);
  private readonly schedulesSubject = new BehaviorSubject<WorkSchedule[]>(this.initialSchedules);
  private readonly availabilitySubject = new BehaviorSubject<StaffAvailability[]>(this.initialAvailability);
  private readonly payrollPolicySubject = new BehaviorSubject<PayrollPolicy>(this.getStoredPayrollPolicy());
  private readonly leaveRequestsSubject = new BehaviorSubject<LeaveRequest[]>(this.initialLeaveRequests);
  private readonly dayOffBlocksSubject = new BehaviorSubject<DayOffBlock[]>(this.initialDayOffBlocks);
  private readonly appSessionSubject = new BehaviorSubject<StaffAppSession>(this.getStoredAppSession(this.initialStaff));
  private readonly adminSessionSubject = new BehaviorSubject<HrAdminSession>(this.getStoredAdminSession(this.initialStaff));

  readonly logs$ = this.logsSubject.asObservable();
  readonly staff$ = this.staffSubject.asObservable();
  readonly schedules$ = this.schedulesSubject.asObservable();
  readonly availability$ = this.availabilitySubject.asObservable();
  readonly payrollPolicy$ = this.payrollPolicySubject.asObservable();
  readonly leaveRequests$ = this.leaveRequestsSubject.asObservable();
  readonly dayOffBlocks$ = this.dayOffBlocksSubject.asObservable();
  readonly appSession$ = this.appSessionSubject.asObservable();
  readonly adminSession$ = this.adminSessionSubject.asObservable();

  constructor(
    private readonly actionLogStore: ActionLogStore
  ) {}

  authenticateAdminSession(staffId: string, pin: string): AttendanceActionResult & { session?: HrAdminSession } {
    void staffId;
    void pin;
    return { ok: false, message: 'admin access now uses the master admin login.' };
  }

  async authenticateMasterAdmin(
    username: string,
    password: string
  ): Promise<AttendanceActionResult & { session?: HrAdminSession; requiresPasswordChange?: boolean }> {
    if (this.normalizeText(username) !== this.normalizeText(this.masterAdminCredentials.username)) {
      return { ok: false, message: 'admin username is incorrect.' };
    }

    const passwordHash = await this.hashSecret(password);
    if (passwordHash !== this.masterAdminCredentials.passwordHash) {
      return { ok: false, message: 'admin password is incorrect.' };
    }

    const session = this.buildMasterAdminSession();
    this.adminSessionSubject.next(session);
    this.persistAdminSession(session);

    return {
      ok: true,
      message: this.masterAdminCredentials.requiresPasswordChange
        ? 'master admin signed in. change the password to unlock admin tools.'
        : 'master admin signed in.',
      session,
      requiresPasswordChange: this.masterAdminCredentials.requiresPasswordChange
    };
  }

  async changeMasterAdminPassword(newPassword: string, confirmPassword: string): Promise<AttendanceActionResult> {
    if (!this.isMasterAdminSession()) {
      return { ok: false, message: 'sign in as master admin first.' };
    }

    if (newPassword !== confirmPassword) {
      return { ok: false, message: 'the new password confirmation does not match.' };
    }

    const validationError = this.validateMasterAdminPassword(newPassword);
    if (validationError) {
      return { ok: false, message: validationError };
    }

    const passwordHash = await this.hashSecret(newPassword);
    if (passwordHash === this.masterAdminCredentials.passwordHash) {
      return { ok: false, message: 'choose a different password from the current one.' };
    }

    this.masterAdminCredentials = {
      ...this.masterAdminCredentials,
      passwordHash,
      requiresPasswordChange: false,
      updatedAt: this.appClock.isoNow()
    };
    this.persistMasterAdminCredentials(this.masterAdminCredentials);

    const session = this.buildMasterAdminSession(this.adminSessionSubject.value.authenticatedAt);
    this.adminSessionSubject.next(session);
    this.persistAdminSession(session);

    return { ok: true, message: 'master admin password updated.' };
  }

  getMasterAdminUsername(): string {
    return this.masterAdminCredentials.username;
  }

  getMasterAdminBootstrapCredentials(): { username: string; password: string } | null {
    if (!this.masterAdminCredentials.requiresPasswordChange) {
      return null;
    }

    return {
      username: this.masterAdminCredentials.username,
      password: DEFAULT_MASTER_ADMIN_PASSWORD
    };
  }

  isMasterAdminPasswordChangeRequired(): boolean {
    return this.masterAdminCredentials.requiresPasswordChange;
  }

  isMasterAdminActive(): boolean {
    return this.isMasterAdminSession();
  }

  isSignedInStaffPasswordChangeRequired(): boolean {
    return !!this.getSignedInStaff()?.requiresPasswordChange;
  }

  clearAdminSession(): void {
    const nextSession = this.createGuestSession();
    this.adminSessionSubject.next(nextSession);
    this.persistAdminSession(nextSession);
  }

  signInStaffSession(staffId: string, pin: string): AttendanceActionResult & { session?: StaffAppSession } {
    const staff = this.getStaffById(staffId);
    if (!staff || !staff.active) {
      return { ok: false, message: 'select an active staff account.' };
    }

    if (staff.pin !== pin.trim()) {
      return { ok: false, message: 'staff pin is incorrect.' };
    }

    const session = this.buildAppSession(staff);
    this.appSessionSubject.next(session);
    this.persistAppSession(session);

    const adminSession = this.isAdminRole(staff.role)
      ? this.buildAdminSession(staff)
      : this.createGuestSession();
    this.adminSessionSubject.next(adminSession);
    this.persistAdminSession(adminSession);

    this.actionLogStore.addLog({
      module: 'attendance',
      action: 'staff-sign-in',
      summary: `${staff.fullName} signed in to the shared staff session.`,
      status: 'success',
      performedByStaffId: staff.id,
      performedByName: staff.fullName,
      metadata: {
        role: staff.role
      }
    });

    return { ok: true, message: `${staff.fullName} is now signed in.`, session };
  }

  signInPosSession(staffId: string, dailyPosPin: string): AttendanceActionResult & { session?: StaffAppSession } {
    const staff = this.getStaffById(staffId);
    if (!staff || !staff.active) {
      return { ok: false, message: 'select an active staff account.' };
    }

    if (!this.isValidPosDailyPin(staff, dailyPosPin.trim())) {
      return { ok: false, message: 'daily pos pin is incorrect.' };
    }

    const session = this.buildAppSession(staff);
    this.appSessionSubject.next(session);
    this.persistAppSession(session);

    const adminSession = this.isAdminRole(staff.role)
      ? this.buildAdminSession(staff)
      : this.createGuestSession();
    this.adminSessionSubject.next(adminSession);
    this.persistAdminSession(adminSession);

    this.actionLogStore.addLog({
      module: 'pos',
      action: 'operator-sign-in',
      summary: `${staff.fullName} signed in to POS operator session.`,
      status: 'success',
      performedByStaffId: staff.id,
      performedByName: staff.fullName,
      metadata: {
        role: staff.role,
        authMode: 'daily-pos-pin'
      }
    });

    return { ok: true, message: `${staff.fullName} is now signed in for POS.`, session };
  }

  async authenticateStaffWorkspace(
    workspaceUsername: string,
    password: string
  ): Promise<AttendanceActionResult & { session?: StaffAppSession; requiresPasswordChange?: boolean }> {
    const normalizedUsername = this.normalizeWorkspaceUsername(workspaceUsername);
    const staff = this.staffSubject.value.find(entry => entry.workspaceUsername === normalizedUsername && entry.active);

    if (!staff) {
      return { ok: false, message: 'staff username or password is incorrect.' };
    }

    const passwordHash = await this.hashSecret(password);
    if (passwordHash !== staff.passwordHash) {
      return { ok: false, message: 'staff username or password is incorrect.' };
    }

    const session = this.buildAppSession(staff);
    this.appSessionSubject.next(session);
    this.persistAppSession(session);

    const adminSession = this.isAdminRole(staff.role)
      ? this.buildAdminSession(staff)
      : this.createGuestSession();
    this.adminSessionSubject.next(adminSession);
    this.persistAdminSession(adminSession);

    this.actionLogStore.addLog({
      module: 'attendance',
      action: 'staff-workspace-sign-in',
      summary: `${staff.fullName} signed in to the staff workspace.`,
      status: 'success',
      performedByStaffId: staff.id,
      performedByName: staff.fullName,
      metadata: {
        role: staff.role,
        workspaceUsername: staff.workspaceUsername
      }
    });

    return {
      ok: true,
      message: staff.requiresPasswordChange
        ? 'staff workspace signed in. change the temporary password to continue.'
        : `${staff.fullName} is now signed in.`,
      session,
      requiresPasswordChange: staff.requiresPasswordChange
    };
  }

  async changeSignedInStaffWorkspacePassword(newPassword: string, confirmPassword: string): Promise<AttendanceActionResult> {
    const signedInStaff = this.getSignedInStaff();
    if (!signedInStaff) {
      return { ok: false, message: 'sign in to the staff workspace first.' };
    }

    if (newPassword !== confirmPassword) {
      return { ok: false, message: 'the new password confirmation does not match.' };
    }

    const validationError = this.validateStaffWorkspacePassword(newPassword);
    if (validationError) {
      return { ok: false, message: validationError };
    }

    const passwordHash = await this.hashSecret(newPassword);
    if (passwordHash === signedInStaff.passwordHash) {
      return { ok: false, message: 'choose a different password from the current one.' };
    }

    const now = this.appClock.isoNow();
    const nextStaffList = this.staffSubject.value.map(staff =>
      staff.id === signedInStaff.id
        ? {
            ...staff,
            passwordHash,
            requiresPasswordChange: false,
            credentialUpdatedAt: now,
            updatedAt: now
          }
        : staff
    );

    this.staffSubject.next(nextStaffList);
    this.persistStaff(nextStaffList);
    this.syncAppSession(nextStaffList);
    this.syncAdminSession(nextStaffList);

    this.logAction('attendance', 'staff-workspace-password-updated', `${signedInStaff.fullName} updated the staff workspace password.`, 'success', {
      targetStaffId: signedInStaff.id,
      workspaceUsername: signedInStaff.workspaceUsername
    });

    return { ok: true, message: 'staff workspace password updated.' };
  }

  signOutStaffSession(): void {
    const currentSession = this.appSessionSubject.value;
    if (currentSession.actingStaffId) {
      this.actionLogStore.addLog({
        module: 'attendance',
        action: 'staff-sign-out',
        summary: `${currentSession.actingStaffName} signed out of the shared staff session.`,
        status: 'info',
        performedByStaffId: currentSession.actingStaffId || undefined,
        performedByName: currentSession.actingStaffName,
        metadata: {
          role: currentSession.actingRole
        }
      });
    }

    const nextSession = this.createGuestAppSession();
    this.appSessionSubject.next(nextSession);
    this.persistAppSession(nextSession);

    if (this.adminSessionSubject.value.actingStaffId === currentSession.actingStaffId) {
      this.clearAdminSession();
    }
  }

  hasSignedInStaffSession(): boolean {
    return !!this.appSessionSubject.value.actingStaffId && this.appSessionSubject.value.actingRole !== 'guest';
  }

  getAppSession(): StaffAppSession {
    return this.appSessionSubject.value;
  }

  canAccessFeature(feature: StaffAppFeature): boolean {
    return this.appSessionSubject.value.allowedFeatures.includes(feature);
  }

  hasPermission(permission: HrPermission): boolean {
    return !!this.adminSessionSubject.value.permissions[permission];
  }

  hasAdminAccountsCreated(): boolean {
    return this.hasAdminAccounts(this.staffSubject.value);
  }

  hasUnlockedAdminSession(): boolean {
    const session = this.adminSessionSubject.value;
    return !!session.actingStaffId && session.actingRole === 'admin';
  }

  isBootstrapMode(): boolean {
    return false;
  }

  canAccessAdminRoute(allowBootstrap = false): boolean {
    void allowBootstrap;
    const session = this.adminSessionSubject.value;
    if (this.isMasterAdminSession(session)) {
      return !this.isMasterAdminPasswordChangeRequired();
    }

    if (this.isSignedInStaffPasswordChangeRequired()) {
      return false;
    }

    return session.actingRole === 'admin' && !!session.actingStaffId;
  }

  canAccessProtectedRoute(allowBootstrap = false): boolean {
    return this.canAccessAdminRoute(allowBootstrap);
  }

  getSchedulingPolicy(): SchedulingPolicy {
    return { ...DEFAULT_SCHEDULING_POLICY };
  }

  async resetLocalAppData(): Promise<void> {
    await this.remoteState.resetState(['events', 'checklist_templates'], ['mbk.']);
  }

  resetMasterAdminAccess(): void {
    const fallback: MasterAdminCredentials = {
      username: DEFAULT_MASTER_ADMIN_USERNAME,
      passwordHash: DEFAULT_MASTER_ADMIN_PASSWORD_HASH,
      requiresPasswordChange: true,
      updatedAt: this.appClock.isoNow()
    };

    this.masterAdminCredentials = fallback;
    this.persistMasterAdminCredentials(fallback);

    const guestSession = this.createGuestSession();
    this.adminSessionSubject.next(guestSession);
    this.persistAdminSession(guestSession);
  }

  getRequiredCoverageForDate(date: string): number {
    const weekday = new Date(`${date}T00:00:00`).getDay();
    return weekday === 0 || weekday === 6
      ? DEFAULT_SCHEDULING_POLICY.weekendMinimumCoverage
      : DEFAULT_SCHEDULING_POLICY.weekdayMinimumCoverage;
  }

  isAdminRole(role: AttendanceRole): boolean {
    return role === 'admin';
  }

  async createStaffAccount(
    payload: StaffAccountDraft
  ): Promise<AttendanceActionResult & { staff?: StaffAccount; workspaceCredentials?: StaffWorkspaceBootstrapCredentials }> {
    const permissionError = this.requirePermission('manageStaff', 'only admins can create staff accounts.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    const fullName = payload.fullName.trim();
    const pin = payload.pin?.trim() || this.generateStaffPin();

    if (!fullName || !Number.isFinite(payload.hourlyRate) || payload.hourlyRate <= 0) {
      return { ok: false, message: 'valid name and hourly rate are required.' };
    }

    if (!/^\d{4,8}$/.test(pin)) {
      return { ok: false, message: 'staff pin must be 4 to 8 digits.' };
    }

    const monthlyDrinkBudget = this.normalizeMonthlyDrinkBudget(payload.monthlyDrinkBudget);

    const duplicate = this.staffSubject.value.find(staff => this.normalizeText(staff.fullName) === this.normalizeText(fullName));
    if (duplicate) {
      return { ok: false, message: 'a staff account with that name already exists.' };
    }

    const staffCode = this.createStaffCode();
    const workspaceUsername = this.resolveWorkspaceUsername(payload.workspaceUsername, fullName, staffCode);
    if (!workspaceUsername) {
      return { ok: false, message: 'enter a valid staff workspace username.' };
    }

    const temporaryPassword = payload.workspacePassword?.trim() || this.generateTemporaryWorkspacePassword();
    const workspacePasswordError = this.validateStaffWorkspacePassword(temporaryPassword);
    if (workspacePasswordError) {
      return { ok: false, message: workspacePasswordError };
    }

    const now = this.appClock.isoNow();
    const passwordHash = await this.hashSecret(temporaryPassword);

    const nextStaff: StaffAccount = {
      id: this.createId('staff'),
      staffCode,
      fullName,
      workspaceUsername,
      passwordHash,
      requiresPasswordChange: true,
      credentialUpdatedAt: now,
      email: payload.email?.trim().toLowerCase() || '',
      phone: payload.phone?.trim() || '',
      role: payload.role,
      department: payload.department || 'operations',
      employmentType: payload.employmentType,
      assignedLocation: payload.assignedLocation || 'main',
      hourlyRate: payload.hourlyRate,
      monthlyDrinkBudget,
      pin,
      hireDate: payload.hireDate || this.todayKey(),
      active: payload.active ?? true,
      notes: payload.notes?.trim() || '',
      createdAt: now,
      updatedAt: now
    };

    const nextStaffList = [nextStaff, ...this.staffSubject.value];
    this.staffSubject.next(nextStaffList);
    this.persistStaff(nextStaffList);
    this.syncAdminSession(nextStaffList);

    this.logAction('hr', 'staff-account-created', `Created staff account for ${nextStaff.fullName}.`, 'success', {
      targetStaffId: nextStaff.id,
      role: nextStaff.role,
      monthlyDrinkBudget: nextStaff.monthlyDrinkBudget,
      workspaceUsername: nextStaff.workspaceUsername
    });

    return {
      ok: true,
      message: 'staff account created.',
      staff: nextStaff,
      workspaceCredentials: {
        workspaceUsername,
        staffPin: pin,
        temporaryPassword,
        requiresPasswordChange: true
      }
    };
  }

  async updateStaffAccount(
    staffId: string,
    payload: StaffAccountDraft
  ): Promise<AttendanceActionResult & { staff?: StaffAccount; workspaceCredentials?: StaffWorkspaceBootstrapCredentials }> {
    const permissionError = this.requirePermission('manageStaff', 'only admins can edit staff accounts.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    const fullName = payload.fullName.trim();

    if (!fullName || !Number.isFinite(payload.hourlyRate) || payload.hourlyRate <= 0) {
      return { ok: false, message: 'valid name and hourly rate are required.' };
    }

    const monthlyDrinkBudget = this.normalizeMonthlyDrinkBudget(payload.monthlyDrinkBudget);

    const duplicate = this.staffSubject.value.find(staff =>
      staff.id !== staffId && this.normalizeText(staff.fullName) === this.normalizeText(fullName)
    );
    if (duplicate) {
      return { ok: false, message: 'another staff account already uses that name.' };
    }

    const existingStaff = this.getStaffById(staffId);
    if (!existingStaff) {
      return { ok: false, message: 'staff account not found.' };
    }

    const pin = payload.pin?.trim() || existingStaff.pin;
    if (!/^\d{4,8}$/.test(pin)) {
      return { ok: false, message: 'staff pin must be 4 to 8 digits.' };
    }

    const workspaceUsername = this.resolveWorkspaceUsername(
      payload.workspaceUsername,
      fullName,
      existingStaff.staffCode,
      existingStaff.workspaceUsername,
      staffId
    );
    if (!workspaceUsername) {
      return { ok: false, message: 'enter a valid staff workspace username.' };
    }

    const nextWorkspacePassword = payload.workspacePassword?.trim() || '';
    if (nextWorkspacePassword) {
      const workspacePasswordError = this.validateStaffWorkspacePassword(nextWorkspacePassword);
      if (workspacePasswordError) {
        return { ok: false, message: workspacePasswordError };
      }
    }

    const now = this.appClock.isoNow();
    const nextPasswordHash = nextWorkspacePassword ? await this.hashSecret(nextWorkspacePassword) : existingStaff.passwordHash;
    const nextRequiresPasswordChange = nextWorkspacePassword ? true : existingStaff.requiresPasswordChange;
    const nextCredentialUpdatedAt = nextWorkspacePassword ? now : existingStaff.credentialUpdatedAt;

    let updatedStaff: StaffAccount | undefined;
    const nextStaffList = this.staffSubject.value.map(staff => {
      if (staff.id !== staffId) {
        return staff;
      }

      updatedStaff = {
        ...staff,
        fullName,
        workspaceUsername,
        passwordHash: nextPasswordHash,
        requiresPasswordChange: nextRequiresPasswordChange,
        credentialUpdatedAt: nextCredentialUpdatedAt,
        email: payload.email?.trim().toLowerCase() || '',
        phone: payload.phone?.trim() || '',
        role: payload.role,
        department: payload.department || staff.department,
        employmentType: payload.employmentType,
        assignedLocation: payload.assignedLocation || staff.assignedLocation,
        hourlyRate: payload.hourlyRate,
        monthlyDrinkBudget,
        pin,
        hireDate: payload.hireDate || staff.hireDate,
        active: payload.active ?? staff.active,
        notes: payload.notes?.trim() || '',
        updatedAt: now
      };

      return updatedStaff;
    });

    if (!updatedStaff) {
      return { ok: false, message: 'staff account not found.' };
    }

    this.staffSubject.next(nextStaffList);
    this.persistStaff(nextStaffList);
    this.syncAdminSession(nextStaffList);

    const nextLogs = this.logsSubject.value.map(log => {
      if (log.staffId !== staffId) {
        return log;
      }

      return {
        ...log,
        employeeName: updatedStaff?.fullName || log.employeeName,
        role: updatedStaff?.role || log.role,
        department: updatedStaff?.department || log.department,
        location: updatedStaff?.assignedLocation || log.location,
        staffCode: updatedStaff?.staffCode || log.staffCode
      };
    });

    this.logsSubject.next(nextLogs);
    this.persistLogs(nextLogs);

    this.logAction('hr', 'staff-account-updated', `Updated staff account for ${updatedStaff.fullName}.`, 'success', {
      targetStaffId: updatedStaff.id,
      role: updatedStaff.role,
      active: updatedStaff.active,
      monthlyDrinkBudget: updatedStaff.monthlyDrinkBudget,
      workspaceUsername: updatedStaff.workspaceUsername,
      resetWorkspacePassword: !!nextWorkspacePassword
    });

    return {
      ok: true,
      message: 'staff account updated.',
      staff: updatedStaff,
      workspaceCredentials: nextWorkspacePassword
        ? {
            workspaceUsername,
            staffPin: updatedStaff.pin,
            temporaryPassword: nextWorkspacePassword,
            requiresPasswordChange: true
          }
        : undefined
    };
  }

  setStaffActive(staffId: string, active: boolean): AttendanceActionResult {
    const permissionError = this.requirePermission('archiveStaff', 'only admins can archive or reactivate staff accounts.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    let didUpdate = false;
    const nextStaffList = this.staffSubject.value.map(staff => {
      if (staff.id !== staffId) {
        return staff;
      }

      didUpdate = true;
      return { ...staff, active, updatedAt: this.appClock.isoNow() };
    });

    if (!didUpdate) {
      return { ok: false, message: 'staff account not found.' };
    }

    this.staffSubject.next(nextStaffList);
    this.persistStaff(nextStaffList);
    this.syncAdminSession(nextStaffList);
    const updatedStaff = nextStaffList.find(staff => staff.id === staffId);
    if (updatedStaff) {
      this.logAction('hr', active ? 'staff-account-activated' : 'staff-account-archived', `${updatedStaff.fullName} was ${active ? 'activated' : 'archived'}.`, active ? 'success' : 'warning', {
        targetStaffId: updatedStaff.id,
        active
      });
    }
    return { ok: true, message: active ? 'staff account activated.' : 'staff account archived.' };
  }

  createSchedule(payload: WorkScheduleDraft): AttendanceActionResult & { schedule?: WorkSchedule } {
    const permissionError = this.requirePermission('manageScheduling', 'only admins can create schedules.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    const staff = this.getStaffById(payload.staffId);
    if (!staff) {
      return { ok: false, message: 'select a valid staff account.' };
    }

    if (!payload.date || !payload.startTime || !payload.endTime) {
      return { ok: false, message: 'schedule date, start time, and end time are required.' };
    }

    const conflicts = this.getScheduleConflicts(payload);
    const blockingConflict = conflicts.find(conflict => conflict.severity === 'error');
    if (blockingConflict) {
      return { ok: false, message: blockingConflict.message };
    }

    const duplicate = this.schedulesSubject.value.find(schedule =>
      schedule.staffId === payload.staffId &&
      schedule.date === payload.date &&
      schedule.startTime === payload.startTime &&
      schedule.endTime === payload.endTime &&
      schedule.status !== 'cancelled'
    );

    if (duplicate) {
      return { ok: false, message: 'that schedule already exists for the selected staff member.' };
    }

    const nextSchedule: WorkSchedule = {
      id: this.createId('shift'),
      staffId: payload.staffId,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      unpaidBreakMinutes: Math.max(payload.unpaidBreakMinutes ?? 60, 0),
      location: payload.location,
      status: 'scheduled',
      notes: payload.notes?.trim() || '',
      createdAt: this.appClock.isoNow(),
      updatedAt: this.appClock.isoNow()
    };

    const nextSchedules = [nextSchedule, ...this.schedulesSubject.value].sort((left, right) =>
      `${left.date}${left.startTime}`.localeCompare(`${right.date}${right.startTime}`)
    );
    this.schedulesSubject.next(nextSchedules);
    this.persistSchedules(nextSchedules);
    this.logAction('hr', 'schedule-created', `Created a shift for ${staff.fullName} on ${nextSchedule.date}.`, 'success', {
      targetStaffId: staff.id,
      scheduleId: nextSchedule.id,
      date: nextSchedule.date
    });

    return { ok: true, message: `shift created for ${staff.fullName}.`, schedule: nextSchedule };
  }

  updateSchedule(scheduleId: string, payload: WorkScheduleDraft): AttendanceActionResult & { schedule?: WorkSchedule } {
    const permissionError = this.requirePermission('manageScheduling', 'only admins can edit schedules.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    const staff = this.getStaffById(payload.staffId);
    if (!staff) {
      return { ok: false, message: 'select a valid staff account.' };
    }

    const conflicts = this.getScheduleConflicts(payload, scheduleId);
    const blockingConflict = conflicts.find(conflict => conflict.severity === 'error');
    if (blockingConflict) {
      return { ok: false, message: blockingConflict.message };
    }

    let updatedSchedule: WorkSchedule | undefined;
    const nextSchedules = this.schedulesSubject.value.map(schedule => {
      if (schedule.id !== scheduleId) {
        return schedule;
      }

      updatedSchedule = {
        ...schedule,
        staffId: payload.staffId,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        unpaidBreakMinutes: Math.max(payload.unpaidBreakMinutes ?? schedule.unpaidBreakMinutes, 0),
        location: payload.location,
        notes: payload.notes?.trim() || '',
        updatedAt: this.appClock.isoNow()
      };

      return updatedSchedule;
    });

    if (!updatedSchedule) {
      return { ok: false, message: 'schedule not found.' };
    }

    this.schedulesSubject.next(nextSchedules);
    this.persistSchedules(nextSchedules);
    this.logAction('hr', 'schedule-updated', `Updated a shift for ${staff.fullName} on ${updatedSchedule.date}.`, 'success', {
      targetStaffId: staff.id,
      scheduleId: updatedSchedule.id,
      date: updatedSchedule.date
    });
    return { ok: true, message: 'schedule updated.', schedule: updatedSchedule };
  }

  setScheduleStatus(scheduleId: string, status: ShiftStatus): AttendanceActionResult {
    const permissionError = this.requirePermission('manageScheduling', 'only admins can update schedule statuses.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    let didUpdate = false;
    const nextSchedules = this.schedulesSubject.value.map(schedule => {
      if (schedule.id !== scheduleId) {
        return schedule;
      }

      didUpdate = true;
      return { ...schedule, status, updatedAt: this.appClock.isoNow() };
    });

    if (!didUpdate) {
      return { ok: false, message: 'schedule not found.' };
    }

    this.schedulesSubject.next(nextSchedules);
    this.persistSchedules(nextSchedules);
    this.logAction('hr', 'schedule-status-updated', `Marked schedule as ${status}.`, 'info', {
      scheduleId,
      status
    });
    return { ok: true, message: `schedule marked ${status}.` };
  }

  deleteSchedule(scheduleId: string): AttendanceActionResult {
    const permissionError = this.requirePermission('manageScheduling', 'only admins can delete schedules.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    const nextSchedules = this.schedulesSubject.value.filter(schedule => schedule.id !== scheduleId);
    if (nextSchedules.length === this.schedulesSubject.value.length) {
      return { ok: false, message: 'schedule not found.' };
    }

    this.schedulesSubject.next(nextSchedules);
    this.persistSchedules(nextSchedules);
    this.logAction('hr', 'schedule-deleted', 'Removed a schedule entry.', 'warning', {
      scheduleId
    });
    return { ok: true, message: 'schedule removed.' };
  }

  submitStaffAvailability(payload: StaffAvailabilityDraft): AttendanceActionResult & { availability?: StaffAvailability } {
    const staff = this.getStaffById(payload.staffId);
    if (!staff) {
      return { ok: false, message: 'select a valid staff account for availability.' };
    }

    const validationMessage = this.validateAvailabilityWindow(payload.date, payload.startTime, payload.endTime);
    if (validationMessage) {
      return { ok: false, message: validationMessage };
    }

    const actor = payload.source || 'staff';
    if (actor === 'admin') {
      const permissionError = this.requirePermission('manageScheduling', 'only admins can set availability for staff accounts.');
      if (permissionError) {
        return { ok: false, message: permissionError };
      }
    } else {
      const signedInStaff = this.getSignedInStaff();
      if (!signedInStaff || signedInStaff.id !== payload.staffId) {
        return { ok: false, message: 'staff can only submit availability for their own account.' };
      }

      if (signedInStaff.employmentType !== 'part-time') {
        return { ok: false, message: 'full-time availability is managed by admin. part-time staff can submit their own availability.' };
      }
    }

    const overlappingAvailability = this.availabilitySubject.value.find(entry =>
      entry.staffId === payload.staffId &&
      entry.date === payload.date &&
      this.timesOverlap(payload.date, payload.startTime, payload.endTime, entry.date, entry.startTime, entry.endTime)
    );

    if (overlappingAvailability) {
      return { ok: false, message: 'that availability overlaps another submitted time window.' };
    }

    const now = this.appClock.isoNow();
    const availability: StaffAvailability = {
      id: this.createId('availability'),
      staffId: payload.staffId,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      source: actor,
      notes: payload.notes?.trim() || '',
      createdAt: now,
      updatedAt: now
    };

    const nextAvailability = [availability, ...this.availabilitySubject.value].sort((left, right) =>
      `${left.date}${left.startTime}`.localeCompare(`${right.date}${right.startTime}`)
    );
    this.availabilitySubject.next(nextAvailability);
    this.persistAvailability(nextAvailability);

    this.logAction('hr', 'staff-availability-submitted', `${staff.fullName} availability was submitted for ${payload.date}.`, 'info', {
      targetStaffId: staff.id,
      availabilityId: availability.id,
      date: availability.date,
      source: availability.source
    });

    return { ok: true, message: 'availability submitted.', availability };
  }

  deleteStaffAvailability(availabilityId: string): AttendanceActionResult {
    const availability = this.availabilitySubject.value.find(entry => entry.id === availabilityId);
    if (!availability) {
      return { ok: false, message: 'availability entry not found.' };
    }

    if (this.canAccessAdminRoute()) {
      // Admins can manage availability for any staff account, including their own.
    } else {
      const signedInStaff = this.getSignedInStaff();
      const isSelfService = !!signedInStaff && signedInStaff.id === availability.staffId;
      if (!isSelfService) {
        return { ok: false, message: 'only admins can remove availability for other staff members.' };
      }

      if (signedInStaff?.employmentType !== 'part-time') {
        return { ok: false, message: 'full-time availability is managed by admin.' };
      }
    }

    const nextAvailability = this.availabilitySubject.value.filter(entry => entry.id !== availabilityId);
    this.availabilitySubject.next(nextAvailability);
    this.persistAvailability(nextAvailability);

    this.logAction('hr', 'staff-availability-deleted', 'Removed a staff availability entry.', 'warning', {
      availabilityId,
      targetStaffId: availability.staffId
    });

    return { ok: true, message: 'availability removed.' };
  }

  getAvailabilityForStaff(staffId: string): StaffAvailability[] {
    return this.availabilitySubject.value
      .filter(entry => entry.staffId === staffId)
      .sort((left, right) => `${left.date}${left.startTime}`.localeCompare(`${right.date}${right.startTime}`));
  }

  getAvailabilityForDate(date: string): StaffAvailability[] {
    return this.availabilitySubject.value
      .filter(entry => entry.date === date)
      .sort((left, right) => left.startTime.localeCompare(right.startTime));
  }

  getDailyCoverageSummary(date: string, draft?: WorkScheduleDraft, ignoreScheduleId?: string): DailyCoverageSummary {
    const policy = this.getSchedulingPolicy();
    const relevantSchedules = this.schedulesSubject.value.filter(schedule =>
      schedule.date === date &&
      schedule.status !== 'cancelled' &&
      schedule.id !== ignoreScheduleId
    );

    if (draft && draft.date === date && draft.staffId && draft.startTime && draft.endTime) {
      relevantSchedules.push({
        id: '__draft__',
        staffId: draft.staffId,
        date: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        unpaidBreakMinutes: draft.unpaidBreakMinutes ?? 0,
        location: draft.location,
        status: 'scheduled',
        notes: draft.notes?.trim() || '',
        createdAt: this.appClock.isoNow(),
        updatedAt: this.appClock.isoNow()
      });
    }

    const requiredStaff = this.getRequiredCoverageForDate(date);
    const slotStarts = this.getPolicySlotStarts();
    const slots = slotStarts.map(startTime => {
      const endTime = this.addMinutesToTime(startTime, policy.slotMinutes);
      const scheduledStaffIds = relevantSchedules
        .filter(schedule => this.timesOverlap(date, startTime, endTime, schedule.date, schedule.startTime, schedule.endTime))
        .map(schedule => schedule.staffId)
        .filter((staffId, index, entries) => entries.indexOf(staffId) === index);

      return {
        startTime,
        endTime,
        requiredStaff,
        scheduledStaffIds,
        missingStaff: Math.max(requiredStaff - scheduledStaffIds.length, 0)
      };
    });

    const missingSlots = slots.filter(slot => slot.missingStaff > 0);
    const uniqueStaffIds = relevantSchedules
      .map(schedule => schedule.staffId)
      .filter((staffId, index, entries) => entries.indexOf(staffId) === index);

    return {
      date,
      requiredStaff,
      totalScheduledShifts: relevantSchedules.length,
      scheduledStaffCount: uniqueStaffIds.length,
      fullyCovered: missingSlots.length === 0,
      slots,
      missingSlots
    };
  }

  updatePayrollPolicy(policy: PayrollPolicy): AttendanceActionResult {
    const permissionError = this.requirePermission('managePayroll', 'only admins can edit payroll settings.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    if (!Number.isFinite(policy.overtimeMultiplier) || policy.overtimeMultiplier < 1) {
      return { ok: false, message: 'payroll overtime multiplier must be at least 1.' };
    }

    const normalizedPolicy: PayrollPolicy = {
      ...policy,
      standardShiftHours: Math.max(policy.standardShiftHours, 1)
    };

    this.payrollPolicySubject.next(normalizedPolicy);
    this.persistPayrollPolicy(normalizedPolicy);
    this.logAction('hr', 'payroll-policy-updated', 'Updated payroll policy settings.', 'success', {
      overtimeMultiplier: normalizedPolicy.overtimeMultiplier,
      standardShiftHours: normalizedPolicy.standardShiftHours
    });
    return { ok: true, message: 'payroll policy updated.' };
  }

  submitLeaveRequest(payload: LeaveRequestDraft): AttendanceActionResult & { request?: LeaveRequest } {
    const permissionError = this.requirePermission('manageLeave', 'only admins can submit leave requests from HR.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    return this.createLeaveRequest(payload, 'admin');
  }

  submitSelfLeaveRequest(payload: Omit<LeaveRequestDraft, 'staffId'>): AttendanceActionResult & { request?: LeaveRequest } {
    const signedInStaff = this.getSignedInStaff();
    if (!signedInStaff) {
      return { ok: false, message: 'sign in to submit a leave request.' };
    }

    if (!['vacation', 'sick'].includes(payload.leaveType)) {
      return { ok: false, message: 'staff self-service currently supports vacation and sick leave only.' };
    }

    return this.createLeaveRequest({ ...payload, staffId: signedInStaff.id }, 'staff');
  }

  private createLeaveRequest(payload: LeaveRequestDraft, submittedBy: 'admin' | 'staff'): AttendanceActionResult & { request?: LeaveRequest } {

    const staff = this.getStaffById(payload.staffId);
    if (!staff) {
      return { ok: false, message: 'select a valid staff account for the leave request.' };
    }

    if (!payload.startDate || !payload.endDate || payload.endDate < payload.startDate || !payload.reason.trim()) {
      return { ok: false, message: 'leave requests need a valid date range and reason.' };
    }

    const duplicate = this.leaveRequestsSubject.value.find(request =>
      request.staffId === payload.staffId &&
      request.status !== 'rejected' &&
      this.rangesOverlap(payload.startDate, payload.endDate, request.startDate, request.endDate)
    );

    if (duplicate) {
      return { ok: false, message: 'that leave window already has a pending or approved request.' };
    }

    const request: LeaveRequest = {
      id: this.createId('leave'),
      staffId: payload.staffId,
      leaveType: payload.leaveType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      reason: payload.reason.trim(),
      notes: payload.notes?.trim() || '',
      status: 'pending',
      requestedAt: this.appClock.isoNow()
    };

    const nextRequests = [request, ...this.leaveRequestsSubject.value].sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
    this.leaveRequestsSubject.next(nextRequests);
    this.persistLeaveRequests(nextRequests);
    this.logAction('hr', 'leave-request-submitted', `${staff.fullName} leave request was submitted.`, 'info', {
      requestId: request.id,
      targetStaffId: staff.id,
      submittedBy,
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate
    });
    return { ok: true, message: `${staff.fullName} leave request submitted.`, request };
  }

  reviewLeaveRequest(requestId: string, status: Exclude<LeaveRequestStatus, 'pending'>): AttendanceActionResult {
    const permissionError = this.requirePermission('manageLeave', 'only admins can approve or reject leave requests.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    let didUpdate = false;
    const nextRequests = this.leaveRequestsSubject.value.map(request => {
      if (request.id !== requestId) {
        return request;
      }

      didUpdate = true;
      return {
        ...request,
        status,
        reviewedAt: this.appClock.isoNow(),
        reviewedByStaffId: this.adminSessionSubject.value.actingStaffId || undefined
      };
    });

    if (!didUpdate) {
      return { ok: false, message: 'leave request not found.' };
    }

    this.leaveRequestsSubject.next(nextRequests);
    this.persistLeaveRequests(nextRequests);
    this.logAction('hr', 'leave-request-reviewed', `A leave request was ${status}.`, status === 'approved' ? 'success' : 'warning', {
      requestId,
      status
    });
    return { ok: true, message: `leave request ${status}.` };
  }

  createDayOffBlock(payload: DayOffBlockDraft): AttendanceActionResult & { block?: DayOffBlock } {
    const permissionError = this.requirePermission('manageScheduling', 'only admins can create day-off blocks.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    if (!payload.startDate || !payload.endDate || payload.endDate < payload.startDate || !payload.reason.trim()) {
      return { ok: false, message: 'day-off blocks need a valid date range and reason.' };
    }

    if (payload.scope === 'staff' && !payload.staffId) {
      return { ok: false, message: 'select a staff member for staff-specific blocks.' };
    }

    const block: DayOffBlock = {
      id: this.createId('block'),
      scope: payload.scope,
      staffId: payload.scope === 'staff' ? payload.staffId : undefined,
      startDate: payload.startDate,
      endDate: payload.endDate,
      reason: payload.reason.trim(),
      createdAt: this.appClock.isoNow(),
      createdByStaffId: this.adminSessionSubject.value.actingStaffId || undefined
    };

    const nextBlocks = [block, ...this.dayOffBlocksSubject.value].sort((left, right) => left.startDate.localeCompare(right.startDate));
    this.dayOffBlocksSubject.next(nextBlocks);
    this.persistDayOffBlocks(nextBlocks);
    this.logAction('hr', 'day-off-block-created', 'Created a day-off block.', 'success', {
      blockId: block.id,
      scope: block.scope,
      startDate: block.startDate,
      endDate: block.endDate
    });
    return { ok: true, message: 'day-off block created.', block };
  }

  deleteDayOffBlock(blockId: string): AttendanceActionResult {
    const permissionError = this.requirePermission('manageScheduling', 'only admins can remove day-off blocks.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    const nextBlocks = this.dayOffBlocksSubject.value.filter(block => block.id !== blockId);
    if (nextBlocks.length === this.dayOffBlocksSubject.value.length) {
      return { ok: false, message: 'day-off block not found.' };
    }

    this.dayOffBlocksSubject.next(nextBlocks);
    this.persistDayOffBlocks(nextBlocks);
    this.logAction('hr', 'day-off-block-deleted', 'Removed a day-off block.', 'warning', {
      blockId
    });
    return { ok: true, message: 'day-off block removed.' };
  }

  getScheduleConflicts(payload: WorkScheduleDraft, scheduleId?: string): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    const staff = this.getStaffById(payload.staffId);
    const scheduleWindowError = this.validateScheduleWindow(payload.date, payload.startTime, payload.endTime);

    if (scheduleWindowError) {
      conflicts.push(scheduleWindowError);
    }

    if (!staff) {
      return conflicts;
    }

    if (!staff.active) {
      conflicts.push({
        type: 'inactive',
        severity: 'error',
        message: `${staff.fullName} is archived and cannot be scheduled.`
      });
    }

    const overlappingSchedule = this.schedulesSubject.value.find(schedule =>
      schedule.id !== scheduleId &&
      schedule.staffId === payload.staffId &&
      schedule.date === payload.date &&
      schedule.status !== 'cancelled' &&
      this.timesOverlap(payload.date, payload.startTime, payload.endTime, schedule.date, schedule.startTime, schedule.endTime)
    );

    if (overlappingSchedule) {
      conflicts.push({
        type: 'overlap',
        severity: 'error',
        relatedId: overlappingSchedule.id,
        message: `${staff.fullName} already has an overlapping shift on ${payload.date}.`
      });
    }

    const approvedLeave = this.leaveRequestsSubject.value.find(request =>
      request.staffId === payload.staffId &&
      request.status === 'approved' &&
      this.rangesOverlap(payload.date, payload.date, request.startDate, request.endDate)
    );

    if (approvedLeave) {
      conflicts.push({
        type: 'leave',
        severity: 'error',
        relatedId: approvedLeave.id,
        message: `${staff.fullName} is on approved ${approvedLeave.leaveType} leave for this date.`
      });
    }

    const block = this.dayOffBlocksSubject.value.find(entry =>
      this.rangesOverlap(payload.date, payload.date, entry.startDate, entry.endDate) &&
      (entry.scope === 'all' || entry.staffId === payload.staffId)
    );

    if (block) {
      conflicts.push({
        type: 'block',
        severity: 'error',
        relatedId: block.id,
        message: block.scope === 'all'
          ? `store-wide day-off block prevents scheduling on ${payload.date}.`
          : `${staff.fullName} is blocked from scheduling on ${payload.date}.`
      });
    }

    const availabilityEntries = this.availabilitySubject.value.filter(entry => entry.staffId === payload.staffId && entry.date === payload.date);
    if (availabilityEntries.length > 0) {
      const fitsAvailability = availabilityEntries.some(entry =>
        this.timeToMinutes(payload.startTime) >= this.timeToMinutes(entry.startTime) &&
        this.timeToMinutes(payload.endTime) <= this.timeToMinutes(entry.endTime)
      );

      if (!fitsAvailability) {
        conflicts.push({
          type: 'availability',
          severity: 'error',
          message: `${staff.fullName} is only available during the submitted availability windows for ${payload.date}.`
        });
      }
    } else if (staff.employmentType === 'part-time') {
      conflicts.push({
        type: 'availability',
        severity: 'warning',
        message: `${staff.fullName} is part-time and has no availability submitted for ${payload.date}.`
      });
    }

    if (!conflicts.some(conflict => conflict.severity === 'error')) {
      const coverageSummary = this.getDailyCoverageSummary(payload.date, payload, scheduleId);
      if (!coverageSummary.fullyCovered) {
        const firstGap = coverageSummary.missingSlots[0];
        conflicts.push({
          type: 'coverage',
          severity: 'warning',
          message: `coverage still drops below ${coverageSummary.requiredStaff} staff from ${firstGap.startTime} to ${firstGap.endTime} on ${payload.date}.`
        });
      }
    }

    return conflicts;
  }

  exportPayrollCsv(period: PayrollPeriod): AttendanceActionResult & { document?: GeneratedDocument } {
    const permissionError = this.requirePermission('exportPayroll', 'only admins can export payroll data.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    const summaries = this.getPayrollSummaryForPeriod(period);
    const rows = [
      ['Staff Code', 'Full Name', 'Role', 'Department', 'Hourly Rate', 'Regular Hours', 'Overtime Hours', 'Rendered Hours', 'Scheduled Hours', 'Late Minutes', 'Shifts Completed', 'Gross Pay'],
      ...summaries.map(summary => [
        summary.staffCode,
        summary.fullName,
        summary.role,
        summary.department,
        summary.hourlyRate.toFixed(2),
        summary.regularHours.toFixed(2),
        summary.overtimeHours.toFixed(2),
        summary.renderedHours.toFixed(2),
        summary.scheduledHours.toFixed(2),
        String(summary.lateMinutes),
        String(summary.shiftsCompleted),
        summary.grossPay.toFixed(2)
      ])
    ];

    const content = rows.map(row => row.map(value => this.escapeCsv(value)).join(',')).join('\n');
    this.logAction('hr', 'payroll-export-prepared', `Prepared payroll export for ${period.label}.`, 'success', {
      periodId: period.id,
      startDate: period.startDate,
      endDate: period.endDate
    });

    return {
      ok: true,
      message: 'payroll export prepared.',
      document: {
        fileName: `payroll-${period.startDate}-to-${period.endDate}.csv`,
        mimeType: 'text/csv;charset=utf-8',
        content
      }
    };
  }

  generatePayslip(period: PayrollPeriod, staffId: string): AttendanceActionResult & { payslip?: PayslipData } {
    const permissionError = this.requirePermission('exportPayroll', 'only admins can generate payslips.');
    if (permissionError) {
      return { ok: false, message: permissionError };
    }

    const staff = this.getStaffById(staffId);
    if (!staff) {
      return { ok: false, message: 'staff account not found for payslip generation.' };
    }

    const summary = this.getPayrollSummaryForPeriod(period).find(entry => entry.staffId === staffId);
    if (!summary) {
      return { ok: false, message: 'no payroll summary found for that staff member in the selected period.' };
    }

    const logs = this.logsSubject.value.filter(log => {
      const dateKey = log.clockInAt.slice(0, 10);
      return log.staffId === staffId && !!log.clockOutAt && dateKey >= period.startDate && dateKey <= period.endDate;
    });

    const attendanceSessions: PayslipAttendanceSession[] = logs.map(log => ({
      date: log.clockInAt.slice(0, 10),
      clockInTime: log.clockInAt.slice(11, 16),
      clockOutTime: log.clockOutAt?.slice(11, 16) || '--:--',
      renderedHours: this.toHours(log.workedMinutes),
      regularHours: this.toHours(log.regularMinutes),
      overtimeHours: this.toHours(log.overtimeMinutes),
      lateMinutes: log.lateMinutes,
      status: log.status
    }));

    this.logAction('hr', 'payslip-generated', `Generated a payslip for ${staff.fullName}.`, 'success', {
      periodId: period.id,
      targetStaffId: staff.id
    });

    return {
      ok: true,
      message: `payslip prepared for ${staff.fullName}.`,
      payslip: {
        fileName: `payslip-${staff.staffCode}-${period.startDate}-to-${period.endDate}.pdf`,
        period,
        staff,
        summary,
        attendanceSessions
      }
    };
  }

  clockIn(staffId: string, selfieDataUrl: string): AttendanceActionResult {
    const staff = this.getStaffById(staffId);
    if (!staff || !staff.active) {
      return { ok: false, message: 'active staff account not found.' };
    }

    if (!selfieDataUrl) {
      return { ok: false, message: 'selfie capture is required to clock in.' };
    }

    const existingOpenShift = this.getOpenShiftForStaff(staffId);
    if (existingOpenShift) {
      return { ok: false, message: 'this staff member already has an active shift.' };
    }

    const schedule = this.getPrimaryScheduleForDate(staffId, this.todayKey());
    const now = this.appClock.now();
    const lateMinutes = schedule
      ? Math.max(0, Math.round((now.getTime() - this.combineDateTime(schedule.date, schedule.startTime).getTime()) / 60000))
      : 0;

    const nextLog: AttendanceLog = {
      id: this.createId('attendance'),
      staffId: staff.id,
      staffCode: staff.staffCode,
      employeeName: staff.fullName,
      role: staff.role,
      department: staff.department,
      location: schedule?.location || staff.assignedLocation,
      clockInAt: this.appClock.isoNow(),
      clockInSelfie: selfieDataUrl,
      scheduledShiftId: schedule?.id,
      scheduledDate: schedule?.date,
      scheduledStartTime: schedule?.startTime,
      scheduledEndTime: schedule?.endTime,
      unpaidBreakMinutes: schedule?.unpaidBreakMinutes ?? 0,
      workedMinutes: 0,
      regularMinutes: 0,
      overtimeMinutes: 0,
      lateMinutes,
      status: lateMinutes > 0 ? 'late' : 'open'
    };

    const nextLogs = [nextLog, ...this.logsSubject.value];
    this.logsSubject.next(nextLogs);
    this.persistLogs(nextLogs);
    this.actionLogStore.addLog({
      module: 'attendance',
      action: 'clock-in',
      summary: `${staff.fullName} clocked in.`,
      status: lateMinutes > 0 ? 'warning' : 'success',
      performedByStaffId: staff.id,
      performedByName: staff.fullName,
      metadata: {
        attendanceId: nextLog.id,
        lateMinutes,
        location: nextLog.location
      }
    });

    return {
      ok: true,
      message: lateMinutes > 0
        ? `${staff.fullName} clocked in. ${lateMinutes} minute(s) late.`
        : `${staff.fullName} clocked in successfully.`,
      log: nextLog
    };
  }

  clockOut(staffId: string, selfieDataUrl: string): AttendanceActionResult {
    const staff = this.getStaffById(staffId);
    if (!staff || !staff.active) {
      return { ok: false, message: 'active staff account not found.' };
    }

    if (!selfieDataUrl) {
      return { ok: false, message: 'selfie capture is required to clock out.' };
    }

    const openShift = this.getOpenShiftForStaff(staffId);
    if (!openShift) {
      return { ok: false, message: 'no active clock in found for this staff member.' };
    }

    const clockOutAt = this.appClock.isoNow();
    const workedMinutesRaw = Math.max(
      0,
      Math.round((new Date(clockOutAt).getTime() - new Date(openShift.clockInAt).getTime()) / 60000)
    );
    const workedMinutes = Math.max(workedMinutesRaw - openShift.unpaidBreakMinutes, 0);
    const scheduledMinutes = openShift.scheduledDate && openShift.scheduledStartTime && openShift.scheduledEndTime
      ? Math.max(
          this.diffMinutes(openShift.scheduledDate, openShift.scheduledStartTime, openShift.scheduledEndTime) - openShift.unpaidBreakMinutes,
          0
        )
      : this.payrollPolicySubject.value.standardShiftHours * 60;
    const regularMinutes = Math.min(workedMinutes, scheduledMinutes);
    const overtimeMinutes = Math.max(workedMinutes - regularMinutes, 0);
    const status: AttendanceState = overtimeMinutes > 0
      ? 'overtime'
      : openShift.lateMinutes > 0
        ? 'late'
        : 'completed';

    let completedLog: AttendanceLog | undefined;
    const nextLogs = this.logsSubject.value.map(log => {
      if (log.id !== openShift.id) {
        return log;
      }

      completedLog = {
        ...log,
        clockOutAt,
        clockOutSelfie: selfieDataUrl,
        workedMinutes,
        regularMinutes,
        overtimeMinutes,
        status
      };

      return completedLog;
    });

    this.logsSubject.next(nextLogs);
    this.persistLogs(nextLogs);

    if (openShift.scheduledShiftId) {
      this.setScheduleStatus(openShift.scheduledShiftId, 'completed');
    }

    if (completedLog) {
      this.actionLogStore.addLog({
        module: 'attendance',
        action: 'clock-out',
        summary: `${staff.fullName} clocked out.`,
        status: 'success',
        performedByStaffId: staff.id,
        performedByName: staff.fullName,
        metadata: {
          attendanceId: completedLog.id,
          workedMinutes,
          overtimeMinutes,
          status: completedLog.status
        }
      });
    }

    return {
      ok: true,
      message: `${staff.fullName} clocked out. ${this.toHours(workedMinutes).toFixed(2)} hour(s) rendered.`,
      log: completedLog
    };
  }

  getStaffAccounts(): StaffAccount[] {
    return this.staffSubject.value;
  }

  getSetupStaffCredentials(): { staffCode: string; pin: string } | null {
    const firstActiveAdmin = this.staffSubject.value.find(staff => staff.active && this.isAdminRole(staff.role));
    if (!firstActiveAdmin) {
      return null;
    }

    return {
      staffCode: firstActiveAdmin.staffCode,
      pin: firstActiveAdmin.pin
    };
  }

  getStaffById(staffId: string): StaffAccount | undefined {
    return this.staffSubject.value.find(staff => staff.id === staffId);
  }

  getStaffByCode(staffCode: string): StaffAccount | undefined {
    const normalizedCode = staffCode.trim().toLowerCase();
    if (!normalizedCode) {
      return undefined;
    }

    return this.staffSubject.value.find(staff => staff.staffCode.trim().toLowerCase() === normalizedCode);
  }

  getStaffByWorkspaceUsername(workspaceUsername: string): StaffAccount | undefined {
    const normalizedUsername = this.normalizeWorkspaceUsername(workspaceUsername);
    if (!normalizedUsername) {
      return undefined;
    }

    return this.staffSubject.value.find(staff => staff.workspaceUsername === normalizedUsername);
  }

  getTodaysPosPin(staffId: string): string | null {
    const staff = this.getStaffById(staffId);
    if (!staff) {
      return null;
    }

    return this.generateDailyPosPin(staff, this.todayKey());
  }

  getSchedules(): WorkSchedule[] {
    return this.schedulesSubject.value;
  }

  getLeaveRequests(): LeaveRequest[] {
    return this.leaveRequestsSubject.value;
  }

  getDayOffBlocks(): DayOffBlock[] {
    return this.dayOffBlocksSubject.value;
  }

  getSignedInStaff(): StaffAccount | undefined {
    const actingStaffId = this.appSessionSubject.value.actingStaffId;
    return actingStaffId ? this.getStaffById(actingStaffId) : undefined;
  }

  getAdminSession(): HrAdminSession {
    return this.adminSessionSubject.value;
  }

  getSchedulesForRange(from: string, to: string): WorkSchedule[] {
    return this.schedulesSubject.value.filter(schedule => schedule.date >= from && schedule.date <= to);
  }

  getTodaySchedules(): WorkSchedule[] {
    return this.schedulesSubject.value.filter(schedule => schedule.date === this.todayKey());
  }

  getPrimaryScheduleForDate(staffId: string, date: string): WorkSchedule | undefined {
    return this.schedulesSubject.value
      .filter(schedule => schedule.staffId === staffId && schedule.date === date && schedule.status === 'scheduled')
      .sort((left, right) => left.startTime.localeCompare(right.startTime))[0];
  }

  getOpenShiftForStaff(staffId: string): AttendanceLog | undefined {
    return this.logsSubject.value.find(log => log.staffId === staffId && !log.clockOutAt);
  }

  getOpenShifts(): AttendanceLog[] {
    return this.logsSubject.value.filter(log => !log.clockOutAt);
  }

  getAttendanceDashboardSummary(referenceDate: string = this.todayKey()): AttendanceDashboardSummary {
    const todayLogs = this.logsSubject.value.filter(log => log.clockInAt.startsWith(referenceDate));
    const todaySchedules = this.schedulesSubject.value.filter(schedule => schedule.date === referenceDate);

    return {
      totalStaff: this.staffSubject.value.length,
      activeStaff: this.staffSubject.value.filter(staff => staff.active).length,
      openShifts: this.getOpenShifts().length,
      scheduledToday: todaySchedules.length,
      completedToday: todayLogs.filter(log => !!log.clockOutAt).length,
      lateToday: todayLogs.filter(log => log.lateMinutes > 0).length,
      missingClockOut: todayLogs.filter(log => !log.clockOutAt).length
    };
  }

  getUpcomingPayrollPeriods(referenceDate?: Date, count = 6): PayrollPeriod[] {
    const periods: PayrollPeriod[] = [];
    const baseDate = referenceDate || this.appClock.now();
    const startMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() - 2, 1);

    for (let index = 0; index < count; index += 1) {
      const monthDate = new Date(startMonth.getFullYear(), startMonth.getMonth() + index, 1);
      periods.push(...this.getPayrollPeriodsForMonth(monthDate));
    }

    return periods.sort((left, right) => left.startDate.localeCompare(right.startDate));
  }

  getPayrollSummaryForPeriod(period: PayrollPeriod): StaffPayrollSummary[] {
    const policy = this.payrollPolicySubject.value;
    const logs = this.logsSubject.value.filter(log => {
      const dateKey = log.clockInAt.slice(0, 10);
      return dateKey >= period.startDate && dateKey <= period.endDate;
    });

    return this.staffSubject.value
      .filter(staff => staff.active)
      .map(staff => {
        const staffLogs = logs.filter(log => log.staffId === staff.id && !!log.clockOutAt);
        const schedules = this.schedulesSubject.value.filter(schedule =>
          schedule.staffId === staff.id &&
          schedule.date >= period.startDate &&
          schedule.date <= period.endDate &&
          schedule.status !== 'cancelled'
        );
        const regularHours = this.toHours(staffLogs.reduce((sum, log) => sum + log.regularMinutes, 0));
        const overtimeHours = this.toHours(staffLogs.reduce((sum, log) => sum + log.overtimeMinutes, 0));
        const renderedHours = regularHours + overtimeHours;
        const scheduledHours = schedules.reduce((sum, schedule) => {
          const shiftMinutes = Math.max(
            this.diffMinutes(schedule.date, schedule.startTime, schedule.endTime) - schedule.unpaidBreakMinutes,
            0
          );
          return sum + this.toHours(shiftMinutes);
        }, 0);
        const lateMinutes = staffLogs.reduce((sum, log) => sum + log.lateMinutes, 0);
        const grossPay = (regularHours * staff.hourlyRate) + (overtimeHours * staff.hourlyRate * policy.overtimeMultiplier);

        return {
          staffId: staff.id,
          staffCode: staff.staffCode,
          fullName: staff.fullName,
          role: staff.role,
          department: staff.department,
          hourlyRate: staff.hourlyRate,
          regularHours,
          overtimeHours,
          renderedHours,
          scheduledHours,
          lateMinutes,
          shiftsCompleted: staffLogs.length,
          grossPay
        };
      })
      .sort((left, right) => left.fullName.localeCompare(right.fullName));
  }

  private getPayrollPeriodsForMonth(monthDate: Date): PayrollPeriod[] {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const secondPayoutDay = month === 1
      ? (this.isLeapYear(year)
        ? this.payrollPolicySubject.value.paymentDays.leapFebruaryPayoutDay
        : this.payrollPolicySubject.value.paymentDays.februaryPayoutDay)
      : Math.min(this.payrollPolicySubject.value.paymentDays.secondPayoutDay, lastDay);

    return [
      {
        id: `${monthKey}-a`,
        label: `${this.formatMonth(monthDate)} 1-15`,
        startDate: `${monthKey}-01`,
        endDate: `${monthKey}-15`,
        payoutDate: `${monthKey}-${String(this.payrollPolicySubject.value.paymentDays.firstPayoutDay).padStart(2, '0')}`
      },
      {
        id: `${monthKey}-b`,
        label: `${this.formatMonth(monthDate)} 16-${String(lastDay).padStart(2, '0')}`,
        startDate: `${monthKey}-16`,
        endDate: `${monthKey}-${String(lastDay).padStart(2, '0')}`,
        payoutDate: `${monthKey}-${String(secondPayoutDay).padStart(2, '0')}`
      }
    ];
  }

  private getStoredLogs(): AttendanceLog[] {
    try {
      const parsed = this.remoteState.getState<Array<Partial<AttendanceLog> & { id?: number }>>(STORAGE_KEYS.logs, []);
      return parsed.map(entry => ({
        id: String(entry.id ?? this.createId('legacy-attendance')),
        staffId: entry.staffId || this.createLegacyStaffId(entry.employeeName || 'staff'),
        staffCode: entry.staffCode || this.createLegacyStaffCode(entry.employeeName || 'staff'),
        employeeName: entry.employeeName || 'unknown staff',
        role: this.normalizeRole(entry.role),
        department: entry.department || 'operations',
        location: entry.location || 'main',
        clockInAt: entry.clockInAt || new Date().toISOString(),
        clockOutAt: entry.clockOutAt,
        clockInSelfie: entry.clockInSelfie || '',
        clockOutSelfie: entry.clockOutSelfie,
        scheduledShiftId: entry.scheduledShiftId,
        scheduledDate: entry.scheduledDate,
        scheduledStartTime: entry.scheduledStartTime,
        scheduledEndTime: entry.scheduledEndTime,
        unpaidBreakMinutes: entry.unpaidBreakMinutes ?? 0,
        workedMinutes: entry.workedMinutes ?? 0,
        regularMinutes: entry.regularMinutes ?? 0,
        overtimeMinutes: entry.overtimeMinutes ?? 0,
        lateMinutes: entry.lateMinutes ?? 0,
        status: entry.status || (entry.clockOutAt ? 'completed' : 'open')
      }));
    } catch {
      return [];
    }
  }

  private getStoredStaffAccounts(logs: AttendanceLog[]): StaffAccount[] {
    const parsed = this.remoteState.getState<Partial<StaffAccount>[] | null>(STORAGE_KEYS.staff, null);
    if (parsed) {
      try {
        const usedUsernames = new Set<string>();

        return parsed.map((staff, index) => {
          const staffCode = staff.staffCode || this.createStaffCode(index + 1);
          const fullName = staff.fullName || 'Unknown Staff';
          const workspaceUsername = this.resolveWorkspaceUsername(
            staff.workspaceUsername,
            fullName,
            staffCode,
            undefined,
            undefined,
            usedUsernames
          ) || `staff.${String(index + 1).padStart(4, '0')}`;
          usedUsernames.add(workspaceUsername);

          return {
            id: staff.id || this.createId('staff'),
            staffCode,
            fullName,
            workspaceUsername,
            passwordHash: staff.passwordHash || DEFAULT_STAFF_WORKSPACE_PASSWORD_HASH,
            requiresPasswordChange: staff.requiresPasswordChange ?? !staff.passwordHash,
            credentialUpdatedAt: staff.credentialUpdatedAt || staff.updatedAt || new Date().toISOString(),
            email: staff.email || '',
            phone: staff.phone || '',
            role: this.normalizeRole(staff.role),
            department: staff.department || 'operations',
            employmentType: staff.employmentType || 'full-time',
            assignedLocation: staff.assignedLocation || 'main',
            hourlyRate: Number(staff.hourlyRate) > 0 ? Number(staff.hourlyRate) : 0,
            monthlyDrinkBudget: this.normalizeMonthlyDrinkBudget(staff.monthlyDrinkBudget),
            pin: staff.pin || '1234',
            hireDate: staff.hireDate || this.todayKey(),
            active: staff.active ?? true,
            notes: staff.notes || '',
            createdAt: staff.createdAt || new Date().toISOString(),
            updatedAt: staff.updatedAt || new Date().toISOString()
          };
        });
      } catch {
        return this.inferLegacyStaffAccounts(logs);
      }
    }

    return this.inferLegacyStaffAccounts(logs);
  }

  private inferLegacyStaffAccounts(logs: AttendanceLog[]): StaffAccount[] {
    const staffMap = new Map<string, StaffAccount>();

    logs.forEach(log => {
      if (staffMap.has(log.staffId)) {
        return;
      }

      staffMap.set(log.staffId, {
        id: log.staffId,
        staffCode: log.staffCode,
        fullName: log.employeeName,
        workspaceUsername: this.resolveWorkspaceUsername(undefined, log.employeeName, log.staffCode) || `staff.${log.staffCode.toLowerCase()}`,
        passwordHash: DEFAULT_STAFF_WORKSPACE_PASSWORD_HASH,
        requiresPasswordChange: true,
        credentialUpdatedAt: log.clockInAt,
        email: '',
        phone: '',
        role: log.role,
        department: log.department,
        employmentType: 'full-time',
        assignedLocation: log.location,
        hourlyRate: 0,
        monthlyDrinkBudget: 0,
        pin: '1234',
        hireDate: log.clockInAt.slice(0, 10),
        active: true,
        notes: 'Migrated from legacy attendance log.',
        createdAt: log.clockInAt,
        updatedAt: log.clockInAt
      });
    });

    return Array.from(staffMap.values());
  }

  private getStoredSchedules(): WorkSchedule[] {
    try {
      return (this.remoteState.getState<Partial<WorkSchedule>[]>(STORAGE_KEYS.schedules, [])).map(schedule => ({
        id: schedule.id || this.createId('shift'),
        staffId: schedule.staffId || '',
        date: schedule.date || this.todayKey(),
        startTime: schedule.startTime || '09:00',
        endTime: schedule.endTime || '18:00',
        unpaidBreakMinutes: schedule.unpaidBreakMinutes ?? 60,
        location: schedule.location || 'main',
        status: schedule.status || 'scheduled',
        notes: schedule.notes || '',
        createdAt: schedule.createdAt || new Date().toISOString(),
        updatedAt: schedule.updatedAt || new Date().toISOString()
      }));
    } catch {
      return [];
    }
  }

  private getStoredPayrollPolicy(): PayrollPolicy {
    try {
      return {
        ...DEFAULT_PAYROLL_POLICY,
        ...(this.remoteState.getState<Partial<PayrollPolicy>>(STORAGE_KEYS.policy, {}))
      };
    } catch {
      return DEFAULT_PAYROLL_POLICY;
    }
  }

  private getStoredAvailability(): StaffAvailability[] {
    try {
      return (this.remoteState.getState<Partial<StaffAvailability>[]>(STORAGE_KEYS.availability, [])).map(entry => ({
        id: entry.id || this.createId('availability'),
        staffId: entry.staffId || '',
        date: entry.date || this.todayKey(),
        startTime: entry.startTime || DEFAULT_SCHEDULING_POLICY.openTime,
        endTime: entry.endTime || DEFAULT_SCHEDULING_POLICY.closeTime,
        source: entry.source || 'staff',
        notes: entry.notes || '',
        createdAt: entry.createdAt || new Date().toISOString(),
        updatedAt: entry.updatedAt || new Date().toISOString()
      }));
    } catch {
      return [];
    }
  }

  private getStoredLeaveRequests(): LeaveRequest[] {
    try {
      return (this.remoteState.getState<Partial<LeaveRequest>[]>(STORAGE_KEYS.leaveRequests, [])).map(request => ({
        id: request.id || this.createId('leave'),
        staffId: request.staffId || '',
        leaveType: request.leaveType || 'personal',
        startDate: request.startDate || this.todayKey(),
        endDate: request.endDate || request.startDate || this.todayKey(),
        reason: request.reason || '',
        notes: request.notes || '',
        status: request.status || 'pending',
        requestedAt: request.requestedAt || new Date().toISOString(),
        reviewedAt: request.reviewedAt,
        reviewedByStaffId: request.reviewedByStaffId
      }));
    } catch {
      return [];
    }
  }

  private getStoredDayOffBlocks(): DayOffBlock[] {
    try {
      return (this.remoteState.getState<Partial<DayOffBlock>[]>(STORAGE_KEYS.dayOffBlocks, [])).map(block => ({
        id: block.id || this.createId('block'),
        scope: block.scope || 'all',
        staffId: block.staffId,
        startDate: block.startDate || this.todayKey(),
        endDate: block.endDate || block.startDate || this.todayKey(),
        reason: block.reason || '',
        createdAt: block.createdAt || new Date().toISOString(),
        createdByStaffId: block.createdByStaffId
      }));
    } catch {
      return [];
    }
  }

  private getStoredAppSession(staff: StaffAccount[]): StaffAppSession {
    try {
      const stored = this.readDeviceLocalSession<Partial<StaffAppSession>>(STORAGE_KEYS.appSession);
      if (!stored) {
        return this.createGuestAppSession();
      }

      const actingStaff = staff.find(entry => entry.id === stored.actingStaffId);
      if (!actingStaff || !actingStaff.active) {
        return this.createGuestAppSession();
      }

      return {
        ...this.buildAppSession(actingStaff),
        signedInAt: stored.signedInAt || new Date().toISOString()
      };
    } catch {
      return this.createGuestAppSession();
    }
  }

  private getStoredAdminSession(staff: StaffAccount[]): HrAdminSession {
    try {
      const stored = this.readDeviceLocalSession<Partial<HrAdminSession>>(STORAGE_KEYS.adminSession);
      if (!stored) {
        return this.createGuestSession();
      }

      if (stored.actingStaffId === MASTER_ADMIN_SESSION_ID) {
        return this.buildMasterAdminSession(stored.authenticatedAt || new Date().toISOString());
      }

      const actingStaff = staff.find(entry => entry.id === stored.actingStaffId);
      if (!actingStaff || !actingStaff.active || !this.isAdminRole(actingStaff.role)) {
        return this.createGuestSession();
      }

      return {
        ...this.buildAdminSession(actingStaff),
        authenticatedAt: stored.authenticatedAt || new Date().toISOString()
      };
    } catch {
      return this.createGuestSession();
    }
  }

  private persistLogs(logs: AttendanceLog[]): void {
    this.remoteState.setState(STORAGE_KEYS.logs, logs);
  }

  private persistStaff(staff: StaffAccount[]): void {
    this.remoteState.setState(STORAGE_KEYS.staff, staff);
  }

  private persistSchedules(schedules: WorkSchedule[]): void {
    this.remoteState.setState(STORAGE_KEYS.schedules, schedules);
  }

  private persistAvailability(availability: StaffAvailability[]): void {
    this.remoteState.setState(STORAGE_KEYS.availability, availability);
  }

  private persistPayrollPolicy(policy: PayrollPolicy): void {
    this.remoteState.setState(STORAGE_KEYS.policy, policy);
  }

  private persistLeaveRequests(requests: LeaveRequest[]): void {
    this.remoteState.setState(STORAGE_KEYS.leaveRequests, requests);
  }

  private persistDayOffBlocks(blocks: DayOffBlock[]): void {
    this.remoteState.setState(STORAGE_KEYS.dayOffBlocks, blocks);
  }

  private persistAppSession(session: StaffAppSession): void {
    this.writeDeviceLocalSession(STORAGE_KEYS.appSession, session);
  }

  private persistAdminSession(session: HrAdminSession): void {
    this.writeDeviceLocalSession(STORAGE_KEYS.adminSession, session);
  }

  private persistMasterAdminCredentials(credentials: MasterAdminCredentials): void {
    this.remoteState.setState(STORAGE_KEYS.masterAdmin, credentials);
  }

  private readDeviceLocalSession<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private writeDeviceLocalSession<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Session persistence is best-effort and should not block auth flow.
    }
  }

  private createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private createStaffCode(sequence: number = (this.staffSubject?.value.length ?? 0) + 1): string {
    return `MBK-${String(sequence).padStart(4, '0')}`;
  }

  private createLegacyStaffId(name: string): string {
    return `legacy-${this.normalizeText(name).replace(/\s+/g, '-')}`;
  }

  private createLegacyStaffCode(name: string): string {
    return `LEG-${this.normalizeText(name).slice(0, 8).toUpperCase()}`;
  }

  private hasAdminAccounts(staff: StaffAccount[]): boolean {
    return staff.some(entry => entry.active && this.isAdminRole(entry.role));
  }

  private createPermissionMap(enabledPermissions: HrPermission[]): Record<HrPermission, boolean> {
    return {
      manageStaff: enabledPermissions.includes('manageStaff'),
      managePayroll: enabledPermissions.includes('managePayroll'),
      archiveStaff: enabledPermissions.includes('archiveStaff'),
      manageLeave: enabledPermissions.includes('manageLeave'),
      manageScheduling: enabledPermissions.includes('manageScheduling'),
      exportPayroll: enabledPermissions.includes('exportPayroll')
    };
  }

  private getAllowedFeatures(role: AttendanceRole): StaffAppFeature[] {
    if (this.isAdminRole(role)) {
      return [
        'schedule-center',
        'clock-in-out',
        'pos',
        'queue-board',
        'store-inventory',
        'popup-inventory',
        'event-inventory',
        'hr',
        'menu',
        'menu-builder',
        'master-inventory',
        'finance',
        'reports',
        'event-operations'
      ];
    }

    return ['schedule-center', 'clock-in-out', 'pos', 'queue-board', 'store-inventory', 'popup-inventory', 'event-inventory'];
  }

  private buildAppSession(staff: StaffAccount): StaffAppSession {
    return {
      actingStaffId: staff.id,
      actingStaffName: staff.fullName,
      actingRole: staff.role,
      signedInAt: this.appClock.isoNow(),
      allowedFeatures: this.getAllowedFeatures(staff.role)
    };
  }

  private buildAdminSession(staff: StaffAccount): HrAdminSession {
    const permissions = this.isAdminRole(staff.role)
      ? this.createPermissionMap(['manageStaff', 'managePayroll', 'archiveStaff', 'manageLeave', 'manageScheduling', 'exportPayroll'])
      : this.createPermissionMap([]);

    return {
      actingStaffId: staff.id,
      actingStaffName: staff.fullName,
      actingRole: staff.role,
      authenticatedAt: this.appClock.isoNow(),
      permissions
    };
  }

  private buildMasterAdminSession(authenticatedAt: string = this.appClock.isoNow()): HrAdminSession {
    return {
      actingStaffId: MASTER_ADMIN_SESSION_ID,
      actingStaffName: 'Master Admin',
      actingRole: 'admin',
      authenticatedAt,
      permissions: this.createPermissionMap(['manageStaff', 'managePayroll', 'archiveStaff', 'manageLeave', 'manageScheduling', 'exportPayroll'])
    };
  }

  private createGuestSession(): HrAdminSession {
    return {
      actingStaffId: null,
      actingStaffName: 'Guest',
      actingRole: 'guest',
      permissions: this.createPermissionMap([])
    };
  }

  private createGuestAppSession(): StaffAppSession {
    return {
      actingStaffId: null,
      actingStaffName: 'Guest',
      actingRole: 'guest',
      allowedFeatures: []
    };
  }

  private syncAdminSession(staff: StaffAccount[]): void {
    const current = this.adminSessionSubject.value;

    if (!current.actingStaffId) {
      const guest = this.createGuestSession();
      this.adminSessionSubject.next(guest);
      this.persistAdminSession(guest);
      return;
    }

    if (this.isMasterAdminSession(current)) {
      const synced = this.buildMasterAdminSession(current.authenticatedAt || new Date().toISOString());
      this.adminSessionSubject.next(synced);
      this.persistAdminSession(synced);
      return;
    }

    const actingStaff = staff.find(entry => entry.id === current.actingStaffId);
    if (!actingStaff || !actingStaff.active || !this.isAdminRole(actingStaff.role)) {
      const guest = this.createGuestSession();
      this.adminSessionSubject.next(guest);
      this.persistAdminSession(guest);
      return;
    }

    const synced = {
      ...this.buildAdminSession(actingStaff),
      authenticatedAt: current.authenticatedAt || new Date().toISOString()
    };
    this.adminSessionSubject.next(synced);
    this.persistAdminSession(synced);
  }

  private syncAppSession(staff: StaffAccount[]): void {
    const current = this.appSessionSubject.value;
    if (!current.actingStaffId) {
      const guest = this.createGuestAppSession();
      this.appSessionSubject.next(guest);
      this.persistAppSession(guest);
      return;
    }

    const actingStaff = staff.find(entry => entry.id === current.actingStaffId);
    if (!actingStaff || !actingStaff.active) {
      const guest = this.createGuestAppSession();
      this.appSessionSubject.next(guest);
      this.persistAppSession(guest);
      return;
    }

    const synced = {
      ...this.buildAppSession(actingStaff),
      signedInAt: current.signedInAt || new Date().toISOString()
    };
    this.appSessionSubject.next(synced);
    this.persistAppSession(synced);
  }

  private requirePermission(permission: HrPermission, deniedMessage: string): string | null {
    if (this.hasPermission(permission)) {
      return null;
    }

    return deniedMessage;
  }

  private normalizeText(value: string): string {
    return value.trim().toLowerCase();
  }

  private normalizeMonthlyDrinkBudget(value?: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(Math.floor(Number(value)), 0);
  }

  private logAction(
    module: 'attendance' | 'hr',
    action: string,
    summary: string,
    status: ActionLogStatus,
    metadata?: Record<string, string | number | boolean | null | undefined>
  ): void {
    const session = this.adminSessionSubject.value;
    this.actionLogStore.addLog({
      module,
      action,
      summary,
      status,
      performedByStaffId: this.isMasterAdminSession(session) ? undefined : session.actingStaffId || undefined,
      performedByName: session.actingStaffName,
      metadata
    });
  }

  private getStoredMasterAdminCredentials(): MasterAdminCredentials {
    const fallback: MasterAdminCredentials = {
      username: DEFAULT_MASTER_ADMIN_USERNAME,
      passwordHash: DEFAULT_MASTER_ADMIN_PASSWORD_HASH,
      requiresPasswordChange: true,
      updatedAt: new Date().toISOString()
    };

    const stored = this.remoteState.getState<Partial<MasterAdminCredentials> | null>(STORAGE_KEYS.masterAdmin, null);
    if (!stored) {
      return fallback;
    }

    try {
      const requiresPasswordChange = stored.requiresPasswordChange ?? fallback.requiresPasswordChange;
      const storedPasswordHash = stored.passwordHash || fallback.passwordHash;

      if (requiresPasswordChange && storedPasswordHash === LEGACY_MASTER_ADMIN_PASSWORD_HASH) {
        return fallback;
      }

      return {
        username: stored.username?.trim() || fallback.username,
        passwordHash: storedPasswordHash,
        requiresPasswordChange,
        updatedAt: stored.updatedAt || fallback.updatedAt
      };
    } catch {
      return fallback;
    }
  }

  private isMasterAdminSession(session: HrAdminSession = this.adminSessionSubject.value): boolean {
    return session.actingStaffId === MASTER_ADMIN_SESSION_ID && session.actingRole === 'admin';
  }

  private validateMasterAdminPassword(password: string): string | null {
    if (password.length < 10) {
      return 'use at least 10 characters for the admin password.';
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return 'use uppercase, lowercase, number, and symbol in the admin password.';
    }

    return null;
  }

  private validateAvailabilityWindow(date: string, startTime: string, endTime: string): string | null {
    const validationConflict = this.validateScheduleWindow(date, startTime, endTime);
    return validationConflict?.message || null;
  }

  private validateScheduleWindow(date: string, startTime: string, endTime: string): ScheduleConflict | null {
    if (!date || !startTime || !endTime) {
      return {
        type: 'store-hours',
        severity: 'error',
        message: 'schedule date, start time, and end time are required.'
      };
    }

    const policy = this.getSchedulingPolicy();
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    const openMinutes = this.timeToMinutes(policy.openTime);
    const closeMinutes = this.timeToMinutes(policy.closeTime);

    if (endMinutes <= startMinutes) {
      return {
        type: 'store-hours',
        severity: 'error',
        message: 'shift end time must be later than the start time.'
      };
    }

    if (startMinutes < openMinutes || endMinutes > closeMinutes) {
      return {
        type: 'store-hours',
        severity: 'error',
        message: `shift must stay inside store hours: ${policy.openTime} to ${policy.closeTime}.`
      };
    }

    if (startMinutes % policy.slotMinutes !== 0 || endMinutes % policy.slotMinutes !== 0) {
      return {
        type: 'shift-length',
        severity: 'error',
        message: `shift times must use ${policy.slotMinutes}-minute increments.`
      };
    }

    const shiftMinutes = endMinutes - startMinutes;
    if (shiftMinutes !== policy.fullDayMinutes && shiftMinutes !== policy.halfDayMinutes) {
      return {
        type: 'shift-length',
        severity: 'error',
        message: 'shift length must be either full day (9 hours) or half day (4 hours 30 minutes).'
      };
    }

    return null;
  }

  private getPolicySlotStarts(): string[] {
    const policy = this.getSchedulingPolicy();
    const openMinutes = this.timeToMinutes(policy.openTime);
    const closeMinutes = this.timeToMinutes(policy.closeTime);
    const slots: string[] = [];

    for (let minutes = openMinutes; minutes < closeMinutes; minutes += policy.slotMinutes) {
      slots.push(this.minutesToTime(minutes));
    }

    return slots;
  }

  private addMinutesToTime(timeValue: string, minutesToAdd: number): string {
    return this.minutesToTime(this.timeToMinutes(timeValue) + minutesToAdd);
  }

  private timeToMinutes(timeValue: string): number {
    const [hours, minutes] = timeValue.split(':').map(value => Number(value));
    return (hours * 60) + minutes;
  }

  private minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private validateStaffWorkspacePassword(password: string): string | null {
    if (password.length < 10) {
      return 'use at least 10 characters for the staff workspace password.';
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return 'use uppercase, lowercase, number, and symbol in the staff workspace password.';
    }

    return null;
  }

  private normalizeWorkspaceUsername(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9._-]/g, '');
  }

  private resolveWorkspaceUsername(
    preferredUsername: string | undefined,
    fullName: string,
    staffCode: string,
    fallbackUsername?: string,
    excludeStaffId?: string,
    reservedUsernames: Set<string> = new Set<string>()
  ): string | null {
    const normalizedPreferred = this.normalizeWorkspaceUsername(preferredUsername || '');
    if (preferredUsername?.trim() && !normalizedPreferred) {
      return null;
    }

    const normalizedFallback = this.normalizeWorkspaceUsername(fallbackUsername || '');
    const normalizedName = this.normalizeWorkspaceUsername(fullName);
    const codeTail = staffCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const base = normalizedPreferred || normalizedFallback || normalizedName || `staff.${codeTail}`;
    let candidate = base;
    let suffix = 2;
    const existingStaff = this.staffSubject?.value || [];

    while (
      reservedUsernames.has(candidate) ||
      existingStaff.some(staff => staff.id !== excludeStaffId && staff.workspaceUsername === candidate)
    ) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private generateTemporaryWorkspacePassword(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const values = new Uint32Array(8);
    globalThis.crypto.getRandomValues(values);
    const token = Array.from(values, value => alphabet[value % alphabet.length]).join('');
    return `Mbk!${token}9`;
  }

  private generateStaffPin(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  private isValidPosDailyPin(staff: StaffAccount, providedPin: string): boolean {
    return this.generateDailyPosPin(staff, this.todayKey()) === providedPin;
  }

  private generateDailyPosPin(staff: StaffAccount, dateKey: string): string {
    const seed = `${staff.staffCode}|${staff.pin}|${dateKey}|mbk-pos`;
    let rolling = 0;

    for (let index = 0; index < seed.length; index += 1) {
      rolling = ((rolling * 33) + seed.charCodeAt(index)) % 10000;
    }

    const base = Number.parseInt(staff.pin, 10) || 0;
    const pinValue = ((rolling + (base * 7)) % 9000) + 1000;
    return String(pinValue).padStart(4, '0');
  }

  private async hashSecret(value: string): Promise<string> {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private normalizeRole(value?: string): AttendanceRole {
    const normalized = this.normalizeText(value || '');

    if (['admin', 'admin admin', 'owner', 'operations manager', 'supervisor'].includes(normalized)) {
      return 'admin';
    }

    return 'staff';
  }

  private todayKey(): string {
    return this.appClock.todayKey();
  }

  private combineDateTime(dateValue: string, timeValue: string): Date {
    return new Date(`${dateValue}T${timeValue}:00`);
  }

  private diffMinutes(dateValue: string, startTime: string, endTime: string): number {
    const start = this.combineDateTime(dateValue, startTime);
    const end = this.combineDateTime(dateValue, endTime);
    if (end >= start) {
      return Math.round((end.getTime() - start.getTime()) / 60000);
    }

    const overnightEnd = new Date(end);
    overnightEnd.setDate(overnightEnd.getDate() + 1);
    return Math.round((overnightEnd.getTime() - start.getTime()) / 60000);
  }

  private toHours(minutes: number): number {
    return Math.round((minutes / 60) * 100) / 100;
  }

  private formatMonth(dateValue: Date): string {
    return dateValue.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  private isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  private rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    return startA <= endB && startB <= endA;
  }

  private timesOverlap(dateA: string, startA: string, endA: string, dateB: string, startB: string, endB: string): boolean {
    if (dateA !== dateB) {
      return false;
    }

    const startOne = this.combineDateTime(dateA, startA).getTime();
    const endOne = this.resolveEnd(dateA, startA, endA).getTime();
    const startTwo = this.combineDateTime(dateB, startB).getTime();
    const endTwo = this.resolveEnd(dateB, startB, endB).getTime();
    return startOne < endTwo && startTwo < endOne;
  }

  private resolveEnd(dateValue: string, startTime: string, endTime: string): Date {
    const start = this.combineDateTime(dateValue, startTime);
    const end = this.combineDateTime(dateValue, endTime);
    if (end >= start) {
      return end;
    }

    const overnightEnd = new Date(end);
    overnightEnd.setDate(overnightEnd.getDate() + 1);
    return overnightEnd;
  }

  private escapeCsv(value: string): string {
    const normalized = String(value ?? '');
    if (/[",\n]/.test(normalized)) {
      return `"${normalized.replace(/"/g, '""')}"`;
    }

    return normalized;
  }
}
