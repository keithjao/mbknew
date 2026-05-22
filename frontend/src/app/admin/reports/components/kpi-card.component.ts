import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { KpiCard } from '../models/report.models';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="kpi-card" [class.success]="card.tone === 'success'" [class.warning]="card.tone === 'warning'" [class.danger]="card.tone === 'danger'">
      <p class="label">{{ card.label }}</p>
      <p class="value">{{ card.value }}</p>
      <p class="delta" [class.up]="card.trend === 'up'" [class.down]="card.trend === 'down'" [class.flat]="card.trend === 'flat'">
        {{ card.delta }}
      </p>
    </article>
  `,
  styles: [
    `
    .kpi-card {
      border-radius: 1rem;
      border: 1px solid var(--line);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.72));
      padding: 1rem;
      min-height: 7rem;
      box-shadow: 0 8px 22px rgba(10, 20, 30, 0.06);
      transition: transform 150ms ease, box-shadow 150ms ease;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(10, 20, 30, 0.1);
    }

    .label {
      margin: 0 0 0.45rem;
      color: var(--ink-soft);
      font-size: 0.8rem;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .value {
      margin: 0 0 0.45rem;
      color: var(--ink);
      font-size: 1.35rem;
      font-weight: 650;
    }

    .delta {
      margin: 0;
      font-size: 0.83rem;
      font-weight: 600;
    }

    .delta.up { color: #1f8f5f; }
    .delta.down { color: #b84c4c; }
    .delta.flat { color: var(--ink-soft); }

    .kpi-card.success { border-color: rgba(31, 143, 95, 0.32); }
    .kpi-card.warning { border-color: rgba(180, 135, 40, 0.35); }
    .kpi-card.danger { border-color: rgba(184, 76, 76, 0.35); }
    `
  ]
})
export class KpiCardComponent {
  @Input({ required: true }) card!: KpiCard;
}
