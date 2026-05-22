import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  EventOperation,
  EventStatus,
  ChecklistItem,
  ChecklistProgress,
  deepCopyTemplate
} from '../models/checklist.models';
import { ChecklistTemplateService } from './checklist-template.service';
import { AppClockStore } from '../../../shared/testing/app-clock.store';
import { RemoteStateService } from '../../../shared/state/remote-state.service';

/**
 * Service for managing events and their checklists
 * Handles event CRUD operations and ensures template independence
 */
@Injectable({ providedIn: 'root' })
export class EventOperationService {
  private readonly remoteState = inject(RemoteStateService);
  private events = new BehaviorSubject<EventOperation[]>([]);
  events$ = this.events.asObservable();

  constructor(
    private templateService: ChecklistTemplateService,
    private readonly appClock: AppClockStore
  ) {
    this.loadEventsFromStorage();
  }

  /**
   * Get all events
   */
  getEvents(): Observable<EventOperation[]> {
    return this.events$;
  }

  /**
   * Get a single event by ID
   */
  getEventById(id: string): EventOperation | undefined {
    return this.events.value.find(e => e.id === id);
  }

  /**
   * Create a new event
   * If templateId is provided, copies items from template (deep copy)
   */
  createEvent(
    event: Omit<EventOperation, 'id' | 'checklist' | 'createdAt' | 'updatedAt'>,
    templateId?: string
  ): EventOperation {
    let checklist: ChecklistItem[] = [];

    if (templateId) {
      const template = this.templateService.getTemplateById(templateId);
      if (template) {
        checklist = deepCopyTemplate(template);
      }
    }

    const newEvent: EventOperation = {
      ...event,
      id: `event-${Date.now()}`,
      checklist,
      createdAt: this.now(),
      updatedAt: this.now()
    };

    this.events.next([...this.events.value, newEvent]);
    this.saveEventsToStorage();
    return newEvent;
  }

  /**
   * Update event details (name, venue, date, time, notes, status)
   */
  updateEvent(id: string, updates: Partial<Omit<EventOperation, 'id' | 'checklist' | 'createdAt'>>): EventOperation | undefined {
    let updated: EventOperation | undefined;
    const nextEvents = this.events.value.map(event => {
      if (event.id !== id) {
        return event;
      }

      updated = {
        ...event,
        ...updates,
        id: event.id,
        createdAt: event.createdAt,
        updatedAt: this.now()
      };

      return updated;
    });

    if (!updated) return undefined;

    this.events.next(nextEvents);
    this.saveEventsToStorage();
    return updated;
  }

  /**
   * Delete an event
   */
  deleteEvent(id: string): boolean {
    const filtered = this.events.value.filter(e => e.id !== id);
    if (filtered.length === this.events.value.length) return false;

    this.events.next(filtered);
    this.saveEventsToStorage();
    return true;
  }

  /**
   * Add an item to an event's checklist
   */
  addChecklistItem(eventId: string, item: Omit<ChecklistItem, 'id' | 'createdAt' | 'updatedAt'>): ChecklistItem | undefined {
    const event = this.getEventById(eventId);
    if (!event) return undefined;

    const newItem: ChecklistItem = {
      ...item,
      id: `item-${Date.now()}`,
      createdAt: this.now(),
      updatedAt: this.now()
    };

    this.updateEventChecklist(eventId, [...event.checklist, newItem]);
    return newItem;
  }

  /**
   * Update a checklist item in an event
   */
  updateChecklistItem(eventId: string, itemId: string, updates: Partial<Omit<ChecklistItem, 'id' | 'createdAt'>>): ChecklistItem | undefined {
    const event = this.getEventById(eventId);
    if (!event) return undefined;

    const itemIndex = event.checklist.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return undefined;

    const updated = {
      ...event.checklist[itemIndex],
      ...updates,
      id: event.checklist[itemIndex].id,
      createdAt: event.checklist[itemIndex].createdAt,
      updatedAt: this.now()
    };

    const nextChecklist = event.checklist.map((existingItem, index) =>
      index === itemIndex ? updated : existingItem
    );
    this.updateEventChecklist(eventId, nextChecklist);
    return updated;
  }

  /**
   * Remove a checklist item from an event
   */
  removeChecklistItem(eventId: string, itemId: string): boolean {
    const event = this.getEventById(eventId);
    if (!event) return false;

    const initialLength = event.checklist.length;
    event.checklist = event.checklist.filter(i => i.id !== itemId);

    if (event.checklist.length === initialLength) return false;

    this.updateEventChecklist(eventId, event.checklist);
    return true;
  }

  /**
   * Update the entire checklist for an event
   * Used internally to ensure consistency
   */
  private updateEventChecklist(eventId: string, checklist: ChecklistItem[]): void {
    const event = this.getEventById(eventId);
    if (event) {
      const nextEvents = this.events.value.map(existingEvent =>
        existingEvent.id === eventId
          ? { ...existingEvent, checklist, updatedAt: this.now() }
          : existingEvent
      );

      this.events.next(nextEvents);
      this.saveEventsToStorage();
    }
  }

  /**
   * Toggle packed status for a checklist item
   */
  toggleItemPacked(eventId: string, itemId: string): boolean {
    const event = this.getEventById(eventId);
    if (!event) return false;

    let didUpdate = false;
    const nextChecklist = event.checklist.map(item => {
      if (item.id !== itemId) {
        return item;
      }

      didUpdate = true;
      return { ...item, packed: !item.packed, updatedAt: this.now() };
    });

    if (!didUpdate) return false;

    this.updateEventChecklist(eventId, nextChecklist);
    return true;
  }

  /**
   * Mark all items in a category as packed
   */
  markCategoryAsPacked(eventId: string, category: string): boolean {
    const event = this.getEventById(eventId);
    if (!event) return false;

    let didUpdate = false;
    const nextChecklist = event.checklist.map(item => {
      if (item.category !== category) {
        return item;
      }

      didUpdate = true;
      return { ...item, packed: true, updatedAt: this.now() };
    });

    if (!didUpdate) return false;

    this.updateEventChecklist(eventId, nextChecklist);
    return true;
  }

  /**
   * Calculate progress for an event
   */
  getChecklistProgress(eventId: string): ChecklistProgress | undefined {
    const event = this.getEventById(eventId);
    if (!event) return undefined;

    const totalItems = event.checklist.length;
    const packedItems = event.checklist.filter(i => i.packed).length;
    const remainingItems = totalItems - packedItems;
    const completionPercentage = totalItems === 0 ? 0 : Math.round((packedItems / totalItems) * 100);

    return {
      totalItems,
      packedItems,
      remainingItems,
      completionPercentage
    };
  }

  /**
   * Get checklist items grouped by category
   */
  getChecklistByCategory(eventId: string): Map<string, ChecklistItem[]> | undefined {
    const event = this.getEventById(eventId);
    if (!event) return undefined;

    const grouped = new Map<string, ChecklistItem[]>();
    event.checklist.forEach(item => {
      if (!grouped.has(item.category)) {
        grouped.set(item.category, []);
      }
      grouped.get(item.category)!.push(item);
    });

    return grouped;
  }

  /**
   * Update event status
   */
  updateEventStatus(eventId: string, status: EventStatus): EventOperation | undefined {
    return this.updateEvent(eventId, { status });
  }

  /**
   * Get events by status
   */
  getEventsByStatus(status: EventStatus): EventOperation[] {
    return this.events.value.filter(e => e.status === status);
  }

  /**
   * Save events to localStorage
   */
  private saveEventsToStorage(): void {
    try {
      this.remoteState.setState('events', this.events.value);
    } catch (e) {
      console.error('Failed to save events to storage:', e);
    }
  }

  /**
   * Load events from localStorage
   */
  private loadEventsFromStorage(): void {
    try {
      const stored = this.remoteState.getState<Partial<EventOperation>[] | null>('events', null);
      if (stored) {
        const normalized = Array.isArray(stored)
          ? stored.map(event => ({
              ...event,
              date: event.date ? new Date(event.date) : this.now(),
              createdAt: event.createdAt ? new Date(event.createdAt) : this.now(),
              updatedAt: event.updatedAt ? new Date(event.updatedAt) : this.now(),
              checklist: Array.isArray(event.checklist)
                ? event.checklist.map(item => ({
                    ...item,
                    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
                    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined
                  }))
                : []
            })) as EventOperation[]
          : [];
        this.events.next(normalized);
      }
    } catch (e) {
      console.error('Failed to load events from storage:', e);
    }
  }

  private now(): Date {
    return new Date(this.appClock.now());
  }
}
