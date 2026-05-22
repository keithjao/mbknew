import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReportsNavItem } from './models/report.models';
import { ReportsDataService } from './services/reports-data.service';

@Component({
  selector: 'app-reports-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './reports-layout.html',
  styleUrl: './reports-layout.scss'
})
export class ReportsLayout implements OnInit, OnDestroy {
  navItems: ReportsNavItem[] = [];
  loading = true;
  private readonly subscription = new Subscription();

  constructor(private readonly reportsData: ReportsDataService) {}

  ngOnInit(): void {
    this.subscription.add(this.reportsData.getVisibleNav().subscribe(items => {
      this.navItems = items;
      this.loading = false;
    }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
