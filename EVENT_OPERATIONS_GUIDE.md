# Event Operations - System Documentation

## Overview

The Event Operations feature is a complete system for managing matcha bar popup events, workshops, café activations, and market booths. It provides reusable checklist templates and event-specific customization while ensuring templates remain independent and unmodified.

## Core Concepts

### 1. **Checklist Templates**
Templates are reusable blueprints created by admins. They contain:
- Template name and description
- Categorized checklist items
- Default quantities

**Key Principle**: Templates are never modified by event usage. When an event uses a template, the items are **deep-copied**, creating an independent instance.

### 2. **Events**
Events are operational instances with:
- Event name, venue, date, time
- Status (Planning, Packing, Ready, Ongoing, Completed)
- Independent checklist (copied from template or custom)
- Notes

### 3. **Checklists**
Each event has its own checklist:
- Can be created from a template (automatic copy)
- Can be created from scratch (empty)
- Can be fully customized without affecting the template
- Support for add, edit, delete, and quantity changes

## Architecture

### Models (`models/checklist.models.ts`)
```typescript
// Core interfaces
ChecklistItem      // Individual item with category, quantity, notes
ChecklistTemplate  // Reusable template with name, description, items
EventOperation     // Event with independent checklist copy
EventStatus        // 'Planning' | 'Packing' | 'Ready' | 'Ongoing' | 'Completed'
ChecklistProgress  // Progress tracking stats

// Categories (10 predefined)
CHECKLIST_CATEGORIES = [
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
]

// Utility functions
deepCopyChecklistItem()  // Deep copy a single item
deepCopyTemplate()       // Deep copy all items from a template
```

### Services

#### `ChecklistTemplateService`
Manages reusable templates.

**Key Methods**:
- `getTemplates()` - Get all templates (Observable)
- `getTemplateById(id)` - Get single template
- `createTemplate(template)` - Create new template
- `updateTemplate(id, updates)` - Update template
- `deleteTemplate(id)` - Delete template
- `addItemToTemplate(templateId, item)` - Add item to template
- `removeItemFromTemplate(templateId, itemId)` - Remove item from template

**Storage**: Uses localStorage with key `'checklist_templates'`

#### `EventOperationService`
Manages events and their independent checklists.

**Key Methods**:
- `getEvents()` - Get all events (Observable)
- `getEventById(id)` - Get single event
- `createEvent(event, templateId?)` - Create event (optionally from template)
- `updateEvent(id, updates)` - Update event details
- `deleteEvent(id)` - Delete event
- `addChecklistItem(eventId, item)` - Add item to event checklist
- `updateChecklistItem(eventId, itemId, updates)` - Update item
- `removeChecklistItem(eventId, itemId)` - Remove item
- `toggleItemPacked(eventId, itemId)` - Toggle packed status
- `markCategoryAsPacked(eventId, category)` - Mark all items in category as packed
- `getChecklistProgress(eventId)` - Calculate progress stats
- `getChecklistByCategory(eventId)` - Group items by category
- `updateEventStatus(eventId, status)` - Change event status
- `getEventsByStatus(status)` - Filter events by status

**Storage**: Uses localStorage with key `'events'`

### Components

#### 1. **TemplateManagement** (`components/template-management.*`)
Manages checklist template creation and editing.

**Features**:
- List all templates
- Create new templates
- Edit template details
- Add/edit/delete items within templates
- View items grouped by category
- Display category color badges
- Form validation

**UI Layout**:
- Left sidebar: Template list with quick preview
- Right panel: Template details and item editor
- Responsive design for mobile

#### 2. **EventManagement** (`components/event-management.*`)
Manages event creation and event-level operations.

**Features**:
- List all events with status filtering
- Create new events (with optional template selection)
- Edit event details
- Delete events
- Change event status
- Quick access to event checklist editor
- Display event metadata (venue, date, time, template used)
- Event card previews with status badges

**UI Layout**:
- Left sidebar: Event list with status filtering
- Right panel: Event details and quick access
- Status buttons for quick status changes
- Responsive design

#### 3. **EventChecklistEditor** (`components/event-checklist-editor.*`)
Advanced editor for customizing event-specific checklists.

**Features**:
- **Progress Tracking**: Shows packed/remaining items and completion percentage
- **Category Management**: 
  - Filter by category
  - View category counts
  - Mark entire category as packed
- **Search & Sort**:
  - Search items by name or notes
  - Sort by category, name, or packed status
- **Item Operations**:
  - Add new items
  - Edit existing items
  - Delete items
  - Toggle packed status with checkbox
  - Add notes to items
- **Export & Print**:
  - Download checklist as CSV
  - Print checklist with current state
- **Real-time Updates**: Changes immediately reflected in progress stats

**UI Layout**:
- Left sidebar: Progress card, category filter, quick actions
- Right panel: Search/sort controls, item list
- Highly optimized for mobile packing workflow

#### 4. **EventOperations** (`event-operations.*`)
Main component with tab navigation.

**Features**:
- Tab-based navigation between Events and Templates
- Clean interface for switching contexts

## File Structure

```
frontend/src/app/admin/event-operations/
├── models/
│   └── checklist.models.ts          # Core interfaces and types
├── services/
│   ├── checklist-template.service.ts # Template CRUD
│   └── event-operation.service.ts    # Event & checklist CRUD
├── components/
│   ├── template-management.ts        # Template editor
│   ├── template-management.html
│   ├── template-management.scss
│   ├── event-management.ts           # Event manager
│   ├── event-management.html
│   ├── event-management.scss
│   ├── event-checklist-editor.ts     # Checklist customizer
│   ├── event-checklist-editor.html
│   └── event-checklist-editor.scss
├── event-operations.ts               # Main component
├── event-operations.html
└── event-operations.scss
```

## Data Flow

### Creating an Event from a Template

```
1. User selects template when creating event
   ↓
2. EventOperationService.createEvent(event, templateId)
   ↓
3. deepCopyTemplate(template) creates independent copy
   ↓
4. New event created with copied items
   ↓
5. Original template remains unchanged
```

### Modifying Event Checklist

```
1. User opens event checklist editor
   ↓
2. User adds/edits/deletes items
   ↓
3. EventOperationService updates event.checklist
   ↓
4. Changes saved to localStorage
   ↓
5. Template unaffected
```

## Key Design Principles

### 1. **Template Independence**
- Checklist items are **deep-copied** when creating events
- Each item gets a unique ID in the event
- Template modifications don't affect existing events
- Event modifications don't affect templates

### 2. **Mobile-First Workflow**
- Minimal clicks for packing operations
- Large touch targets
- Quick visual scanning
- Fast category marking
- Offline localStorage persistence

### 3. **Scalability**
- Modular service architecture ready for API integration
- Mock-first data approach (localStorage)
- Easy to migrate to backend storage
- Clean separation of concerns

## Future Enhancement Points

The system is designed to support future features:

1. **Backend API Integration**
   - Replace localStorage with API calls
   - Services already have abstraction layer
   - No component changes needed

2. **Inventory Allocation**
   - Link checklist items to master inventory
   - Auto-deduct on event completion
   - Track inventory per event

3. **QR/Barcode Scanning**
   - Add scanner component
   - Quick item validation
   - Batch packing workflows

4. **Staff Assignments**
   - Assign staff to items/categories
   - Responsibility tracking
   - Progress notifications

5. **Return Tracking**
   - Track returned items
   - Damage reports
   - Inventory reconciliation

6. **Offline Mode**
   - Sync when back online
   - Conflict resolution
   - Service worker integration

7. **Analytics & Reporting**
   - Event packing time analytics
   - Item frequency reports
   - Staff performance metrics
   - Cost tracking per event

## Default Templates

The system includes 3 pre-configured templates:

### 1. Workshop Setup
For matcha workshops and educational events
- Chasen (Whisk) × 5
- Matcha Bowls × 10
- Sifters × 3
- Ceremonial Matcha × 2
- Oat Milk × 6

### 2. Weekend Popup
Lightweight setup for weekend markets
- Portable Stand × 1
- Chasen × 3
- Matcha Bowls × 6
- Ceremonial Matcha × 1
- Cups × 50

### 3. Full Matcha Bar Setup
Complete bar for café operations
- Espresso Machine × 1
- Milk Frother × 1
- Matcha Bowls × 12
- Chasen × 8
- POS Terminal × 1
- Receipt Printer × 1
- Counter × 1
- Seating × 4

## Styling & Theme

The component uses:
- **Primary Color**: #8B7355 (warm brown - matcha/café theme)
- **Accent Colors**: 
  - Progress: #2ECC71 (green)
  - Status badges: various colors per status
  - Category badges: unique color per category
- **Responsive**: Mobile-first, adapts to tablets and desktops
- **Dark mode ready**: CSS variables can be added for theme switching

## Usage Examples

### Creating a New Event from Template

1. Navigate to Event Operations → Events tab
2. Click "+ New Event"
3. Fill in event details (name, venue, date, time)
4. Select "Workshop Setup" template
5. Click "Create Event"
6. Template items are copied as independent checklist

### Customizing Event Checklist

1. From event details, click "Open Checklist"
2. Add new items: "+ Add Item"
3. Edit items: Click "Edit" on any item
4. Delete items: Click "Delete" on any item
5. Change quantities: Edit and update
6. Mark as packed: Click checkbox
7. Mark category complete: Select category → "Mark Complete"
8. Search/filter: Use search box and category filter
9. Export: "Download CSV" or "Print"

### Managing Templates

1. Navigate to Event Operations → Templates tab
2. Create new template: "+ New Template"
3. Add items to template: "+ Add Item"
4. Edit template: Select template → "Edit"
5. Delete items from template: Select template → "Delete" on item

## LocalStorage Keys

- `'checklist_templates'` - Array of ChecklistTemplate objects
- `'events'` - Array of EventOperation objects

**Note**: Both are JSON-serialized and can be easily migrated to a backend database.

## Browser Compatibility

- Modern browsers with:
  - ES2020+ support
  - localStorage support
  - CSS Grid support
  - CSS custom properties support

---

For questions or future enhancements, refer to this documentation and the inline code comments throughout the components and services.
