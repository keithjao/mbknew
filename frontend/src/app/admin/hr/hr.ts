import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AttendanceDashboardSummary,
  AttendanceLog,
  AttendanceStore,
  DailyCoverageSummary,
  DayOffBlock,
  DayOffBlockDraft,
  EMPLOYMENT_TYPES,
  GeneratedDocument,
  HrAdminSession,
  LEAVE_TYPES,
  LeaveRequest,
  LeaveRequestDraft,
  PayrollPeriod,
  PayrollPolicy,
  ScheduleConflict,
  SchedulingPolicy,
  SHIFT_LOCATIONS,
  STAFF_DEPARTMENTS,
  STAFF_ROLES,
  StaffAccount,
  StaffAccountDraft,
  StaffAvailability,
  StaffPayrollSummary,
  WorkSchedule,
  WorkScheduleDraft
} from '../../shared/attendance/attendance.store';
import { AppClockStore } from '../../shared/testing/app-clock.store';
import { PayslipPdfService } from './payslip-pdf.service';
import { StaffBudgetStore, StaffBudgetUsageEntry, WastageRecord } from '../../shared/staff/staff-budget.store';

type HrTab = 'overview' | 'staff' | 'leave' | 'payroll' | 'attendance';

interface PlanningCalendarDay {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  schedules: WorkSchedule[];
  leaveRequests: LeaveRequest[];
  dayOffBlocks: DayOffBlock[];
}

interface StaffWastageSummary {
  staffId: string;
  staffName: string;
  totalRecords: number;
  totalDrinks: number;
  latestAssignedAt: string;
}

interface ProvisionedWorkspaceCredentials {
  workspaceUsername: string;
  staffPin: string;
  todaysPosPin: string;
  temporaryPassword: string;
}

@Component({
  selector: 'app-hr',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe, CurrencyPipe, DecimalPipe],
  templateUrl: './hr.html',
  styleUrl: './hr.scss'
})
export class Hr implements OnInit, OnDestroy {
  readonly pageSize = 10;
  readonly tabs: Array<{ id: HrTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'staff', label: 'Staff Accounts' },
    { id: 'leave', label: 'Leave & Blocks' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'attendance', label: 'Attendance' }
  ];
  readonly staffRoles = STAFF_ROLES;
  readonly employmentTypes = EMPLOYMENT_TYPES;
  readonly shiftLocations = SHIFT_LOCATIONS;
  readonly leaveTypes = LEAVE_TYPES;

  selectedTab: HrTab = 'overview';
  attendanceLogs: AttendanceLog[] = [];
  staffAccounts: StaffAccount[] = [];
  schedules: WorkSchedule[] = [];
  leaveRequests: LeaveRequest[] = [];
  dayOffBlocks: DayOffBlock[] = [];
  staffBudgetUsage: StaffBudgetUsageEntry[] = [];
  wastageRecords: WastageRecord[] = [];
  todaySchedules: WorkSchedule[] = [];
  openShifts: AttendanceLog[] = [];
  payrollPeriods: PayrollPeriod[] = [];
  payrollSummaries: StaffPayrollSummary[] = [];
  dashboardSummary: AttendanceDashboardSummary = {
    totalStaff: 0,
    activeStaff: 0,
    openShifts: 0,
    scheduledToday: 0,
    completedToday: 0,
    lateToday: 0,
    missingClockOut: 0
  };

  staffForm: StaffAccountDraft = this.createEmptyStaffForm();
  scheduleForm: WorkScheduleDraft = this.createEmptyScheduleForm();
  leaveForm: LeaveRequestDraft = this.createEmptyLeaveForm();
  dayOffBlockForm: DayOffBlockDraft = this.createEmptyDayOffBlockForm();
  payrollPolicyForm: PayrollPolicy = this.createDefaultPayrollPolicyForm();
  editingStaffId: string | null = null;
  editingScheduleId: string | null = null;
  selectedPayrollPeriodId = '';
  staffTablePage = 1;
  scheduleTablePage = 1;
  leaveTablePage = 1;
  payrollTablePage = 1;
  attendanceTablePage = 1;
  adminSession: HrAdminSession = {
    actingStaffId: null,
    actingStaffName: 'Guest',
    actingRole: 'guest',
    permissions: {
      manageStaff: false,
      managePayroll: false,
      archiveStaff: false,
      manageLeave: false,
      manageScheduling: false,
      exportPayroll: false
    }
  };
  calendarCursor = this.startOfMonth(this.currentDate());
  selectedCalendarDateKey = this.todayKey();
  feedback = '';
  feedbackTone: 'success' | 'error' | 'info' = 'info';
  provisionedWorkspaceCredentials: ProvisionedWorkspaceCredentials | null = null;

  private readonly subscription = new Subscription();
  private staffLookup = new Map<string, StaffAccount>();

  constructor(
    private readonly attendanceStore: AttendanceStore,
    private readonly payslipPdfService: PayslipPdfService,
    private readonly staffBudgetStore: StaffBudgetStore,
    private readonly appClock: AppClockStore
  ) {}

  ngOnInit(): void {
    this.subscription.add(this.attendanceStore.logs$.subscribe(logs => {
      this.attendanceLogs = [...logs].sort((left, right) => right.clockInAt.localeCompare(left.clockInAt));
      this.refreshDerivedState();
      this.ensurePageBounds();
    }));

    this.subscription.add(this.attendanceStore.staff$.subscribe(staff => {
      this.staffAccounts = [...staff].sort((left, right) => left.fullName.localeCompare(right.fullName));
      this.staffLookup = new Map(this.staffAccounts.map(entry => [entry.id, entry]));
      this.refreshDerivedState();
      this.ensurePageBounds();
    }));

    this.subscription.add(this.attendanceStore.schedules$.subscribe(schedules => {
      this.schedules = [...schedules].sort((left, right) => this.sortSchedules(left, right));
      this.refreshDerivedState();
      this.ensurePageBounds();
    }));

    this.subscription.add(this.attendanceStore.leaveRequests$.subscribe(requests => {
      this.leaveRequests = [...requests].sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
      this.ensurePageBounds();
    }));

    this.subscription.add(this.attendanceStore.dayOffBlocks$.subscribe(blocks => {
      this.dayOffBlocks = [...blocks].sort((left, right) => `${left.startDate}${left.endDate}`.localeCompare(`${right.startDate}${right.endDate}`));
    }));

    this.subscription.add(this.staffBudgetStore.usage$.subscribe(entries => {
      this.staffBudgetUsage = entries;
    }));

    this.subscription.add(this.staffBudgetStore.wastage$.subscribe(records => {
      this.wastageRecords = records;
    }));

    this.subscription.add(this.attendanceStore.adminSession$.subscribe(session => {
      this.adminSession = session;
    }));

    this.subscription.add(this.attendanceStore.payrollPolicy$.subscribe(policy => {
      this.payrollPolicyForm = {
        overtimeMultiplier: policy.overtimeMultiplier,
        standardShiftHours: policy.standardShiftHours,
        paymentDays: { ...policy.paymentDays }
      };
      this.refreshDerivedState();
    }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  selectTab(tab: HrTab): void {
    this.selectedTab = tab;
  }

  async saveStaffAccount(): Promise<void> {
    const result = this.editingStaffId
      ? await this.attendanceStore.updateStaffAccount(this.editingStaffId, this.staffForm)
      : await this.attendanceStore.createStaffAccount(this.staffForm);

    this.provisionedWorkspaceCredentials = result.ok && result.workspaceCredentials
      ? {
          workspaceUsername: result.workspaceCredentials.workspaceUsername,
          staffPin: result.workspaceCredentials.staffPin,
          todaysPosPin: this.attendanceStore.getTodaysPosPin(result.staff?.id || '') || 'n/a',
          temporaryPassword: result.workspaceCredentials.temporaryPassword
        }
      : null;

    const feedbackMessage = result.ok && result.workspaceCredentials
      ? `${result.message} workspace username: ${result.workspaceCredentials.workspaceUsername}. store the temporary password securely below.`
      : result.message;

    this.setFeedback(result.ok ? 'success' : 'error', feedbackMessage);
    if (result.ok) {
      this.resetStaffForm();
      this.selectedTab = 'staff';
    }
  }

  editStaffAccount(staff: StaffAccount): void {
    this.selectedTab = 'staff';
    this.provisionedWorkspaceCredentials = null;
    this.editingStaffId = staff.id;
    this.staffForm = {
      fullName: staff.fullName,
      workspaceUsername: staff.workspaceUsername,
      workspacePassword: '',
      email: staff.email,
      phone: staff.phone,
      role: staff.role,
      department: staff.department,
      employmentType: staff.employmentType,
      assignedLocation: staff.assignedLocation,
      hourlyRate: staff.hourlyRate,
      monthlyDrinkBudget: staff.monthlyDrinkBudget,
      pin: staff.pin,
      hireDate: staff.hireDate,
      active: staff.active,
      notes: staff.notes || ''
    };
  }

  resetStaffForm(): void {
    this.editingStaffId = null;
    this.provisionedWorkspaceCredentials = null;
    this.staffForm = this.createEmptyStaffForm();
  }

  clearProvisionedWorkspaceCredentials(): void {
    this.provisionedWorkspaceCredentials = null;
  }

  toggleStaffActive(staff: StaffAccount): void {
    const result = this.attendanceStore.setStaffActive(staff.id, !staff.active);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);
  }

  saveSchedule(): void {
    if (!this.scheduleForm.staffId) {
      this.setFeedback('error', 'select a staff member before saving a shift.');
      return;
    }

    const result = this.editingScheduleId
      ? this.attendanceStore.updateSchedule(this.editingScheduleId, this.scheduleForm)
      : this.attendanceStore.createSchedule(this.scheduleForm);

    this.setFeedback(result.ok ? 'success' : 'error', result.message);
    if (result.ok) {
      this.resetScheduleForm();
      this.selectedTab = 'attendance';
    }
  }

  editSchedule(schedule: WorkSchedule): void {
    this.selectedTab = 'attendance';
    this.editingScheduleId = schedule.id;
    this.scheduleForm = {
      staffId: schedule.staffId,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      unpaidBreakMinutes: schedule.unpaidBreakMinutes,
      location: schedule.location,
      notes: schedule.notes || ''
    };
  }

  resetScheduleForm(): void {
    this.editingScheduleId = null;
    this.scheduleForm = this.createEmptyScheduleForm();
  }

  updateScheduleStatus(schedule: WorkSchedule, status: WorkSchedule['status']): void {
    const result = this.attendanceStore.setScheduleStatus(schedule.id, status);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);
  }

  removeSchedule(schedule: WorkSchedule): void {
    const result = this.attendanceStore.deleteSchedule(schedule.id);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);
  }

  saveLeaveRequest(): void {
    const result = this.attendanceStore.submitLeaveRequest(this.leaveForm);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);
    if (result.ok) {
      this.leaveForm = this.createEmptyLeaveForm();
    }
  }

  reviewLeaveRequest(request: LeaveRequest, status: 'approved' | 'rejected'): void {
    const result = this.attendanceStore.reviewLeaveRequest(request.id, status);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);
  }

  saveDayOffBlock(): void {
    const result = this.attendanceStore.createDayOffBlock(this.dayOffBlockForm);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);
    if (result.ok) {
      this.dayOffBlockForm = this.createEmptyDayOffBlockForm();
    }
  }

  removeDayOffBlock(block: DayOffBlock): void {
    const result = this.attendanceStore.deleteDayOffBlock(block.id);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);
  }

  savePayrollPolicy(): void {
    const result = this.attendanceStore.updatePayrollPolicy({
      overtimeMultiplier: Number(this.payrollPolicyForm.overtimeMultiplier),
      standardShiftHours: Number(this.payrollPolicyForm.standardShiftHours),
      paymentDays: {
        firstPayoutDay: Number(this.payrollPolicyForm.paymentDays.firstPayoutDay),
        secondPayoutDay: Number(this.payrollPolicyForm.paymentDays.secondPayoutDay),
        februaryPayoutDay: Number(this.payrollPolicyForm.paymentDays.februaryPayoutDay),
        leapFebruaryPayoutDay: Number(this.payrollPolicyForm.paymentDays.leapFebruaryPayoutDay)
      }
    });

    this.setFeedback(result.ok ? 'success' : 'error', result.message);
  }

  exportPayrollSummary(): void {
    const period = this.selectedPayrollPeriod;
    if (!period) {
      this.setFeedback('error', 'select a payroll period first.');
      return;
    }

    const result = this.attendanceStore.exportPayrollCsv(period);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);
    if (result.ok && result.document) {
      this.downloadDocument(result.document);
    }
  }

  generatePayslip(summary: StaffPayrollSummary): void {
    const period = this.selectedPayrollPeriod;
    if (!period) {
      this.setFeedback('error', 'select a payroll period first.');
      return;
    }

    const result = this.attendanceStore.generatePayslip(period, summary.staffId);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);
    if (result.ok && result.payslip) {
      this.payslipPdfService.downloadPayslip(result.payslip);
    }
  }

  previousCalendarMonth(): void {
    this.calendarCursor = new Date(this.calendarCursor.getFullYear(), this.calendarCursor.getMonth() - 1, 1);
  }

  nextCalendarMonth(): void {
    this.calendarCursor = new Date(this.calendarCursor.getFullYear(), this.calendarCursor.getMonth() + 1, 1);
  }

  resetCalendarMonth(): void {
    this.calendarCursor = this.startOfMonth(this.currentDate());
    this.selectedCalendarDateKey = this.todayKey();
  }

  selectCalendarDate(day: PlanningCalendarDay): void {
    this.selectedCalendarDateKey = day.dateKey;
  }

  selectPayrollPeriod(periodId: string): void {
    this.selectedPayrollPeriodId = periodId;
    this.refreshPayrollSummary();
  }

  get canManageStaff(): boolean {
    return this.adminSession.permissions.manageStaff;
  }

  get canArchiveStaff(): boolean {
    return this.adminSession.permissions.archiveStaff;
  }

  get canManagePayroll(): boolean {
    return this.adminSession.permissions.managePayroll;
  }

  get canManageLeave(): boolean {
    return this.adminSession.permissions.manageLeave;
  }

  get canManageScheduling(): boolean {
    return this.adminSession.permissions.manageScheduling;
  }

  get canExportPayroll(): boolean {
    return this.adminSession.permissions.exportPayroll;
  }

  get pendingLeaveCount(): number {
    return this.leaveRequests.filter(request => request.status === 'pending').length;
  }

  get currentScheduleConflicts(): ScheduleConflict[] {
    if (!this.scheduleForm.staffId || !this.scheduleForm.date || !this.scheduleForm.startTime || !this.scheduleForm.endTime) {
      return [];
    }

    return this.attendanceStore.getScheduleConflicts(this.scheduleForm, this.editingScheduleId || undefined);
  }

  get currentScheduleBlockingConflicts(): ScheduleConflict[] {
    return this.currentScheduleConflicts.filter(conflict => conflict.severity === 'error');
  }

  get schedulingPolicy(): SchedulingPolicy {
    return this.attendanceStore.getSchedulingPolicy();
  }

  get selectedScheduleCoverage(): DailyCoverageSummary | null {
    if (!this.scheduleForm.date) {
      return null;
    }

    return this.attendanceStore.getDailyCoverageSummary(this.scheduleForm.date, this.scheduleForm, this.editingScheduleId || undefined);
  }

  get scheduleDateAvailability(): StaffAvailability[] {
    if (!this.scheduleForm.date) {
      return [];
    }

    return this.attendanceStore.getAvailabilityForDate(this.scheduleForm.date);
  }

  get calendarMonthLabel(): string {
    return this.calendarCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get planningCalendarDays(): PlanningCalendarDay[] {
    const monthStart = this.startOfMonth(this.calendarCursor);
    const firstVisibleDay = new Date(monthStart);
    firstVisibleDay.setDate(monthStart.getDate() - monthStart.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const currentDate = this.addDays(firstVisibleDay, index);
      const dateKey = this.dateToKey(currentDate);

      return {
        dateKey,
        dayNumber: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === this.calendarCursor.getMonth(),
        isToday: dateKey === this.todayKey(),
        schedules: this.schedules.filter(schedule => schedule.date === dateKey),
        leaveRequests: this.leaveRequests.filter(request =>
          request.status !== 'rejected' && this.rangesOverlap(dateKey, dateKey, request.startDate, request.endDate)
        ),
        dayOffBlocks: this.dayOffBlocks.filter(block => this.rangesOverlap(dateKey, dateKey, block.startDate, block.endDate))
      };
    });
  }

  get selectedCalendarDay(): PlanningCalendarDay | undefined {
    return this.planningCalendarDays.find(day => day.dateKey === this.selectedCalendarDateKey);
  }

  getVisibleCalendarSchedules(day: PlanningCalendarDay): WorkSchedule[] {
    return day.schedules.slice(0, 2);
  }

  getVisibleCalendarLeave(day: PlanningCalendarDay): LeaveRequest[] {
    return day.leaveRequests.slice(0, 2);
  }

  getCalendarOverflowCount(day: PlanningCalendarDay): number {
    const visibleCount = this.getVisibleCalendarSchedules(day).length + this.getVisibleCalendarLeave(day).length + day.dayOffBlocks.slice(0, 1).length;
    const totalCount = day.schedules.length + day.leaveRequests.length + day.dayOffBlocks.length;
    return Math.max(totalCount - visibleCount, 0);
  }

  get selectedPayrollPeriod(): PayrollPeriod | undefined {
    return this.payrollPeriods.find(period => period.id === this.selectedPayrollPeriodId);
  }

  get totalPayrollGross(): number {
    return this.payrollSummaries.reduce((sum, summary) => sum + summary.grossPay, 0);
  }

  get totalRenderedHours(): number {
    return this.payrollSummaries.reduce((sum, summary) => sum + summary.renderedHours, 0);
  }

  get totalScheduledHours(): number {
    return this.payrollSummaries.reduce((sum, summary) => sum + summary.scheduledHours, 0);
  }

  get recentAttendanceLogs(): AttendanceLog[] {
    return this.attendanceLogs.slice(0, 12);
  }

  get pagedStaffAccounts(): StaffAccount[] {
    return this.paginate(this.staffAccounts, this.staffTablePage);
  }

  get staffTableTotalPages(): number {
    return this.getTotalPages(this.staffAccounts.length);
  }

  get pagedSchedules(): WorkSchedule[] {
    return this.paginate(this.schedules, this.scheduleTablePage);
  }

  get scheduleTableTotalPages(): number {
    return this.getTotalPages(this.schedules.length);
  }

  get pagedLeaveRequests(): LeaveRequest[] {
    return this.paginate(this.leaveRequests, this.leaveTablePage);
  }

  get leaveTableTotalPages(): number {
    return this.getTotalPages(this.leaveRequests.length);
  }

  get pagedPayrollSummaries(): StaffPayrollSummary[] {
    return this.paginate(this.payrollSummaries, this.payrollTablePage);
  }

  get payrollTableTotalPages(): number {
    return this.getTotalPages(this.payrollSummaries.length);
  }

  get pagedAttendanceLogs(): AttendanceLog[] {
    return this.paginate(this.attendanceLogs, this.attendanceTablePage);
  }

  get attendanceTableTotalPages(): number {
    return this.getTotalPages(this.attendanceLogs.length);
  }

  get recentStaffBudgetUsage(): StaffBudgetUsageEntry[] {
    return this.staffBudgetUsage.slice(0, 12);
  }

  get openWastageCount(): number {
    return this.wastageRecords.filter(record => record.status === 'open').length;
  }

  get staffWastageSummaries(): StaffWastageSummary[] {
    const summaryMap = new Map<string, StaffWastageSummary>();

    this.wastageRecords
      .filter(record => record.status === 'charged' && !!record.assignedStaffId)
      .forEach(record => {
        const staffId = record.assignedStaffId as string;
        const current = summaryMap.get(staffId);
        const latestAssignedAt = current && current.latestAssignedAt > (record.assignedAt || '')
          ? current.latestAssignedAt
          : (record.assignedAt || '');

        summaryMap.set(staffId, {
          staffId,
          staffName: record.assignedStaffName || this.getStaffName(staffId),
          totalRecords: (current?.totalRecords || 0) + 1,
          totalDrinks: (current?.totalDrinks || 0) + record.quantity,
          latestAssignedAt
        });
      });

    return Array.from(summaryMap.values()).sort((left, right) => {
      if (right.totalDrinks !== left.totalDrinks) {
        return right.totalDrinks - left.totalDrinks;
      }

      return right.latestAssignedAt.localeCompare(left.latestAssignedAt);
    });
  }

  get openWastageRecords(): WastageRecord[] {
    return this.wastageRecords
      .filter(record => record.status === 'open')
      .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt))
      .slice(0, 8);
  }

  getLeaveStaffName(staffId: string): string {
    return this.getStaffName(staffId);
  }

  getLeaveReviewerName(staffId?: string): string {
    return staffId ? this.getStaffName(staffId) : 'Pending';
  }

  getStaffName(staffId: string): string {
    return this.staffLookup.get(staffId)?.fullName || 'Unknown staff';
  }

  getTodaysPosPin(staffId: string): string {
    return this.attendanceStore.getTodaysPosPin(staffId) || 'n/a';
  }

  getStaffMeta(staffId: string): string {
    const staff = this.staffLookup.get(staffId);
    if (!staff) {
      return 'Unassigned';
    }

    return `${staff.role} • ${staff.department}`;
  }

  getStaffEmploymentType(staffId: string): string {
    return this.staffLookup.get(staffId)?.employmentType || 'staff';
  }

  getShiftHours(schedule: WorkSchedule): number {
    return Math.round((((this.diffMinutes(schedule.date, schedule.startTime, schedule.endTime) - schedule.unpaidBreakMinutes) / 60) * 100)) / 100;
  }

  getRenderedHours(log: AttendanceLog): number {
    return Math.round(((log.workedMinutes / 60) * 100)) / 100;
  }

  getBadgeClass(status: string): string {
    return status.toLowerCase().replace(/\s+/g, '-');
  }

  getStaffBudgetSummary(staff: StaffAccount) {
    return this.staffBudgetStore.getMonthlyBudgetSummary(staff.id, staff.monthlyDrinkBudget);
  }

  trackById(index: number, item: { id?: string; staffId?: string; relatedId?: string }): string {
    return item.id || item.staffId || item.relatedId || String(index);
  }

  trackByCalendarDay(_index: number, day: PlanningCalendarDay): string {
    return day.dateKey;
  }

  trackByCoverageSlot(index: number, slot: DailyCoverageSummary['missingSlots'][number]): string {
    return `${slot.startTime}-${slot.endTime}-${index}`;
  }

  setStaffTablePage(page: number): void {
    this.staffTablePage = this.clampPage(page, this.staffTableTotalPages);
  }

  setScheduleTablePage(page: number): void {
    this.scheduleTablePage = this.clampPage(page, this.scheduleTableTotalPages);
  }

  setLeaveTablePage(page: number): void {
    this.leaveTablePage = this.clampPage(page, this.leaveTableTotalPages);
  }

  setPayrollTablePage(page: number): void {
    this.payrollTablePage = this.clampPage(page, this.payrollTableTotalPages);
  }

  setAttendanceTablePage(page: number): void {
    this.attendanceTablePage = this.clampPage(page, this.attendanceTableTotalPages);
  }

  applyShiftTemplate(template: 'opening-half' | 'closing-half' | 'opening-full' | 'closing-full'): void {
    if (template === 'opening-half') {
      this.scheduleForm.startTime = '11:00';
      this.scheduleForm.endTime = '15:30';
      this.scheduleForm.unpaidBreakMinutes = 0;
      return;
    }

    if (template === 'closing-half') {
      this.scheduleForm.startTime = '16:30';
      this.scheduleForm.endTime = '21:00';
      this.scheduleForm.unpaidBreakMinutes = 0;
      return;
    }

    if (template === 'opening-full') {
      this.scheduleForm.startTime = '11:00';
      this.scheduleForm.endTime = '20:00';
      this.scheduleForm.unpaidBreakMinutes = 60;
      return;
    }

    this.scheduleForm.startTime = '12:00';
    this.scheduleForm.endTime = '21:00';
    this.scheduleForm.unpaidBreakMinutes = 60;
  }

  private downloadDocument(document: GeneratedDocument): void {
    const blob = new Blob([document.content], { type: document.mimeType });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = document.fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private refreshDerivedState(): void {
    this.todaySchedules = this.schedules
      .filter(schedule => schedule.date === this.todayKey())
      .sort((left, right) => this.sortSchedules(left, right));
    this.openShifts = this.attendanceStore.getOpenShifts().sort((left, right) => right.clockInAt.localeCompare(left.clockInAt));
    this.dashboardSummary = this.attendanceStore.getAttendanceDashboardSummary();

    this.payrollPeriods = this.attendanceStore.getUpcomingPayrollPeriods(this.currentDate(), 6);
    if (!this.payrollPeriods.some(period => period.id === this.selectedPayrollPeriodId)) {
      const preferredPeriod = this.payrollPeriods.find(period => period.payoutDate >= this.todayKey()) || this.payrollPeriods[this.payrollPeriods.length - 1];
      this.selectedPayrollPeriodId = preferredPeriod?.id || '';
    }

    this.refreshPayrollSummary();
  }

  private refreshPayrollSummary(): void {
    const selectedPeriod = this.selectedPayrollPeriod;
    this.payrollSummaries = selectedPeriod
      ? this.attendanceStore.getPayrollSummaryForPeriod(selectedPeriod)
      : [];
    this.ensurePageBounds();
  }

  private createEmptyStaffForm(): StaffAccountDraft {
    return {
      fullName: '',
      workspaceUsername: '',
      workspacePassword: '',
      email: '',
      phone: '',
      role: 'staff',
      employmentType: 'full-time',
      hourlyRate: 75,
      monthlyDrinkBudget: 0,
      pin: undefined,
      hireDate: this.todayKey(),
      active: true,
      notes: ''
    };
  }

  private createEmptyScheduleForm(): WorkScheduleDraft {
    return {
      staffId: this.staffAccounts.find(staff => staff.active)?.id || '',
      date: this.todayKey(),
      startTime: '11:00',
      endTime: '20:00',
      unpaidBreakMinutes: 60,
      location: 'main',
      notes: ''
    };
  }

  private createEmptyLeaveForm(): LeaveRequestDraft {
    return {
      staffId: this.staffAccounts.find(staff => staff.active)?.id || '',
      leaveType: 'vacation',
      startDate: this.todayKey(),
      endDate: this.todayKey(),
      reason: '',
      notes: ''
    };
  }

  private createEmptyDayOffBlockForm(): DayOffBlockDraft {
    return {
      scope: 'all',
      staffId: '',
      startDate: this.todayKey(),
      endDate: this.todayKey(),
      reason: ''
    };
  }

  private startOfMonth(dateValue: Date): Date {
    return new Date(dateValue.getFullYear(), dateValue.getMonth(), 1);
  }

  private addDays(dateValue: Date, offset: number): Date {
    const nextDate = new Date(dateValue);
    nextDate.setDate(nextDate.getDate() + offset);
    return nextDate;
  }

  private dateToKey(dateValue: Date): string {
    return dateValue.toISOString().slice(0, 10);
  }

  private rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    return startA <= endB && startB <= endA;
  }

  private createDefaultPayrollPolicyForm(): PayrollPolicy {
    return {
      overtimeMultiplier: 1.25,
      standardShiftHours: 8,
      paymentDays: {
        firstPayoutDay: 15,
        secondPayoutDay: 30,
        februaryPayoutDay: 28,
        leapFebruaryPayoutDay: 29
      }
    };
  }

  private setFeedback(tone: 'success' | 'error' | 'info', message: string): void {
    this.feedbackTone = tone;
    this.feedback = message;
  }

  private currentDate(): Date {
    return this.appClock?.now() ?? new Date();
  }

  private paginate<T>(items: T[], page: number): T[] {
    const start = (page - 1) * this.pageSize;
    return items.slice(start, start + this.pageSize);
  }

  private ensurePageBounds(): void {
    this.staffTablePage = this.clampPage(this.staffTablePage, this.staffTableTotalPages);
    this.scheduleTablePage = this.clampPage(this.scheduleTablePage, this.scheduleTableTotalPages);
    this.leaveTablePage = this.clampPage(this.leaveTablePage, this.leaveTableTotalPages);
    this.payrollTablePage = this.clampPage(this.payrollTablePage, this.payrollTableTotalPages);
    this.attendanceTablePage = this.clampPage(this.attendanceTablePage, this.attendanceTableTotalPages);
  }

  private getTotalPages(totalItems: number): number {
    return Math.max(1, Math.ceil(totalItems / this.pageSize));
  }

  private clampPage(page: number, totalPages: number): number {
    return Math.min(Math.max(page, 1), totalPages);
  }

  private todayKey(): string {
    return this.appClock?.todayKey() || new Date().toISOString().slice(0, 10);
  }

  private diffMinutes(dateValue: string, startTime: string, endTime: string): number {
    const start = new Date(`${dateValue}T${startTime}:00`);
    const end = new Date(`${dateValue}T${endTime}:00`);

    if (end >= start) {
      return Math.round((end.getTime() - start.getTime()) / 60000);
    }

    const overnightEnd = new Date(end);
    overnightEnd.setDate(overnightEnd.getDate() + 1);
    return Math.round((overnightEnd.getTime() - start.getTime()) / 60000);
  }

  private sortSchedules(left: WorkSchedule, right: WorkSchedule): number {
    return `${left.date}${left.startTime}`.localeCompare(`${right.date}${right.startTime}`);
  }
}