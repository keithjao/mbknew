import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AttendanceStore, StaffAppFeature } from '../../shared/attendance/attendance.store';

export const staffFeatureGuard: CanActivateFn = route => {
  const attendanceStore = inject(AttendanceStore);
  const router = inject(Router);
  const feature = route.data?.['feature'] as StaffAppFeature | undefined;

  if (attendanceStore.canAccessAdminRoute()) {
    return true;
  }

  if (!attendanceStore.hasSignedInStaffSession()) {
    return router.createUrlTree(['/admin/access']);
  }

  if (attendanceStore.isSignedInStaffPasswordChangeRequired()) {
    return router.createUrlTree(['/admin/access']);
  }

  if (!feature || attendanceStore.canAccessFeature(feature)) {
    return true;
  }

  return router.createUrlTree(['/admin/pos']);
};
