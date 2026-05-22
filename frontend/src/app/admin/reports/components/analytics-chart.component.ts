import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AnalyticsChart } from '../models/report.models';

@Component({
  selector: 'app-analytics-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="chart-card">
      <header>
        <h3>{{ chart.title }}</h3>
        <p>{{ chart.subtitle }}</p>
      </header>

      <div class="bars" *ngIf="chart.series.length > 0; else empty">
        <div class="bar-item" *ngFor="let point of chart.series">
          <div class="bar-shell">
            <div class="bar-fill" [style.height.%]="toHeight(point.value)"></div>
          </div>
          <p class="bar-label">{{ point.label }}</p>
          <p class="bar-value">{{ point.value | number: '1.0-0' }}</p>
        </div>
      </div>

      <ng-template #empty>
        <p class="empty">No chart data available.</p>
      </ng-template>
    </article>
  `,
  styles: [
    `
    .chart-card {
      border: 1px solid var(--line);
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.85);
      box-shadow: 0 8px 22px rgba(10, 20, 30, 0.05);
      padding: 0.95rem;
      min-height: 18rem;
    }

    header h3 {
      margin: 0;
      font-size: 0.98rem;
    }

    header p {
      margin: 0.2rem 0 0.8rem;
      font-size: 0.82rem;
      color: var(--ink-soft);
    }

    .bars {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      align-items: end;
      gap: 0.55rem;
      min-height: 12rem;
    }

    .bar-item {
      display: grid;
      gap: 0.35rem;
      justify-items: center;
    }

    .bar-shell {
      width: 100%;
      max-width: 1.8rem;
      height: 8.8rem;
      border-radius: 999px;
      background: rgba(47, 93, 80, 0.1);
      display: flex;
      align-items: flex-end;
      overflow: hidden;
    }

    .bar-fill {
      width: 100%;
      background: linear-gradient(180deg, #5da88f 0%, #2f5d50 100%);
      border-radius: 999px;
      transition: height 300ms ease;
    }

    .bar-label {
      margin: 0;
      font-size: 0.74rem;
      color: var(--ink-soft);
    }

    .bar-value {
      margin: 0;
      font-size: 0.72rem;
      color: var(--ink);
      font-weight: 600;
    }

    .empty {
      margin: 0;
      color: var(--ink-soft);
      font-size: 0.85rem;
    }
    `
  ]
})
export class AnalyticsChartComponent {
  @Input({ required: true }) chart!: AnalyticsChart;

  toHeight(value: number): number {
    const max = Math.max(...this.chart.series.map(item => item.value), 1);
    return Math.max(5, (value / max) * 100);
  }
}
