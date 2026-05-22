import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-export-dropdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="export-wrap">
      <button type="button" class="trigger" (click)="open = !open">Export</button>
      <div class="menu" *ngIf="open">
        <button type="button" (click)="pick('csv')">CSV</button>
        <button type="button" (click)="pick('excel')">Excel</button>
        <button type="button" (click)="pick('pdf')">PDF</button>
      </div>
    </div>
  `,
  styles: [
    `
    .export-wrap {
      position: relative;
    }

    .trigger {
      border: 1px solid var(--line);
      border-radius: 0.6rem;
      background: #fff;
      color: var(--ink-soft);
      padding: 0.45rem 0.8rem;
      cursor: pointer;
    }

    .menu {
      position: absolute;
      right: 0;
      top: calc(100% + 0.4rem);
      border: 1px solid var(--line);
      border-radius: 0.7rem;
      background: #fff;
      min-width: 8rem;
      box-shadow: 0 10px 28px rgba(10, 20, 30, 0.08);
      z-index: 10;
      overflow: hidden;
    }

    .menu button {
      width: 100%;
      border: 0;
      border-bottom: 1px solid rgba(26, 26, 26, 0.05);
      background: #fff;
      color: var(--ink-soft);
      padding: 0.5rem 0.7rem;
      cursor: pointer;
      text-align: left;
    }

    .menu button:last-child {
      border-bottom: 0;
    }

    .menu button:hover {
      background: rgba(47, 93, 80, 0.08);
      color: var(--ink);
    }
    `
  ]
})
export class ExportDropdownComponent {
  open = false;

  @Output() exportType = new EventEmitter<'csv' | 'excel' | 'pdf'>();

  pick(type: 'csv' | 'excel' | 'pdf'): void {
    this.exportType.emit(type);
    this.open = false;
  }
}
