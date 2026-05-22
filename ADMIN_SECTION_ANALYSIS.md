# Admin Section Codebase Analysis
*Generated: May 15, 2026*

## Executive Summary

The MBK 4.0 admin section is a comprehensive Angular 21+ standalone component system managing inventory, POS operations, event management, and financial tracking. The system is well-structured with clear separation of concerns using RxJS-based stores for state management.

---

## 1. ADMIN COMPONENTS & PURPOSES

### Core Layout
**[admin-layout.ts](frontend/src/app/admin/admin-layout.ts)** - Master Container
- Standalone component wrapping all admin routes
- Provides RouterOutlet for nested routing
- Single-level layout without nested layout complexity

### Main Admin Sections (9 Components)

#### 1.1 **Master Inventory** - [master-inventory.ts](frontend/src/app/admin/master-inventory/master-inventory.ts)
- **Purpose**: Central inventory management for all ingredients/supplies
- **Features**:
  - Add new inventory items with name, quantity, unit (ml/grams/piece), unit cost
  - Track inventory by item and unit type
  - Adjust stock (add/deduct quantities)
  - Delete inventory items
  - Integration with finance store to track spending
  - Session-based audit logging
- **State**: Fully implemented
- **Data Source**: `AdminInventoryStore`, `FinanceStore`, `InventorySessionStore`

#### 1.2 **Menu Builder** - [menu-builder.ts](frontend/src/app/admin/menu-builder/menu-builder.ts)
- **Purpose**: Create and manage menu items with ingredient recipes
- **Features**:
  - Add/edit menu items (name, category, price, notes)
  - Define menu ingredients from master inventory (with amounts)
  - Manage menu categories (matcha, hojicha, coffee, refreshers)
  - Set ingredient requirements per menu item
  - Track item availability
- **State**: Fully implemented
- **Data Source**: `AdminInventoryStore`

#### 1.3 **Menu Admin** - [menu-admin.ts](frontend/src/app/admin/menu-admin/menu-admin.ts)
- **Purpose**: Manage menu item availability and lifecycle
- **Features**:
  - View all defined menu items
  - Toggle item availability (enable/disable for POS)
  - Delete menu items
  - Display menu item details (category, price, notes)
- **State**: Fully implemented
- **Data Source**: `AdminInventoryStore`

#### 1.4 **Store Inventory** - [store-inventory.ts](frontend/src/app/admin/store-inventory/store-inventory.ts)
- **Purpose**: Manage daily store operation inventory sessions
- **Features**:
  - Pull inventory from master for store operations
  - Open/close store inventory sessions
  - Add additional inventory during operation
  - Track inventory deductions via POS
  - View audit logs of all transactions
  - Multiple tabs: overview, pull, logs
- **State**: Fully implemented
- **Data Source**: `InventoryOperationsStore`, `AdminInventoryStore`
- **Pattern**: Operation-based (one per day per type)

#### 1.5 **Event Inventory** - [event-inventory.ts](frontend/src/app/admin/event-inventory/event-inventory.ts)
- **Purpose**: Manage event-specific inventory sessions
- **Features**: Same as Store Inventory but for 'event' operation type
- **State**: Fully implemented
- **Data Source**: `InventoryOperationsStore`, `AdminInventoryStore`

#### 1.6 **Popup Inventory** - [popup-inventory.ts](frontend/src/app/admin/popup-inventory/popup-inventory.ts)
- **Purpose**: Manage pop-up shop inventory sessions
- **Features**: Same as Store Inventory but for 'popup' operation type
- **State**: Fully implemented
- **Data Source**: `InventoryOperationsStore`, `AdminInventoryStore`

#### 1.7 **Finance** - [finance.ts](frontend/src/app/admin/finance/finance.ts)
- **Purpose**: Track revenue, expenses, and business financials
- **Features**:
  - Record sales transactions (from POS)
  - Track spending (inventory purchases)
  - Filter entries by period (week, month, all)
  - Calculate totals: revenue, expenses, net profit
  - Add manual finance entries
  - Entry categories (pos, inventory, etc.)
- **State**: Fully implemented
- **Data Source**: `FinanceStore`

#### 1.8 **HR** - [hr.ts](frontend/src/app/admin/hr/hr.ts)
- **Purpose**: Track employee attendance logs
- **Features**:
  - Display attendance logs with timestamps
  - Employee clock-in/out records
  - Simple display component (read-only)
- **State**: Implemented (read-only view)
- **Data Source**: `AttendanceStore` (from shared)

#### 1.9 **POS System** - [pos.ts](frontend/src/app/admin/pos/pos.ts)
- **Purpose**: Complete point-of-sale system for sales transactions
- **Features**: See detailed POS analysis below
- **State**: Fully implemented
- **Data Source**: Multiple stores (inventory, operations, loyalty, finance)

#### 1.10 **Event Operations** - [event-operations.ts](frontend/src/app/admin/event-operations/event-operations.ts)
- **Purpose**: Manage event planning and preparation checklists
- **Features**:
  - Two-tab interface: Events and Templates
  - Create/manage events with checklist support
  - Create reusable checklist templates
  - Track event status (Planning → Packing → Ready → Ongoing → Completed)
  - Checklist categories (tools, ingredients, equipment, etc.)
- **State**: Fully implemented with comprehensive services
- **Data Source**: `EventOperationService`, `ChecklistTemplateService`
- **Subcomponents**: EventManagement, TemplateManagement

#### 1.11 **Reports** (Not in admin but nearby)
- **Purpose**: Business analytics and reporting
- **Features**: Dashboard, KPI cards, charts, export functionality
- **State**: Implemented with multiple pages and services

---

## 2. POS COMPONENT ANALYSIS

### Current Structure
**File**: [frontend/src/app/admin/pos/pos.ts](frontend/src/app/admin/pos/pos.ts)

### Core Features Implemented

#### 2.1 Inventory Source Selection
```
Dropdown: Store | Popup | Event
- Determines which operation's inventory is deducted
- Controls stock availability for order
```

#### 2.2 Menu Display
- Displays all available menu items in grid layout
- Shows: Name, Category, Price, Notes, Availability Status
- Items disabled if not available
- Items sync from `AdminInventoryStore`

#### 2.3 Current Order Management
- Add items from menu
- Set per-item discounts: 0%, 10%, 20%, 50%
- Remove items from order
- Real-time total calculation
- Order state: `PosOrderItem[]`

#### 2.4 Queue Board Implementation
```typescript
interface PosQueueItem {
  id: number;
  source: 'store' | 'popup' | 'event';
  summary: string;              // "N item(s)"
  total: number;
  status: 'queued' | 'preparing' | 'completed';
  createdAt: string;
}
```

**Features**:
- Queue stores up to 30 most recent orders
- Status transitions: queued → preparing → completed
- Display with source origin and total amount
- Button-based status management

#### 2.5 Inventory Deduction System
- Validates operation exists for selected source
- Checks ingredient availability from operation items
- Deducts exact amounts per menu item ingredients
- Records deductions as audit logs

#### 2.6 Loyalty Integration
- QR code scanner component (placeholder)
- Link customers by scanning QR
- Award points: 1 point per ₱100 spent
- Display linked customer name and points

#### 2.7 Financial Integration
- Records each completed order as 'sale' in FinanceStore
- Includes detailed description: source, item count
- Supports loyalty rewards point allocation

### Data Flow
```
Menu Item Selected
  ↓
Add to Order (PosOrderItem)
  ↓
Set Discount (per item)
  ↓
Calculate Total
  ↓
Checkout
  ├─ Validate operation exists
  ├─ Check inventory availability
  ├─ Deduct from operation items
  ├─ Create queue item
  ├─ Record sale in finance
  └─ Award loyalty points (if applicable)
```

### Current Issues & TODOs

#### 🔴 Critical Gap - Queue Board Status Updates
**Problem**: `updateQueueStatus()` method exists but is never called
- Buttons in template reference `updateQueueStatus(queued.id, 'preparing')`
- Method mutates local state only
- No persistence to storage
- No notification system

**Missing**:
- Queue board persistence to storage
- Backend API integration for status updates
- Real-time status change notifications
- Historical queue tracking

#### 🟡 Incomplete Features

1. **QR Scanner Implementation**
   - [qr-scanner.ts](frontend/src/app/admin/pos/qr-scanner.ts) is a stub
   - TODO: Implement real QR scanning using `@zxing/browser`
   - Only has close button, no actual scanning logic
   - Video element exists but unused

2. **Loyalty System**
   - [loyalty.store.ts](frontend/src/app/admin/data/loyalty.store.ts) has TODO
   - `fetchCustomerByQr()` not connected to backend
   - No real customer database
   - Points awarded locally only

3. **Order History**
   - No persistence of completed orders beyond current session
   - Queue board resets on page reload
   - No historical order tracking

---

## 3. QUEUE/BOARD RELATED CODE

### Current Implementation

#### Queue Data Structure (POS)
- **Location**: [pos.ts](frontend/src/app/admin/pos/pos.ts#L21-L27)
- **Type**: `PosQueueItem[]`
- **Status Field**: 'queued' | 'preparing' | 'completed'
- **Capacity**: Max 30 items (slice(0, 30))
- **Storage**: In-memory only (component state)

#### Queue Display (HTML)
- **Location**: [pos.html](frontend/src/app/admin/pos/pos.html#L62-L77)
- **UI**: `<section class="queue-board">`
- Shows: Summary, Total, Source, Status
- Buttons: "preparing", "completed"
- Empty state handling

#### Status Management Method
```typescript
updateQueueStatus(id: number, status: PosQueueItem['status']): void {
  this.orderQueue = this.orderQueue.map(item =>
    item.id === id ? { ...item, status } : item
  );
}
```

**Current State**: ✅ Local state updating works
**Missing**: ❌ No persistence, no backend sync

#### Queue Board Styling
- **File**: [pos.scss](frontend/src/app/admin/pos/pos.scss)
- **Classes**: `.queue-board`, `.order-board`
- Clean list display with status indicators

### Related Board/Event Components

#### Event Operations Checklist Board
- **Files**: [event-management.ts](frontend/src/app/admin/event-operations/components/event-management.ts)
- **Features**: 
  - Event status tracking (Planning → Packing → Ready → Ongoing → Completed)
  - Checklist items with packed status
  - Template-based event creation
  - Not a queue, but similar status workflow

#### Store/Event/Popup Inventory Boards
- Similar operational status tracking
- Open/close operations
- Tab-based views (overview, pull, logs)
- Session-based (not queue-based)

### Data Stores Involved

#### Primary Stores
1. **[admin-inventory.store.ts](frontend/src/app/admin/data/admin-inventory.store.ts)** - Menu & inventory data
2. **[inventory-operations.store.ts](frontend/src/app/admin/data/inventory-operations.store.ts)** - Operation sessions
3. **[finance.store.ts](frontend/src/app/admin/data/finance.store.ts)** - Financial records
4. **[loyalty.store.ts](frontend/src/app/admin/data/loyalty.store.ts)** - Customer loyalty data

#### Supporting Services
- **ChecklistTemplateService** - Template management
- **EventOperationService** - Event CRUD
- **InventorySessionStore** - Session audit logs
- **AttendanceStore** (shared) - Employee attendance

---

## 4. COMPONENT STATUS & COMPLETENESS

### ✅ Fully Implemented (8/11)

| Component | Status | Features | Notes |
|-----------|--------|----------|-------|
| Master Inventory | ✅ | Add, edit, delete, adjust stock | Fully functional |
| Menu Builder | ✅ | Create items, define ingredients | Fully functional |
| Menu Admin | ✅ | Manage availability | Simple but complete |
| Store Inventory | ✅ | Operations management | Session-based |
| Event Inventory | ✅ | Operations management | Session-based |
| Popup Inventory | ✅ | Operations management | Session-based |
| Finance | ✅ | Sales, spending tracking | Full reporting |
| Event Operations | ✅ | Events, templates, checklists | Comprehensive |
| Reports | ✅ | Dashboard, KPIs, exports | Multiple pages |

### 🟡 Partially Implemented (2/11)

| Component | Status | What Works | What's Missing |
|-----------|--------|-----------|-----------------|
| POS | 🟡 | Menu display, order creation, queue board UI | Queue persistence, QR scanning, backend sync |
| HR | 🟡 | Display attendance | No UI for clock-in/out, reporting |

### 🔴 Incomplete (1/11)

| Component | Status | Issue |
|-----------|--------|-------|
| QR Scanner | 🔴 | Only placeholder, needs @zxing library |

---

## 5. KEY FINDINGS

### Strengths ✅

1. **Well-Organized State Management**
   - RxJS BehaviorSubjects for all data
   - LocalStorage persistence for most data
   - Observable-based reactive patterns
   - Clean service injection

2. **Comprehensive Inventory System**
   - Master inventory with units (ml, grams, pieces)
   - Operation sessions for different sales channels
   - Audit logging of all transactions
   - Cost tracking per item

3. **Event Management**
   - Template-based checklist system
   - Deep copy prevents template mutation
   - Multiple event statuses
   - Category-based organization

4. **Financial Tracking**
   - Automatic sale recording from POS
   - Spending tracking from inventory
   - Period-based filtering (week, month, all)
   - Net profit calculations

5. **Modular Component Design**
   - Each section is standalone
   - Clean separation of concerns
   - Reusable stores and services
   - Responsive HTML templates

### Gaps & Issues ❌

1. **Queue Board Not Persistent**
   - Status updates only in-memory
   - Reloads lose all queue data
   - No backend API calls
   - No historical tracking

2. **QR Scanner Incomplete**
   - Only HTML video element
   - No actual scanning logic
   - No library imported
   - Loyalty system disconnected

3. **No Backend Integration**
   - All data in localStorage
   - No API service implementation
   - No real database
   - [api.service.ts](frontend/src/app/admin/data/api.service.ts) exists but empty

4. **Missing Features**
   - No order history/receipts
   - No kitchen display system (KDS)
   - No order timing/SLA tracking
   - No queue analytics
   - No customer data persistence
   - No permission/role-based access control

5. **Data Model Gaps**
   - Queue board only in POS (not shared)
   - No cross-component queue visibility
   - Event operation checklist separate from inventory operations
   - No unified transaction history

---

## 6. DEPENDENCIES & IMPORTS

### Core Angular
- `@angular/core` - Standalone components
- `@angular/common` - CommonModule, pipes
- `@angular/forms` - Form handling
- `@angular/router` - Routing

### RxJS
- `BehaviorSubject` - Reactive state
- `Observable` - Async streams
- `Subscription` - Subscription management

### Internal Services/Stores
- `AdminInventoryStore` - Menu & inventory
- `FinanceStore` - Financial data
- `InventoryOperationsStore` - Operations
- `LoyaltyStore` - Customer loyalty
- `InventorySessionStore` - Session logs
- `EventOperationService` - Event management
- `ChecklistTemplateService` - Templates
- `AttendanceStore` - HR attendance

### Not Yet Implemented
- QR scanning library (suggested: `@zxing/browser`)
- Backend HTTP client
- Authentication service
- Real API integration

---

## 7. RECOMMENDATIONS FOR IMPROVEMENT

### High Priority 🔴

1. **Implement Queue Board Persistence**
   - Add storage key to InventoryOperationsStore
   - Create OrderQueueStore for queue data
   - Add backend API endpoints

2. **Complete QR Scanner**
   - Install `@zxing/browser`
   - Implement real scanning logic
   - Connect to customer lookup

3. **Add Backend Integration**
   - Implement api.service.ts with HTTP calls
   - Create backend endpoints for all stores
   - Add authentication layer

### Medium Priority 🟡

4. **Add Kitchen Display System (KDS)**
   - Component to show preparing orders
   - Real-time order status
   - Time tracking

5. **Order History & Receipts**
   - Persistent order storage
   - Receipt generation
   - Historical analytics

6. **Queue Analytics**
   - Average order time
   - Queue wait time
   - Peak hours analysis

### Low Priority 🟢

7. **Enhanced Reporting**
   - Detailed kitchen performance
   - Customer preferences
   - Inventory turnover

8. **Role-Based Access**
   - Admin vs staff views
   - Permission checks
   - Audit trail by user

---

## 8. FILE STRUCTURE REFERENCE

```
frontend/src/app/admin/
├── admin-layout.ts                    # Master layout
├── admin-layout.html
├── admin-layout.scss
├── admin-section.scss
├── admin.routes.ts                    # Route definitions
│
├── data/                              # Stores & services
│   ├── admin-inventory.store.ts       # Menu & inventory
│   ├── finance.store.ts               # Financial data
│   ├── inventory-operations.store.ts  # Operation sessions
│   ├── inventory-session.store.ts     # Session logs
│   ├── loyalty.store.ts               # Customer loyalty
│   └── api.service.ts                 # (Placeholder) Backend API
│
├── master-inventory/                  # Inventory management
│   ├── master-inventory.ts
│   ├── master-inventory.html
│   └── master-inventory.scss
│
├── menu-builder/                      # Create menu items
│   ├── menu-builder.ts
│   ├── menu-builder.html
│   └── menu-builder.scss
│
├── menu-admin/                        # Manage menu
│   ├── menu-admin.ts
│   ├── menu-admin.html
│   └── menu-admin.scss
│
├── store-inventory/                   # Store operations
│   ├── store-inventory.ts
│   ├── store-inventory.html
│   └── store-inventory.scss
│
├── event-inventory/                   # Event operations
│   ├── event-inventory.ts
│   ├── event-inventory.html
│   └── event-inventory.scss
│
├── popup-inventory/                   # Popup operations
│   ├── popup-inventory.ts
│   ├── popup-inventory.html
│   └── popup-inventory.scss
│
├── finance/                           # Financial tracking
│   ├── finance.ts
│   ├── finance.html
│   └── finance.scss
│
├── hr/                                # HR & attendance
│   ├── hr.ts
│   ├── hr.html
│   └── hr.scss
│
├── pos/                               # Point of Sale
│   ├── pos.ts                         # Main POS logic
│   ├── pos.html                       # POS UI
│   ├── pos.scss
│   ├── qr-scanner.ts                  # (Incomplete) QR scanner
│   └── qr-scanner.scss
│
├── event-operations/                  # Event management
│   ├── event-operations.ts
│   ├── event-operations.html
│   ├── event-operations.scss
│   ├── models/
│   │   └── checklist.models.ts
│   ├── services/
│   │   ├── event-operation.service.ts
│   │   └── checklist-template.service.ts
│   └── components/
│       ├── event-management.ts
│       ├── event-management.html
│       ├── event-management.scss
│       ├── template-management.ts
│       ├── template-management.html
│       ├── template-management.scss
│       ├── event-checklist-editor.ts
│       ├── event-checklist-editor.html
│       └── event-checklist-editor.scss
│
└── reports/                           # Analytics & reporting
    ├── reports-layout.ts
    ├── reports.routes.ts
    ├── models/
    ├── pages/
    │   ├── dashboard-overview.page.ts
    │   ├── export-center.page.ts
    │   ├── report-category.page.ts
    │   └── audit-logs.page.ts
    ├── components/
    │   ├── analytics-chart.component.ts
    │   ├── kpi-card.component.ts
    │   ├── report-table.component.ts
    │   ├── filter-bar.component.ts
    │   ├── export-dropdown.component.ts
    │   └── loading-skeleton.component.ts
    ├── services/
    │   ├── reports-data.service.ts
    │   ├── reports-state.service.ts
    │   └── reports-export.service.ts
    └── data/
        └── report-mock.data.ts
```

---

## Summary

The MBK 4.0 admin section is **well-structured and mostly complete**, with robust inventory, menu, financial, and event management systems. The **POS component is functional but needs queue persistence and QR scanner implementation**. The main limitation is **lack of backend integration** - all data currently uses localStorage. 

The queue board exists as a UI component with status updates, but persisting and syncing queue data to a backend should be the next priority for a production system.

