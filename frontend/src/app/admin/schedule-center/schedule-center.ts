import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  AttendanceStore,
  LeaveRequest,
  SHIFT_LOCATIONS,
  StaffAccount,
  StaffAvailability,
  StaffAvailabilityDraft,
  WorkSchedule,
  WorkScheduleDraft
} from '../../shared/attendance/attendance.store';
import { AppClockStore } from '../../shared/testing/app-clock.store';

interface CalendarDay {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  shifts: WorkSchedule[];
  leave: LeaveRequest[];
  availability: StaffAvailability[];
}

@Component({
  selector: 'app-schedule-center',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './schedule-center.html',
  styleUrl: './schedule-center.scss'
})
export class ScheduleCenter implements OnInit, OnDestroy {
  private readonly appClock = inject(AppClockStore);

  staffAccounts: StaffAccount[] = [];
  schedules: WorkSchedule[] = [];
  availabilityEntries: StaffAvailability[] = [];
  leaveRequests: LeaveRequest[] = [];
  selectedStaffId = '';
  currentStaffId: string | null = null;
  feedback = '';
  feedbackTone: 'success' | 'error' | 'info' = 'info';

  // Calendar
  calendarCursor = this.startOfMonth(new Date());
  selectedDateKey = '';
  selectedDay: CalendarDay | null = null;
  detailPanel: 'leave' | 'availability' | 'shift' | null = null;

  // Forms
  availabilityForm: StaffAvailabilityDraft = {
    staffId: '',
    date: '',
    startTime: '11:00',
    endTime: '15:30',
    source: 'staff',
    notes: ''
  };

  leaveForm: { leaveType: 'vacation' | 'sick'; startDate: string; endDate: string; reason: string; notes: string } = {
    leaveType: 'vacation',
    startDate: '',
    endDate: '',
    reason: '',
    notes: ''
  };

  leaveFormStaffId = '';

  scheduleForm: WorkScheduleDraft = {
    staffId: '',
    date: '',
    startTime: '11:00',
    endTime: '20:00',
    unpaidBreakMinutes: 30,
    location: 'main',
    notes: ''
  };

  readonly shiftLocations = SHIFT_LOCATIONS;

  private readonly subscription = new Subscription();

  constructor(private readonly attendanceStore: AttendanceStore) {}

  ngOnInit(): void {
    this.subscription.add(this.attendanceStore.staff$.subscribe(staff => {
      this.staffAccounts = [...staff].filter(s => s.active).sort((a, b) => a.fullName.localeCompare(b.fullName));
      this.syncSelectedStaff();
    }));

    this.subscription.add(this.attendanceStore.schedules$.subscribe(schedules => {
      this.schedules = [...schedules];
      this.refreshSelectedDay();
    }));

    this.subscription.add(this.attendanceStore.availability$.subscribe(entries => {
      this.availabilityEntries = [...entries];
      this.refreshSelectedDay();
    }));

    this.subscription.add(this.attendanceStore.leaveRequests$.subscribe(requests => {
      this.leaveRequests = [...requests];
      this.refreshSelectedDay();
    }));

    this.subscription.add(this.attendanceStore.appSession$.subscribe(session => {
      this.currentStaffId = session.actingStaffId;
      this.syncSelectedStaff();
    }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // ── Access ─────────────────────────────────────────────────────────────────

  get hasAdminAccess(): boolean {
    return this.attendanceStore.canAccessAdminRoute();
  }

  get schedulingPolicy() {
    return this.attendanceStore.getSchedulingPolicy();
  }

  get currentStaff(): StaffAccount | undefined {
    return this.currentStaffId ? this.staffAccounts.find(s => s.id === this.currentStaffId) : undefined;
  }

  get selectedStaff(): StaffAccount | undefined {
    return this.selectedStaffId ? this.staffAccounts.find(s => s.id === this.selectedStaffId) : undefined;
  }

  get canEditAvailability(): boolean {
    if (this.hasAdminAccess) return true;
    return !!this.currentStaff && this.currentStaff.employmentType === 'part-time';
  }

  get canSubmitLeave(): boolean {
    return this.hasAdminAccess || !!this.currentStaff;
  }

  // ── Calendar ───────────────────────────────────────────────────────────────

  get calendarMonthLabel(): string {
    return this.calendarCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get calendarDays(): CalendarDay[] {
    const year = this.calendarCursor.getFullYear();
    const month = this.calendarCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const today = this.todayKey();
    const staffFilter = this.selectedStaffId;
    const days: CalendarDay[] = [];

    for (let i = 0; i < 42; i++) {
      const dayDate = new Date(year, month, 1 - startOffset + i);
      const dateKey = this.toDateKey(dayDate);
      const isCurrentMonth = dayDate.getMonth() === month;

      const shifts = this.schedules.filter(s =>
        s.date === dateKey && (staffFilter ? s.staffId === staffFilter : true)
      );
      const leave = this.leaveRequests.filter(r =>
        r.startDate <= dateKey && r.endDate >= dateKey && (staffFilter ? r.staffId === staffFilter : true)
      );
      const availability = this.availabilityEntries.filter(a =>
        a.date === dateKey && (staffFilter ? a.staffId === staffFilter : true)
      );

      days.push({ dateKey, dayNumber: dayDate.getDate(), isCurrentMonth, isToday: dateKey === today, shifts, leave, availability });
    }

    return days;
  }

  prevMonth(): void {
    const c = this.calendarCursor;
    this.calendarCursor = new Date(c.getFullYear(), c.getMonth() - 1, 1);
  }

  nextMonth(): void {
    const c = this.calendarCursor;
    this.calendarCursor = new Date(c.getFullYear(), c.getMonth() + 1, 1);
  }

  resetMonth(): void {
    this.calendarCursor = this.startOfMonth(new Date());
  }

  selectDate(day: CalendarDay): void {
    if (this.selectedDateKey === day.dateKey) {
      this.selectedDateKey = '';
      this.selectedDay = null;
      this.detailPanel = null;
      return;
    }

    this.selectedDateKey = day.dateKey;
    this.selectedDay = day;
    this.detailPanel = null;
    this.feedback = '';

    // Pre-fill forms with clicked date
    this.availabilityForm.date = day.dateKey;
    this.availabilityForm.staffId = this.selectedStaffId || this.currentStaffId || '';
    this.leaveForm.startDate = day.dateKey;
    this.leaveForm.endDate = day.dateKey;
    this.leaveFormStaffId = this.selectedStaffId || '';
    this.scheduleForm.date = day.dateKey;
    this.scheduleForm.staffId = this.selectedStaffId || '';
  }

  openPanel(type: 'leave' | 'availability' | 'shift'): void {
    this.detailPanel = this.detailPanel === type ? null : type;
    this.feedback = '';
  }

  closePanel(): void {
    this.detailPanel = null;
  }

  trackByDateKey(_: number, day: CalendarDay): string {
    return day.dateKey;
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  selectStaff(staffId: string): void {
    this.selectedStaffId = staffId;
    this.feedback = '';
    this.refreshSelectedDay();
  }

  applyAvailabilityTemplate(template: 'opening-half' | 'closing-half' | 'full-day'): void {
    if (template === 'opening-half') {
      this.availabilityForm.startTime = '11:00';
      this.availabilityForm.endTime = '15:30';
    } else if (template === 'closing-half') {
      this.availabilityForm.startTime = '16:30';
      this.availabilityForm.endTime = '21:00';
    } else {
      this.availabilityForm.startTime = '11:00';
      this.availabilityForm.endTime = '20:00';
    }
  }

  saveAvailability(): void {
    const staffId = this.availabilityForm.staffId || this.currentStaffId || '';
    if (!staffId) {
      this.setFeedback('error', 'select a staff member or sign in first.');
      return;
    }

    const result = this.attendanceStore.submitStaffAvailability({
      ...this.availabilityForm,
      staffId,
      source: this.hasAdminAccess ? 'admin' : 'staff'
    });
    this.setFeedback(result.ok ? 'success' : 'error', result.message);
    if (result.ok) {
      this.availabilityForm.notes = '';
      this.detailPanel = null;
    }
  }

  removeAvailability(entry: StaffAvailability): void {
    const result = this.attendanceStore.deleteStaffAvailability(entry.id);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);
  }

  saveLeaveRequest(): void {
    const targetStaffId = this.hasAdminAccess
      ? (this.leaveFormStaffId || this.selectedStaffId || this.currentStaffId || '')
      : (this.currentStaff?.id || '');

    if (!targetStaffId) {
      this.setFeedback('error', 'select a staff member or sign in to file leave.');
      return;
    }

    const result = this.hasAdminAccess
      ? this.attendanceStore.submitLeaveRequest({
          staffId: targetStaffId,
          leaveType: this.leaveForm.leaveType,
          startDate: this.leaveForm.startDate,
          endDate: this.leaveForm.endDate,
          reason: this.leaveForm.reason,
          notes: this.leaveForm.notes
        })
      : this.attendanceStore.submitSelfLeaveRequest({
          leaveType: this.leaveForm.leaveType,
          startDate: this.leaveForm.startDate,
          endDate: this.leaveForm.endDate,
          reason: this.leaveForm.reason,
          notes: this.leaveForm.notes
        });

    this.setFeedback(result.ok ? 'success' : 'error', result.message);
    if (result.ok) {
      this.leaveForm.reason = '';
      this.leaveForm.notes = '';
      this.detailPanel = null;
    }
  }

  saveShift(): void {
    if (!this.scheduleForm.staffId) {
      this.setFeedback('error', 'select a staff member for this shift.');
      return;
    }

    const result = this.attendanceStore.createSchedule(this.scheduleForm);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);
    if (result.ok) {
      this.scheduleForm = { ...this.scheduleForm, startTime: '11:00', endTime: '20:00', unpaidBreakMinutes: 30, notes: '' };
      this.detailPanel = null;
    }
  }

  reviewLeave(request: LeaveRequest, decision: 'approved' | 'rejected'): void {
    const result = this.attendanceStore.reviewLeaveRequest(request.id, decision);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);
  }

  getStaffName(staffId: string): string {
    return this.staffAccounts.find(s => s.id === staffId)?.fullName ?? staffId;
  }

  getShiftHours(schedule: WorkSchedule): number {
    const start = new Date(`${schedule.date}T${schedule.startTime}:00`);
    const end = new Date(`${schedule.date}T${schedule.endTime}:00`);
    const mins = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000)) - schedule.unpaidBreakMinutes;
    return Math.round((mins / 60) * 100) / 100;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private refreshSelectedDay(): void {
    if (!this.selectedDateKey) return;
    const found = this.calendarDays.find(d => d.dateKey === this.selectedDateKey);
    if (found) this.selectedDay = found;
  }

  private syncSelectedStaff(): void {
    if (this.selectedStaffId && this.staffAccounts.some(s => s.id === this.selectedStaffId)) {
      return;
    }
    if (!this.hasAdminAccess && this.currentStaffId && this.staffAccounts.some(s => s.id === this.currentStaffId)) {
      this.selectedStaffId = this.currentStaffId;
      this.availabilityForm.staffId = this.currentStaffId;
    }
  }

  private setFeedback(tone: 'success' | 'error' | 'info', message: string): void {
    this.feedbackTone = tone;
    this.feedback = message;
  }

  private todayKey(): string {
    return this.appClock.todayKey();
  }

  private toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }
}
