# Event Operations - Quick Start Guide

## Accessing the Feature

1. Open the Angular app (http://localhost:4200)
2. Navigate to **Admin** section
3. Click **Event Operations** in the sidebar
4. Choose **Events** or **Templates** tab

## Quick Workflows

### Workflow 1: Create Your First Event (5 minutes)

```
1. Click "Events" tab
2. Click "+ New Event"
3. Fill in:
   - Event Name: "Cherry Blossom Workshop"
   - Venue: "Central Park, NYC"
   - Date: [Pick today]
   - Time: "10:00 AM"
4. Select Template: "Workshop Setup"
5. Click "Create Event"
6. You now have an event with 5 pre-filled items!
```

### Workflow 2: Customize Your Event Checklist

```
After creating an event:
1. Event appears in list - click to select
2. Click "Open Checklist (X items)"
3. The checklist editor opens with sidebar showing:
   - Progress card (how many items packed)
   - Category filter (filter by type)
4. To add an item:
   - Click "+ Add Item"
   - Fill in name, category, quantity, notes
   - Click "Add Item"
5. To mark items packed:
   - Click checkbox next to item
   - Progress updates automatically
6. To mark entire category:
   - Select category from filter
   - Click "Mark [Category] Complete"
```

### Workflow 3: Create a Reusable Template

```
1. Click "Templates" tab
2. Click "+ New Template"
3. Enter:
   - Template Name: "Small Festival Booth"
   - Description: "Lightweight setup for weekend markets"
4. Click "Create Template"
5. Template appears in left list
6. Click it to add items:
   - Click "+ Add Item"
   - Add items one by one
7. Template saved and reusable for future events
```

## Key Features at a Glance

| Feature | How to Access |
|---------|--------------|
| **Create Event** | Events tab → "+ New Event" |
| **Use Template** | New Event → Select template dropdown |
| **Customize Checklist** | Event details → "Open Checklist" |
| **Add Item to Event** | In checklist editor → "+ Add Item" |
| **Mark Item Packed** | Click checkbox next to item |
| **Track Progress** | Progress card shows packed/remaining/% |
| **Filter by Category** | Sidebar → Click category button |
| **Search Items** | Checklist editor → Search box |
| **Export Checklist** | Sidebar → "Download CSV" button |
| **Print Checklist** | Sidebar → "Print" button |
| **Create Template** | Templates tab → "+ New Template" |
| **Edit Template** | Select template → "Edit" button |
| **Add to Template** | Template selected → "+ Add Item" |

## Status Tracking

**Event Statuses**: Planning → Packing → Ready → Ongoing → Completed

Click any status button to change an event's status.

## Data Persistence

Your data automatically saves to browser storage. It persists:
- When you refresh the page
- When you close and reopen the browser
- When you navigate away and back

**Note**: Data is stored locally in your browser. To sync across devices or back up, use Export function.

## Tips & Tricks

### 💡 Pro Tip 1: Start with Templates
Create templates for your most common event types, then reuse them instead of re-entering items each time.

### 💡 Pro Tip 2: Mobile Packing
The checklist editor is mobile-optimized. Open on your phone/tablet while packing for easy checking off items.

### 💡 Pro Tip 3: Category Filtering
Use category filters to focus on one type of item at a time (e.g., "All Matcha Tools" first, then "Ingredients").

### 💡 Pro Tip 4: Print Checklist
Print the checklist before packing to have a physical reference sheet.

### 💡 Pro Tip 5: Item Notes
Add notes to items like "Pack in red bag" or "Keep refrigerated" for packing instructions.

## Troubleshooting

### Problem: "I can't see my events"
**Solution**: Make sure you're in the "Events" tab (not Templates). If data still missing, check browser console (F12) for errors.

### Problem: "Template items aren't showing"
**Solution**: When creating event, make sure you selected a template in the dropdown and completed all form fields.

### Problem: "I want to delete an item from a template"
**Solution**: Select template → Click "Edit" → Find item → Click "Delete" button on that item.

### Problem: "I accidentally deleted an event"
**Solution**: Unfortunately, there's no undo yet. In future versions, we'll add trash/recovery. For now, be careful with delete buttons!

### Problem: "My data disappeared"
**Solution**: Check if browser localStorage is enabled. If you cleared browser cache/data, that would delete stored checklists.

## Next Steps

### Beginner
- [ ] Create 2-3 templates for your common event types
- [ ] Create a test event and customize its checklist
- [ ] Try packing workflow with checkboxes

### Intermediate
- [ ] Create events for upcoming bookings
- [ ] Download checklist as CSV and share with team
- [ ] Experiment with categories and filters

### Advanced
- [ ] Request backend integration for permanent storage
- [ ] Plan inventory allocation feature
- [ ] Set up team access and permissions

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Submit Form | `Enter` (when focused on button) or `Cmd+Enter` |
| Close Editor | `Esc` (when available) |
| Search | `Cmd+F` (use browser search) |
| Print | `Cmd+P` (use export print) |

## Support & Questions

See detailed documentation:
- **Full Guide**: `/EVENT_OPERATIONS_GUIDE.md`
- **Implementation Details**: `/IMPLEMENTATION_SUMMARY.md`
- **Code Comments**: Check source files for inline documentation

---

**Last Updated**: May 15, 2026
**Version**: 1.0.0
**Status**: Ready to Use
