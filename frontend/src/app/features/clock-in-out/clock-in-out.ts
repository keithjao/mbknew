import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AttendanceLog, AttendanceStore, StaffAccount, WorkSchedule } from '../../shared/attendance/attendance.store';
import { AppClockStore } from '../../shared/testing/app-clock.store';

@Component({
  selector: 'app-clock-in-out',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './clock-in-out.html',
  styleUrl: './clock-in-out.scss'
})
export class ClockInOut implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('captureCanvas') captureCanvas?: ElementRef<HTMLCanvasElement>;

  staffMembers: StaffAccount[] = [];
  attendanceLogs: AttendanceLog[] = [];
  schedules: WorkSchedule[] = [];
  selfieDataUrl = '';
  feedback = '';
  feedbackTone: 'success' | 'error' | 'info' = 'info';
  isCameraLive = false;
  private stream?: MediaStream;
  private readonly subscription = new Subscription();

  constructor(
    private readonly attendanceStore: AttendanceStore,
    private readonly appClock: AppClockStore
  ) {}

  ngOnInit(): void {
    this.subscription.add(this.attendanceStore.staff$.subscribe(staff => {
      this.staffMembers = staff.filter(entry => entry.active).sort((left, right) => left.fullName.localeCompare(right.fullName));
    }));

    this.subscription.add(this.attendanceStore.logs$.subscribe(logs => {
      this.attendanceLogs = [...logs].sort((left, right) => right.clockInAt.localeCompare(left.clockInAt));
    }));

    this.subscription.add(this.attendanceStore.schedules$.subscribe(schedules => {
      this.schedules = [...schedules].sort((left, right) => `${left.date}${left.startTime}`.localeCompare(`${right.date}${right.startTime}`));
    }));
  }

  ngAfterViewInit(): void {
    this.startCamera();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.stopCamera();
  }

  get selectedStaff(): StaffAccount | undefined {
    return this.attendanceStore.getSignedInStaff();
  }

  get selectedSchedule(): WorkSchedule | undefined {
    const selectedStaff = this.selectedStaff;
    if (!selectedStaff) {
      return undefined;
    }

    const today = this.appClock.todayKey();
    return this.schedules
      .filter(schedule => schedule.staffId === selectedStaff.id && schedule.date === today && schedule.status === 'scheduled')
      .sort((left, right) => left.startTime.localeCompare(right.startTime))[0];
  }

  get selectedOpenShift(): AttendanceLog | undefined {
    return this.selectedStaff ? this.attendanceStore.getOpenShiftForStaff(this.selectedStaff.id) : undefined;
  }

  get recentLogs(): AttendanceLog[] {
    const selectedStaff = this.selectedStaff;
    if (!selectedStaff) {
      return [];
    }

    return this.attendanceLogs.filter(log => log.staffId === selectedStaff.id).slice(0, 6);
  }

  get canSubmit(): boolean {
    return !!this.selectedStaff && !!this.selfieDataUrl;
  }

  async startCamera(): Promise<void> {
    this.setFeedback('info', '');
    this.selfieDataUrl = '';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setFeedback('error', 'camera is not supported in this browser. use upload selfie fallback.');
      this.isCameraLive = false;
      return;
    }

    this.stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      this.stream = stream;

      const video = this.videoElement?.nativeElement;
      if (!video) {
        this.stopCamera();
        this.setFeedback('error', 'camera preview element is unavailable. refresh and try again.');
        return;
      }

      video.srcObject = stream;
      await video.play();

      this.isCameraLive = true;
      this.setFeedback('success', 'camera ready. capture your selfie.');
    } catch (error) {
      const reason = (error as DOMException | undefined)?.name;
      if (reason === 'NotAllowedError' || reason === 'PermissionDeniedError') {
        this.setFeedback('error', 'camera permission was denied. allow access then retry.');
      } else if (reason === 'NotFoundError') {
        this.setFeedback('error', 'no camera device found on this machine.');
      } else {
        this.setFeedback('error', 'unable to start camera. use upload selfie fallback.');
      }
      this.isCameraLive = false;
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = undefined;
    }

    const video = this.videoElement?.nativeElement;
    if (video) {
      video.srcObject = null;
    }

    this.isCameraLive = false;
  }

  captureSelfie(): void {
    const video = this.videoElement?.nativeElement;
    const canvas = this.captureCanvas?.nativeElement;
    if (!video || !canvas || !this.isCameraLive) {
      this.setFeedback('error', 'camera is not ready.');
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      this.setFeedback('error', 'failed to capture selfie.');
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    this.selfieDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    this.setFeedback('success', 'selfie captured.');
  }

  clearSelfie(resetFeedback = false): void {
    this.selfieDataUrl = '';
    if (resetFeedback) {
      this.setFeedback('info', '');
    }
  }

  onSelfieUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.selfieDataUrl = String(reader.result || '');
      this.setFeedback('success', 'selfie uploaded.');
    };
    reader.readAsDataURL(file);
  }

  clockIn(): void {
    if (!this.selectedStaff) {
      this.setFeedback('error', 'sign in to your staff workspace before clocking in.');
      return;
    }

    const result = this.attendanceStore.clockIn(this.selectedStaff.id, this.selfieDataUrl);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);

    if (result.ok) {
      this.clearSelfie();
    }
  }

  clockOut(): void {
    if (!this.selectedStaff) {
      this.setFeedback('error', 'sign in to your staff workspace before clocking out.');
      return;
    }

    const result = this.attendanceStore.clockOut(this.selectedStaff.id, this.selfieDataUrl);
    this.setFeedback(result.ok ? 'success' : 'error', result.message);

    if (result.ok) {
      this.clearSelfie();
    }
  }

  private setFeedback(tone: 'success' | 'error' | 'info', message: string): void {
    this.feedbackTone = tone;
    this.feedback = message;
  }
}
