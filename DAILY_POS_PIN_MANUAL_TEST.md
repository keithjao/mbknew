# MBK Admin System Manual Test Guide

This is the consolidated manual test document after scanning and updating the admin code paths for:
- staff accountability (staff code + PIN flows)
- daily POS PIN per staff
- master inventory delete confirmation
- Excel import for menu + category + inventory mapping

## 1. Code Scan Summary

Scanned modules:
- clock-in/out flow
- HR staff/account flow
- POS + queue board flow
- master inventory flow
- menu builder flow
- inventory/menu shared data store

Implementation status:
- POS now uses daily staff-specific PIN validation.
- Clock in/out still uses base staff PIN.
- Queue board has no operator PIN inputs.
- Master inventory delete now requires typed confirmation of ingredient name.
- Menu Builder now supports Excel import that can auto-create category, menu, and inventory links.

Build status:
- Frontend build passes (`npx ng build --configuration=development`).
- Existing Sass deprecation warnings remain for `@import` usage (non-blocking).

## 2. Staff Code + Staff PIN (Clock In/Out) Explanation

### What is Staff Code?
A unique staff identifier used to select which staff member is clocking in/out or signing in as POS operator.

### What is Staff PIN in Clock In/Out?
The base staff PIN stored in HR account record. It is used for attendance actions (clock in/out).

### Is it needed?
Recommended: yes.
- Staff code identifies who is acting.
- PIN validates that the person is authorized to act as that staff account.
- Without PIN, anyone who knows the code can impersonate staff for attendance.

### How this now works in your system
- Clock In/Out: uses base staff PIN.
- POS sign-in: uses daily POS PIN (generated from staff account + date).

## 3. Prerequisites

1. Start frontend:
   - `cd /Users/keithjao/Documents/MBK4.0/frontend`
   - `npm start`
2. Open app:
   - `http://localhost:4200`
3. Sign in with an account that can access HR, POS, Master Inventory, and Menu Builder.

## 4. Test A - HR Credentials + Daily POS PIN Visibility

1. Go to `/admin/hr`.
2. Open `Staff Accounts` tab.
3. Create a new staff account or use existing active staff.
4. Verify credential panel shows:
   - base staff pin (clock in/out)
   - today's POS pin
   - temporary workspace password
5. Verify Team Directory row shows `today's POS pin` for each staff (admin view).

Expected:
- Every active staff can be mapped to a daily POS PIN value.

## 5. Test B - POS Sign-in Uses Daily PIN

1. Go to `/admin/pos`.
2. Use staff code + base staff PIN.
3. Click Sign In.

Expected:
- Sign-in fails with daily POS PIN error.

4. Use same staff code + today's POS PIN from HR.
5. Click Sign In.

Expected:
- Sign-in succeeds.

## 6. Test C - Staff-specific Daily PIN

1. Pick Staff A and Staff B.
2. Note each person's today's POS PIN in HR.
3. In POS, try Staff A code + Staff B daily PIN.

Expected:
- Fails.

4. Try Staff A code + Staff A daily PIN.

Expected:
- Succeeds.

## 7. Test D - Clock In/Out Still Uses Base PIN

1. Go to `/admin/clock-in-out`.
2. Enter staff code + base staff PIN + selfie.
3. Clock in.

Expected:
- Success.

4. Try clock in using daily POS PIN instead of base PIN.

Expected:
- Fails.

## 8. Test E - Queue Board UI Separation

1. Go to `/admin/queue-board`.
2. Verify no operator code/PIN fields exist.
3. Verify source tabs exist (All, Store, Pop-up, Event).

Expected:
- Queue board only handles order workflow, not operator authentication.

## 9. Test F - Master Inventory Delete Confirmation

1. Go to `/admin/master-inventory`.
2. Add a test item (example: `qa_delete_item`).
3. Click remove on that row.
4. In the dialog, type wrong name.
5. Confirm delete.

Expected:
- Deletion blocked with guidance message.

6. Type exact ingredient name.
7. Confirm delete.

Expected:
- Item is deleted.

## 10. Test G - Excel Import (Menu + Category + Inventory)

### Required worksheet columns
- `menu item name`
- `category`
- `price`
- `inventory/ingredients`
- optional: `notes`

### Ingredient cell format
Each ingredient entry:
- `name|unit|recipeAmount|unitCost|quantity`

Multiple ingredients in one menu row:
- separate with `;` or new lines

Example ingredient cell:
- `matcha powder|grams|3|1.8|1200; milk|ml|240|0.06|18000; cup|piece|1|4|500`

### Import steps
1. Go to `/admin/menu-builder`.
2. In import panel, choose `.xlsx` or `.xls` file.
3. Wait for feedback summary.

Expected:
- Missing categories are auto-created.
- Missing inventory items are auto-created.
- Existing inventory items are auto-linked/updated.
- Menu item is created if new, updated if existing name already exists.

### Validation steps after import
1. Check `/admin/menu` for imported menu items.
2. Check `/admin/master-inventory` for created/updated ingredients.
3. Check menu recipe ingredients in menu details for correct mapping.

## 11. Test H - Open Inventory Dependency in POS

1. Go to POS with no open inventory session.

Expected:
- POS shows no open inventory sessions.
- Selling is blocked.

2. Open one inventory session from:
- `/admin/store-inventory`
- `/admin/popup-inventory`
- `/admin/event-inventory`

3. Return to POS.

Expected:
- Open session appears in inventory selector.

## 12. Suggested Accountability Controls (Next)

Recommended next controls:
1. Manager override PIN for void/refund/large discount.
2. Require reason field for void/refund adjustments.
3. Daily cashier reconciliation report (expected vs actual cash by staff).
4. Immutable action logs for high-risk operations.

## 13. Troubleshooting

If import fails:
- verify required columns exist and are correctly named
- verify ingredient format is exactly `name|unit|recipeAmount|unitCost|quantity`
- verify units are only: `ml`, `grams`, `piece`

If POS sign-in fails:
- confirm staff is active
- confirm you are using today's POS PIN from HR (not base PIN)

If clock in/out fails:
- confirm you are using base staff PIN
- ensure selfie capture/upload is present before submit
