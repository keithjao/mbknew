import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import {
  AdminInventoryStore,
  InventoryItem,
  InventoryUnit,
  MenuIngredient
} from '../data/admin-inventory.store';

interface IngredientDraft {
  item: InventoryItem;
  amount: number;
}

interface ParsedIngredientRow {
  name: string;
  unit: InventoryUnit;
  recipeAmount: number;
  unitCost: number;
  quantity?: number;
}

interface ImportSummary {
  inventoryCreated: number;
  inventoryUpdated: number;
  inventorySkipped: number;
  menuCreated: number;
  menuUpdated: number;
  menuSkipped: number;
  categoriesCreated: number;
  conflicts: string[];
  errors: string[];
}

interface MenuIngredientRef {
  name: string;
  unit: InventoryUnit;
  recipeAmount: number;
}

@Component({
  selector: 'app-menu-builder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-builder.html',
  styleUrl: './menu-builder.scss'
})
export class MenuBuilder implements OnInit, OnDestroy {
  readonly pageSize = 10;
  inventory: InventoryItem[] = [];
  categories: string[] = [];
  selectedIngredients: IngredientDraft[] = [];
  importInProgress = false;
  importSummary: ImportSummary | null = null;
  feedback = '';
  ingredientPage = 1;
  private readonly subscription = new Subscription();

  constructor(private readonly store: AdminInventoryStore) {}

  ngOnInit(): void {
    this.subscription.add(this.store.categories$.subscribe(categories => {
      this.categories = categories;
    }));

    this.subscription.add(this.store.inventory$.subscribe(items => {
      this.inventory = items;
      this.selectedIngredients = this.selectedIngredients.filter(draft =>
        items.some(item => item.id === draft.item.id)
      );
      this.ingredientPage = this.clampPage(this.ingredientPage, this.ingredientTotalPages);
    }));
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleIngredient(item: InventoryItem, checked: boolean): void {
    if (checked && !this.selectedIngredients.some(draft => draft.item.id === item.id)) {
      this.selectedIngredients.push({ item, amount: 1 });
      return;
    }

    if (!checked) {
      this.selectedIngredients = this.selectedIngredients.filter(draft => draft.item.id !== item.id);
    }
  }

  updateIngredientAmount(itemId: number, value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    this.selectedIngredients = this.selectedIngredients.map(draft =>
      draft.item.id === itemId ? { ...draft, amount: value } : draft
    );
  }

  isSelected(itemId: number): boolean {
    return this.selectedIngredients.some(draft => draft.item.id === itemId);
  }

  amountFor(itemId: number): number {
    return this.selectedIngredients.find(draft => draft.item.id === itemId)?.amount ?? 1;
  }

  get pagedInventory(): InventoryItem[] {
    const start = (this.ingredientPage - 1) * this.pageSize;
    return this.inventory.slice(start, start + this.pageSize);
  }

  get ingredientTotalPages(): number {
    return Math.max(1, Math.ceil(this.inventory.length / this.pageSize));
  }

  setIngredientPage(page: number): void {
    this.ingredientPage = this.clampPage(page, this.ingredientTotalPages);
  }

  addCategory(name: string, categoryInput: HTMLInputElement): void {
    const didAdd = this.store.addCategory(name);
    this.feedback = didAdd
      ? 'category added.'
      : 'category already exists or is invalid.';

    if (didAdd) {
      categoryInput.value = '';
    }
  }

  createMenuItem(
    name: string,
    category: string,
    price: number,
    notes: string,
    form: HTMLFormElement
  ): void {
    if (!name.trim() || !category.trim() || !Number.isFinite(price) || price <= 0) {
      this.feedback = 'fill in name, category, and a valid price.';
      return;
    }

    if (this.selectedIngredients.length === 0) {
      this.feedback = 'select at least one master inventory item.';
      return;
    }

    const ingredients: MenuIngredient[] = this.selectedIngredients.map(draft => ({
      inventoryItemId: draft.item.id,
      inventoryItemName: draft.item.name,
      amount: draft.amount,
      unit: draft.item.unit as InventoryUnit
    }));

    this.store.addMenuDefinition({
      name: name.trim().toLowerCase(),
      category: category.trim().toLowerCase(),
      price,
      ingredients,
      notes: notes.trim().toLowerCase(),
      available: true
    });

    this.feedback = 'menu item created successfully.';
    this.selectedIngredients = [];
    form.reset();
  }

  async importMenuWorkbook(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.importInProgress = true;
    this.importSummary = null;

    try {
      const xlsx = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = xlsx.read(buffer, { type: 'array' });

      const inventorySheetName = workbook.SheetNames.find(n =>
        n.trim().toLowerCase().includes('inventory')
      );
      const menuSheetName = workbook.SheetNames.find(n =>
        n.trim().toLowerCase().includes('menu')
      );
      const isTwoSheet = !!(inventorySheetName && menuSheetName && inventorySheetName !== menuSheetName);

      const summary: ImportSummary = {
        inventoryCreated: 0,
        inventoryUpdated: 0,
        inventorySkipped: 0,
        menuCreated: 0,
        menuUpdated: 0,
        menuSkipped: 0,
        categoriesCreated: 0,
        conflicts: [],
        errors: []
      };

      if (isTwoSheet) {
        const inventoryRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(
          workbook.Sheets[inventorySheetName!], { defval: '' }
        );
        const menuRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(
          workbook.Sheets[menuSheetName!], { defval: '' }
        );
        this.processInventoryRows(inventoryRows, summary);
        this.processMenuRows(menuRows, summary);
      } else {
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!firstSheet) {
          this.feedback = 'import failed: workbook has no readable sheet.';
          return;
        }
        const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
        if (rows.length === 0) {
          this.feedback = 'import failed: sheet has no rows.';
          return;
        }
        this.processSingleSheetRows(rows, summary);
      }

      this.importSummary = summary;
      this.feedback = this.buildFeedbackMessage(summary, isTwoSheet);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unexpected import error.';
      this.feedback = `import failed: ${message}`;
    } finally {
      this.importInProgress = false;
      input.value = '';
    }
  }

  async downloadSampleWorkbook(): Promise<void> {
    try {
      const xlsx = await import('xlsx');

      const inventoryRows = [
        { 'ingredient name': 'matcha powder', unit: 'grams', 'unit cost': 1.8, 'starting quantity': 1200 },
        { 'ingredient name': 'milk', unit: 'ml', 'unit cost': 0.06, 'starting quantity': 18000 },
        { 'ingredient name': 'strawberry puree', unit: 'ml', 'unit cost': 0.35, 'starting quantity': 4000 },
        { 'ingredient name': 'soft serve base', unit: 'ml', 'unit cost': 0.12, 'starting quantity': 10000 },
        { 'ingredient name': 'cup', unit: 'piece', 'unit cost': 4, 'starting quantity': 500 },
        { 'ingredient name': 'cone', unit: 'piece', 'unit cost': 3, 'starting quantity': 1000 }
      ];

      const menuRows = [
        {
          'menu item name': 'classic matcha latte',
          category: 'matcha drinks',
          price: 180,
          ingredients: 'matcha powder|grams|3; milk|ml|240; cup|piece|1',
          notes: 'signature starter item'
        },
        {
          'menu item name': 'strawberry matcha latte',
          category: 'seasonal drinks',
          price: 210,
          ingredients: 'matcha powder|grams|3; strawberry puree|ml|40; milk|ml|220; cup|piece|1',
          notes: 'sweet fruit profile'
        },
        {
          'menu item name': 'matcha soft serve',
          category: 'desserts',
          price: 160,
          ingredients: 'matcha powder|grams|2; soft serve base|ml|120; cone|piece|1',
          notes: 'dessert line sample'
        }
      ];

      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(inventoryRows), 'Inventory');
      xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(menuRows), 'Menu');
      xlsx.writeFile(workbook, 'mbk_menu_import_template.xlsx');
      this.feedback = 'sample Excel template downloaded.';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unable to generate sample workbook.';
      this.feedback = `download failed: ${message}`;
    }
  }

  private processInventoryRows(rows: Record<string, unknown>[], summary: ImportSummary): void {
    for (const [index, row] of rows.entries()) {
      const rowNum = index + 2;
      const name = this.getRowValue(row, ['ingredient name', 'name', 'item name']);
      const unitRaw = this.getRowValue(row, ['unit']);
      const unitCostRaw = this.getRowValue(row, ['unit cost', 'cost', 'unit price', 'cost per unit']);
      const startingQtyRaw = this.getRowValue(row, ['starting quantity', 'starting qty', 'quantity', 'stock quantity', 'qty']);

      if (!name || !unitRaw || !unitCostRaw) {
        summary.errors.push(`Inventory row ${rowNum}: missing ingredient name, unit, or unit cost — skipped.`);
        summary.inventorySkipped++;
        continue;
      }

      const unit = this.toInventoryUnit(unitRaw);
      if (!unit) {
        summary.errors.push(`Inventory row ${rowNum}: unit must be ml, grams, or piece (got "${unitRaw}") — skipped.`);
        summary.inventorySkipped++;
        continue;
      }

      const unitCost = Number(unitCostRaw);
      if (!Number.isFinite(unitCost) || unitCost < 0) {
        summary.errors.push(`Inventory row ${rowNum}: unit cost must be a valid number ≥ 0 — skipped.`);
        summary.inventorySkipped++;
        continue;
      }

      const parsedQty = Number(startingQtyRaw);
      const quantity = Number.isFinite(parsedQty) && parsedQty >= 0 ? parsedQty : 0;

      // Unit conflict: same name already exists with a different unit
      const existingByName = this.store.getInventoryItemByName(name);
      if (existingByName && existingByName.unit !== unit) {
        summary.conflicts.push(
          `"${name}" already stored as ${existingByName.unit} but import says ${unit} — skipped to avoid unit mismatch.`
        );
        summary.inventorySkipped++;
        continue;
      }

      // Cost conflict: same name+unit, different cost — keep existing cost
      const existingMatch = this.store.getInventoryItemByName(name, unit);
      let effectiveUnitCost = unitCost;
      if (existingMatch && existingMatch.unitCost !== unitCost) {
        summary.conflicts.push(
          `"${name}" cost conflict: stored ₱${existingMatch.unitCost}/unit vs import ₱${unitCost}/unit — kept stored cost.`
        );
        effectiveUnitCost = existingMatch.unitCost;
      }

      const result = this.store.upsertInventoryItem(
        { name, unit, quantity, unitCost: effectiveUnitCost },
        { preserveExistingQuantity: false }
      );

      if (!result) {
        summary.errors.push(`Inventory row ${rowNum}: failed to save "${name}" — skipped.`);
        summary.inventorySkipped++;
        continue;
      }

      if (result.created) {
        summary.inventoryCreated++;
      } else {
        summary.inventoryUpdated++;
      }
    }
  }

  private processMenuRows(rows: Record<string, unknown>[], summary: ImportSummary): void {
    for (const [index, row] of rows.entries()) {
      const rowNum = index + 2;
      const menuName = this.getRowValue(row, ['menu item name', 'menu name', 'item name', 'name']);
      const category = this.getRowValue(row, ['category']);
      const priceRaw = this.getRowValue(row, ['price', 'menu price']);
      const ingredientsRaw = this.getRowValue(row, ['ingredients', 'recipe', 'inventory/ingredients']);
      const notes = this.getRowValue(row, ['notes']);

      if (!menuName || !category || !priceRaw || !ingredientsRaw) {
        summary.errors.push(`Menu row ${rowNum}: missing menu item name, category, price, or ingredients — skipped.`);
        summary.menuSkipped++;
        continue;
      }

      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price <= 0) {
        summary.errors.push(`Menu row ${rowNum}: price must be a positive number — skipped.`);
        summary.menuSkipped++;
        continue;
      }

      const ingredientRefs = this.parseMenuIngredientRefs(ingredientsRaw, rowNum, summary.errors);
      if (ingredientRefs.length === 0) {
        summary.menuSkipped++;
        continue;
      }

      if (this.store.addCategory(category)) {
        summary.categoriesCreated++;
      }

      const menuIngredients: MenuIngredient[] = [];
      let hasUnresolvable = false;

      for (const ref of ingredientRefs) {
        // Exact match by name + unit
        const exact = this.store.getInventoryItemByName(ref.name, ref.unit);
        if (exact) {
          menuIngredients.push({ inventoryItemId: exact.id, inventoryItemName: exact.name, amount: ref.recipeAmount, unit: exact.unit });
          continue;
        }

        // Unit mismatch fallback: find by name only
        const byName = this.store.getInventoryItemByName(ref.name);
        if (byName) {
          summary.conflicts.push(
            `"${menuName}": "${ref.name}" is stored as ${byName.unit} but recipe says ${ref.unit} — used stored unit.`
          );
          menuIngredients.push({ inventoryItemId: byName.id, inventoryItemName: byName.name, amount: ref.recipeAmount, unit: byName.unit });
          continue;
        }

        // Not found anywhere — auto-create placeholder with 0 qty and ₱0 cost
        const placeholder = this.store.upsertInventoryItem(
          { name: ref.name, unit: ref.unit, quantity: 0, unitCost: 0 },
          { preserveExistingQuantity: false }
        );

        if (!placeholder) {
          summary.errors.push(`Menu row ${rowNum}: could not create placeholder for "${ref.name}".`);
          hasUnresolvable = true;
          continue;
        }

        summary.inventoryCreated++;
        summary.conflicts.push(
          `"${ref.name}" was not in inventory — auto-created as placeholder. Set cost + quantity in Master Inventory.`
        );
        menuIngredients.push({ inventoryItemId: placeholder.item.id, inventoryItemName: placeholder.item.name, amount: ref.recipeAmount, unit: ref.unit });
      }

      if (hasUnresolvable) {
        summary.menuSkipped++;
        continue;
      }

      const menuResult = this.store.upsertMenuDefinition({ name: menuName, category, price, ingredients: menuIngredients, notes, available: true });

      if (!menuResult) {
        summary.errors.push(`Menu row ${rowNum}: could not save "${menuName}".`);
        summary.menuSkipped++;
        continue;
      }

      if (menuResult.created) {
        summary.menuCreated++;
      } else {
        summary.menuUpdated++;
      }
    }
  }

  private processSingleSheetRows(rows: Record<string, unknown>[], summary: ImportSummary): void {
    for (const [index, row] of rows.entries()) {
      const rowNum = index + 2;
      const menuName = this.getRowValue(row, ['menu item name', 'menu name', 'item name', 'name']);
      const category = this.getRowValue(row, ['category']);
      const priceRaw = this.getRowValue(row, ['price', 'menu price']);
      const ingredientsRaw = this.getRowValue(row, ['inventory/ingredients', 'ingredients', 'recipe']);
      const startingQuantityRaw = this.getRowValue(row, ['starting quantity', 'starting qty', 'start quantity', 'stock quantity']);
      const notes = this.getRowValue(row, ['notes']);

      if (!menuName || !category || !priceRaw || !ingredientsRaw) {
        summary.errors.push(`Row ${rowNum}: missing required fields — skipped.`);
        summary.menuSkipped++;
        continue;
      }

      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price <= 0) {
        summary.errors.push(`Row ${rowNum}: price must be a positive number — skipped.`);
        summary.menuSkipped++;
        continue;
      }

      const startingQuantities = this.parseStartingQuantities(startingQuantityRaw, rowNum, summary.errors);
      const ingredients = this.parseIngredientCell(ingredientsRaw, rowNum, summary.errors);
      if (ingredients.length === 0) {
        summary.menuSkipped++;
        continue;
      }

      if (this.store.addCategory(category)) {
        summary.categoriesCreated++;
      }

      let hasError = false;
      const menuIngredients: MenuIngredient[] = [];

      for (const [i, ingredient] of ingredients.entries()) {
        const quantity = ingredient.quantity ?? startingQuantities[i] ?? 0;

        const existingByName = this.store.getInventoryItemByName(ingredient.name);
        if (existingByName && existingByName.unit !== ingredient.unit) {
          summary.conflicts.push(`"${ingredient.name}" unit mismatch — used stored unit ${existingByName.unit}.`);
        }

        const existingMatch = this.store.getInventoryItemByName(ingredient.name, ingredient.unit);
        let effectiveUnitCost = ingredient.unitCost;
        if (existingMatch && existingMatch.unitCost !== ingredient.unitCost) {
          summary.conflicts.push(`"${ingredient.name}" cost conflict — kept stored ₱${existingMatch.unitCost}.`);
          effectiveUnitCost = existingMatch.unitCost;
        }

        const inventoryResult = this.store.upsertInventoryItem(
          { name: ingredient.name, unit: ingredient.unit, quantity, unitCost: effectiveUnitCost },
          { preserveExistingQuantity: false }
        );

        if (!inventoryResult) {
          summary.errors.push(`Row ${rowNum}: invalid inventory payload for "${ingredient.name}".`);
          hasError = true;
          break;
        }

        if (inventoryResult.created) {
          summary.inventoryCreated++;
        } else {
          summary.inventoryUpdated++;
        }

        menuIngredients.push({
          inventoryItemId: inventoryResult.item.id,
          inventoryItemName: inventoryResult.item.name,
          amount: ingredient.recipeAmount,
          unit: ingredient.unit
        });
      }

      if (hasError) {
        summary.menuSkipped++;
        continue;
      }

      const menuResult = this.store.upsertMenuDefinition({ name: menuName, category, price, ingredients: menuIngredients, notes, available: true });

      if (!menuResult) {
        summary.errors.push(`Row ${rowNum}: could not save "${menuName}".`);
        summary.menuSkipped++;
        continue;
      }

      if (menuResult.created) {
        summary.menuCreated++;
      } else {
        summary.menuUpdated++;
      }
    }
  }

  private parseMenuIngredientRefs(rawValue: string, rowNumber: number, errors: string[]): MenuIngredientRef[] {
    const refs: MenuIngredientRef[] = [];

    for (const segment of rawValue.split(/\n|;/).map(s => s.trim()).filter(Boolean)) {
      const parts = segment.split('|').map(p => p.trim());

      if (parts.length < 3) {
        errors.push(`Menu row ${rowNumber}: ingredient must be name|unit|recipeAmount (got "${segment}") — skipped.`);
        continue;
      }

      const [name, unitRaw, recipeAmountRaw] = parts;
      const unit = this.toInventoryUnit(unitRaw);
      const recipeAmount = Number(recipeAmountRaw);

      if (!name) { errors.push(`Menu row ${rowNumber}: ingredient name is required.`); continue; }
      if (!unit) { errors.push(`Menu row ${rowNumber}: unit must be ml, grams, or piece.`); continue; }
      if (!Number.isFinite(recipeAmount) || recipeAmount <= 0) { errors.push(`Menu row ${rowNumber}: recipe amount must be a positive number.`); continue; }

      refs.push({ name, unit, recipeAmount });
    }

    return refs;
  }

  private buildFeedbackMessage(summary: ImportSummary, isTwoSheet: boolean): string {
    const mode = isTwoSheet ? 'Two-sheet import' : 'Single-sheet import';
    const parts = [
      `inventory: +${summary.inventoryCreated} created, ${summary.inventoryUpdated} updated, ${summary.inventorySkipped} skipped`,
      `menu: +${summary.menuCreated} created, ${summary.menuUpdated} updated, ${summary.menuSkipped} skipped`,
      `categories: +${summary.categoriesCreated}`
    ].join(' • ');

    if (summary.conflicts.length > 0 || summary.errors.length > 0) {
      return `${mode} done. ${parts}. ${summary.conflicts.length} conflict(s), ${summary.errors.length} error(s) — see details below.`;
    }

    return `${mode} done. ${parts}.`;
  }

  private getRowValue(row: Record<string, unknown>, aliases: string[]): string {
    const normalizedAliases = new Set(aliases.map(alias => this.normalizeHeader(alias)));

    for (const [key, value] of Object.entries(row)) {
      if (!normalizedAliases.has(this.normalizeHeader(key))) {
        continue;
      }

      return String(value ?? '').trim();
    }

    return '';
  }

  private parseIngredientCell(rawValue: string, rowNumber: number, rowErrors: string[]): ParsedIngredientRow[] {
    const segments = rawValue
      .split(/\n|;/)
      .map(segment => segment.trim())
      .filter(Boolean);

    const ingredients: ParsedIngredientRow[] = [];

    for (const segment of segments) {
      const parts = segment.split('|').map(part => part.trim());
      if (parts.length < 4) {
        rowErrors.push(`row ${rowNumber}: ingredient format must be name|unit|recipeAmount|unitCost.`);
        continue;
      }

      const [name, unitRaw, recipeAmountRaw, unitCostRaw, quantityRaw] = parts;
      const unit = this.toInventoryUnit(unitRaw);
      const recipeAmount = Number(recipeAmountRaw);
      const unitCost = Number(unitCostRaw);

      let quantity: number | undefined;
      if (quantityRaw) {
        const inlineQuantity = Number(quantityRaw);
        if (!Number.isFinite(inlineQuantity) || inlineQuantity < 0) {
          rowErrors.push(`row ${rowNumber}: inline quantity must be a valid number >= 0.`);
          continue;
        }

        quantity = inlineQuantity;
      }

      if (!name) {
        rowErrors.push(`row ${rowNumber}: ingredient name is required.`);
        continue;
      }

      if (!unit) {
        rowErrors.push(`row ${rowNumber}: ingredient unit must be ml, grams, or piece.`);
        continue;
      }

      if (!Number.isFinite(recipeAmount) || recipeAmount <= 0 || !Number.isFinite(unitCost) || unitCost < 0) {
        rowErrors.push(`row ${rowNumber}: ingredient numbers must be valid (recipeAmount>0, unitCost>=0).`);
        continue;
      }

      ingredients.push({
        name,
        unit,
        recipeAmount,
        unitCost,
        quantity
      });
    }

    return ingredients;
  }

  private parseStartingQuantities(rawValue: string, rowNumber: number, rowErrors: string[]): number[] {
    if (!rawValue.trim()) {
      return [];
    }

    const segments = rawValue
      .split(/\n|;/)
      .map(segment => segment.trim())
      .filter(Boolean);

    const quantities: number[] = [];

    for (const segment of segments) {
      const quantity = Number(segment);
      if (!Number.isFinite(quantity) || quantity < 0) {
        rowErrors.push(`row ${rowNumber}: starting quantity values must be numbers >= 0.`);
        continue;
      }

      quantities.push(quantity);
    }

    return quantities;
  }

  private toInventoryUnit(rawValue: string): InventoryUnit | null {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === 'ml' || normalized === 'grams' || normalized === 'piece') {
      return normalized;
    }

    return null;
  }

  private normalizeHeader(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private clampPage(page: number, totalPages: number): number {
    return Math.min(Math.max(page, 1), totalPages);
  }
}
