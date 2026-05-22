/**
 * Checklist Models for Event Operations
 * Supports both template-based and event-based checklists
 */

export type EventStatus = 'Planning' | 'Packing' | 'Ready' | 'Ongoing' | 'Completed';

export const CHECKLIST_CATEGORIES = [
  'Matcha Tools',
  'Brewing Equipment',
  'Ingredients',
  'Packaging',
  'POS Equipment',
  'Furniture',
  'Cleaning Supplies',
  'Merchandise',
  'Utilities',
  'Miscellaneous'
] as const;

export type ChecklistCategory = typeof CHECKLIST_CATEGORIES[number];

/**
 * Represents a single checklist item
 * Used in both templates and event checklists
 */
export interface ChecklistItem {
  id: string;
  name: string;
  category: ChecklistCategory;
  quantityNeeded: number;
  packed: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Represents a reusable checklist template
 * Admins create these as blueprints for events
 */
export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  items: ChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents an event with associated checklist
 * Uses a template as a starting point but maintains independent copy
 */
export interface EventOperation {
  id: string;
  name: string;
  venue: string;
  date: Date;
  time: string;
  notes?: string;
  status: EventStatus;
  templateId?: string; // Reference to the template used, if any
  templateName?: string; // Name of template for reference
  checklist: ChecklistItem[]; // Independent copy of checklist items
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Progress tracking for a checklist
 */
export interface ChecklistProgress {
  totalItems: number;
  packedItems: number;
  remainingItems: number;
  completionPercentage: number;
}

/**
 * Represents a deep copy operation result
 * Ensures templates remain unmodified when creating events
 */
export function deepCopyChecklistItem(item: ChecklistItem): ChecklistItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    quantityNeeded: item.quantityNeeded,
    packed: item.packed,
    notes: item.notes ? item.notes : undefined,
    createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
    updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined
  };
}

/**
 * Deep copy an entire template for event creation
 * Ensures the template remains unmodified when creating events
 */
export function deepCopyTemplate(template: ChecklistTemplate): ChecklistItem[] {
  return template.items.map(item => ({
    ...deepCopyChecklistItem(item),
    id: `${item.id}_${Date.now()}` // Generate unique IDs for event items
  }));
}
