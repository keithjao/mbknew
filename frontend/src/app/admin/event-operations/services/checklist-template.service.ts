import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  ChecklistTemplate,
  ChecklistItem,
  deepCopyChecklistItem
} from '../models/checklist.models';
import { AppClockStore } from '../../../shared/testing/app-clock.store';
import { RemoteStateService } from '../../../shared/state/remote-state.service';

/**
 * Service for managing reusable checklist templates
 * Admins use this to create and maintain blueprint templates
 */
@Injectable({ providedIn: 'root' })
export class ChecklistTemplateService {
  private readonly remoteState = inject(RemoteStateService);
  private templates = new BehaviorSubject<ChecklistTemplate[]>([]);
  templates$ = this.templates.asObservable();

  constructor(private readonly appClock: AppClockStore) {
    this.loadTemplatesFromStorage();
  }

  /**
   * @deprecated Replaced by user-defined templates. Kept for reference only — NOT called.
   */
  private _unusedInitializeTemplates(): ChecklistTemplate[] {
    return [
      {
        id: 'tpl-1',
        name: 'Workshop Setup',
        description: 'Complete setup for matcha workshops and educational events',
        items: [
          {
            id: 'item-1',
            name: 'Chasen (Whisk)',
            category: 'Matcha Tools',
            quantityNeeded: 5,
            packed: false,
            notes: 'Bamboo whisks for grinding matcha'
          },
          {
            id: 'item-2',
            name: 'Matcha Bowls',
            category: 'Matcha Tools',
            quantityNeeded: 10,
            packed: false,
            notes: 'Ceramic or porcelain bowls'
          },
          {
            id: 'item-3',
            name: 'Sifters',
            category: 'Brewing Equipment',
            quantityNeeded: 3,
            packed: false
          },
          {
            id: 'item-4',
            name: 'Ceremonial Matcha',
            category: 'Ingredients',
            quantityNeeded: 2,
            packed: false,
            notes: 'Premium grade matcha powder'
          },
          {
            id: 'item-5',
            name: 'Oat Milk',
            category: 'Ingredients',
            quantityNeeded: 6,
            packed: false
          }
        ],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01')
      },
      {
        id: 'tpl-2',
        name: 'Weekend Popup',
        description: 'Lightweight setup for weekend popup markets',
        items: [
          {
            id: 'item-6',
            name: 'Portable Stand',
            category: 'Furniture',
            quantityNeeded: 1,
            packed: false
          },
          {
            id: 'item-7',
            name: 'Chasen',
            category: 'Matcha Tools',
            quantityNeeded: 3,
            packed: false
          },
          {
            id: 'item-8',
            name: 'Matcha Bowls',
            category: 'Matcha Tools',
            quantityNeeded: 6,
            packed: false
          },
          {
            id: 'item-9',
            name: 'Ceremonial Matcha',
            category: 'Ingredients',
            quantityNeeded: 1,
            packed: false
          },
          {
            id: 'item-10',
            name: 'Cups',
            category: 'Packaging',
            quantityNeeded: 50,
            packed: false
          }
        ],
        createdAt: new Date('2026-01-05'),
        updatedAt: new Date('2026-01-05')
      },
      {
        id: 'tpl-3',
        name: 'Full Matcha Bar Setup',
        description: 'Complete matcha bar for café operations and activations',
        items: [
          {
            id: 'item-11',
            name: 'Espresso Machine',
            category: 'Brewing Equipment',
            quantityNeeded: 1,
            packed: false
          },
          {
            id: 'item-12',
            name: 'Milk Frother',
            category: 'Brewing Equipment',
            quantityNeeded: 1,
            packed: false
          },
          {
            id: 'item-13',
            name: 'Matcha Bowls',
            category: 'Matcha Tools',
            quantityNeeded: 12,
            packed: false
          },
          {
            id: 'item-14',
            name: 'Chasen',
            category: 'Matcha Tools',
            quantityNeeded: 8,
            packed: false
          },
          {
            id: 'item-15',
            name: 'POS Terminal',
            category: 'POS Equipment',
            quantityNeeded: 1,
            packed: false
          },
          {
            id: 'item-16',
            name: 'Receipt Printer',
            category: 'POS Equipment',
            quantityNeeded: 1,
            packed: false
          },
          {
            id: 'item-17',
            name: 'Counter',
            category: 'Furniture',
            quantityNeeded: 1,
            packed: false
          },
          {
            id: 'item-18',
            name: 'Seating',
            category: 'Furniture',
            quantityNeeded: 4,
            packed: false
          }
        ],
        createdAt: new Date('2026-01-10'),
        updatedAt: new Date('2026-01-10')
      }
    ];
  }

  /**
   * Get all templates
   */
  getTemplates(): Observable<ChecklistTemplate[]> {
    return this.templates$;
  }

  /**
   * Get a single template by ID
   */
  getTemplateById(id: string): ChecklistTemplate | undefined {
    return this.templates.value.find(t => t.id === id);
  }

  /**
   * Create a new template
   */
  createTemplate(template: Omit<ChecklistTemplate, 'id' | 'createdAt' | 'updatedAt'>): ChecklistTemplate {
    const newTemplate: ChecklistTemplate = {
      ...template,
      id: `tpl-${Date.now()}`,
      createdAt: this.now(),
      updatedAt: this.now()
    };

    this.templates.next([...this.templates.value, newTemplate]);
    this.saveTemplatesToStorage();
    return newTemplate;
  }

  /**
   * Update an existing template
   */
  updateTemplate(id: string, updates: Partial<Omit<ChecklistTemplate, 'id' | 'createdAt'>>): ChecklistTemplate | undefined {
    let updated: ChecklistTemplate | undefined;
    const nextTemplates = this.templates.value.map(template => {
      if (template.id !== id) {
        return template;
      }

      updated = {
        ...template,
        ...updates,
        id: template.id,
        createdAt: template.createdAt,
        updatedAt: this.now()
      };

      return updated;
    });

    if (!updated) return undefined;

    this.templates.next(nextTemplates);
    this.saveTemplatesToStorage();
    return updated;
  }

  /**
   * Delete a template
   */
  deleteTemplate(id: string): boolean {
    const filtered = this.templates.value.filter(t => t.id !== id);
    if (filtered.length === this.templates.value.length) return false;

    this.templates.next(filtered);
    this.saveTemplatesToStorage();
    return true;
  }

  /**
   * Add an item to a template
   */
  addItemToTemplate(templateId: string, item: Omit<ChecklistItem, 'id' | 'createdAt' | 'updatedAt'>): ChecklistItem | undefined {
    const template = this.getTemplateById(templateId);
    if (!template) return undefined;

    const newItem: ChecklistItem = {
      ...item,
      id: `item-${Date.now()}`,
      createdAt: this.now(),
      updatedAt: this.now()
    };

    this.updateTemplate(templateId, { items: [...template.items, newItem] });
    return newItem;
  }

  /**
   * Remove an item from a template
   */
  removeItemFromTemplate(templateId: string, itemId: string): boolean {
    const template = this.getTemplateById(templateId);
    if (!template) return false;

    const nextItems = template.items.filter(i => i.id !== itemId);
    if (nextItems.length === template.items.length) return false;

    this.updateTemplate(templateId, { items: nextItems });
    return true;
  }

  /**
   * Save templates to localStorage
   */
  private saveTemplatesToStorage(): void {
    try {
      this.remoteState.setState('checklist_templates', this.templates.value);
    } catch (e) {
      console.error('Failed to save templates to storage:', e);
    }
  }

  /**
   * Load templates from localStorage
   */
  private loadTemplatesFromStorage(): void {
    try {
      const stored = this.remoteState.getState<Partial<ChecklistTemplate>[] | null>('checklist_templates', null);
      if (stored) {
        const normalized = Array.isArray(stored)
          ? stored.map(template => ({
              ...template,
              items: Array.isArray(template.items)
                ? template.items.map(item => ({
                    ...item,
                    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
                    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined
                  }))
                : [],
              createdAt: template.createdAt ? new Date(template.createdAt) : this.now(),
              updatedAt: template.updatedAt ? new Date(template.updatedAt) : this.now()
            })) as ChecklistTemplate[]
          : [];
        this.templates.next(normalized);
      }
    } catch (e) {
      console.error('Failed to load templates from storage:', e);
    }
  }

  private now(): Date {
    return new Date(this.appClock.now());
  }
}
