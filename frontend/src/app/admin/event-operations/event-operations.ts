import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemplateManagement } from './components/template-management';
import { EventManagement } from './components/event-management';

@Component({
  selector: 'app-event-operations',
  standalone: true,
  imports: [CommonModule, TemplateManagement, EventManagement],
  templateUrl: './event-operations.html',
  styleUrl: './event-operations.scss'
})
export class EventOperations {
  activeTab: 'events' | 'templates' = 'events';
}
