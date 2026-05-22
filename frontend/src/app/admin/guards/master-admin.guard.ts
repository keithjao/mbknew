import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AttendanceStore } from '../../shared/attendance/attendance.store';

export const masterAdminGuard: CanMatchFn = () => {
  const attendanceStore = inject(AttendanceStore);
  const router = inject(Router);

  if (attendanceStore.isMasterAdminActive()) {
    return true;
  }

  return router.createUrlTree(['/admin/access']);
};