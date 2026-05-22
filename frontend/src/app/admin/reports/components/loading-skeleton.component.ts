import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-report-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrap">
      <div class="row" *ngFor="let row of rowsArray">
        <span></span>
      </div>
    </div>
  `,
  styles: [
    `
    .skeleton-wrap {
      display: grid;
      gap: 0.55rem;
    }

    .row span {
      display: block;
      height: 2.7rem;
      border-radius: 0.8rem;
      background: linear-gradient(90deg, rgba(230, 228, 223, 0.7), rgba(245, 245, 243, 0.95), rgba(230, 228, 223, 0.7));
      background-size: 260% 100%;
      animation: pulse 1.2s ease infinite;
    }

    @keyframes pulse {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }
    `
  ]
})
export class LoadingSkeletonComponent {
  @Input() rows = 6;

  get rowsArray(): number[] {
    return Array.from({ length: this.rows }).map((_, index) => index);
  }
}
