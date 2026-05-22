import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventOperationService } from '../services/event-operation.service';
import { ChecklistTemplateService } from '../services/checklist-template.service';
import { EventOperation, EventStatus, ChecklistTemplate } from '../models/checklist.models';
import { EventChecklistEditor } from './event-checklist-editor';

@Component({
  selector: 'app-event-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, EventChecklistEditor],
  templateUrl: './event-management.html',
  styleUrl: './event-management.scss'
})
export class EventManagement implements OnInit {
  events: EventOperation[] = [];
  templates: ChecklistTemplate[] = [];
  selectedEvent: EventOperation | null = null;
  showForm = false;
  showChecklist = false;

  eventForm!: FormGroup;
  selectedTemplateId: string | null = null;

  eventStatuses: EventStatus[] = ['Planning', 'Packing', 'Ready', 'Ongoing', 'Completed'];
  filterStatus: EventStatus | 'All' = 'All';

  constructor(
    private eventService: EventOperationService,
    private templateService: ChecklistTemplateService,
    private fb: FormBuilder
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.eventService.getEvents().subscribe((events: EventOperation[]) => {
      this.events = events;
    });

    this.templateService.getTemplates().subscribe((templates: ChecklistTemplate[]) => {
      this.templates = templates;
    });
  }

  private initializeForm(): void {
    this.eventForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      venue: ['', Validators.required],
      date: ['', Validators.required],
      time: ['', Validators.required],
      notes: [''],
      status: ['Planning', Validators.required]
    });
  }

  get filteredEvents(): EventOperation[] {
    if (this.filterStatus === 'All') return this.events;
    return this.events.filter(e => e.status === this.filterStatus);
  }

  createNewEvent(): void {
    this.selectedEvent = null;
    this.showForm = true;
    this.showChecklist = false;
    this.selectedTemplateId = null;
    this.eventForm.reset({ status: 'Planning' });
  }

  selectEvent(event: EventOperation): void {
    this.selectedEvent = event;
    this.showForm = false;
    this.showChecklist = false;
  }

  editEvent(): void {
    if (!this.selectedEvent) return;
    this.eventForm.patchValue({
      name: this.selectedEvent.name,
      venue: this.selectedEvent.venue,
      date: this.selectedEvent.date,
      time: this.selectedEvent.time,
      notes: this.selectedEvent.notes,
      status: this.selectedEvent.status
    });
    this.showForm = true;
  }

  saveEvent(): void {
    if (this.eventForm.invalid) return;

    const formValue = this.eventForm.value;

    if (this.selectedEvent) {
      // Update existing event
      this.eventService.updateEvent(this.selectedEvent.id, {
        name: formValue.name,
        venue: formValue.venue,
        date: new Date(formValue.date),
        time: formValue.time,
        notes: formValue.notes,
        status: formValue.status
      });
    } else {
      // Create new event
      const templateId = this.selectedTemplateId || undefined;
      this.eventService.createEvent(
        {
          name: formValue.name,
          venue: formValue.venue,
          date: new Date(formValue.date),
          time: formValue.time,
          notes: formValue.notes,
          status: formValue.status
        },
        templateId
      );
    }

    this.showForm = false;
    this.eventForm.reset({ status: 'Planning' });
    this.selectedTemplateId = null;
  }

  cancelEdit(): void {
    this.showForm = false;
    this.eventForm.reset({ status: 'Planning' });
    this.selectedTemplateId = null;
  }

  deleteEvent(event: EventOperation): void {
    if (confirm(`Delete event "${event.name}"? This cannot be undone.`)) {
      this.eventService.deleteEvent(event.id);
      if (this.selectedEvent?.id === event.id) {
        this.selectedEvent = null;
      }
    }
  }

  openChecklist(): void {
    if (this.selectedEvent) {
      this.showChecklist = true;
      this.showForm = false;
    }
  }

  closeChecklist(): void {
    this.showChecklist = false;
  }

  updateEventStatus(status: EventStatus): void {
    if (this.selectedEvent) {
      this.eventService.updateEventStatus(this.selectedEvent.id, status);
    }
  }

  getStatusColor(status: EventStatus): string {
    const colors: { [key in EventStatus]: string } = {
      'Planning': '#3498DB',
      'Packing': '#F39C12',
      'Ready': '#2ECC71',
      'Ongoing': '#9B59B6',
      'Completed': '#1ABC9C'
    };
    return colors[status];
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
