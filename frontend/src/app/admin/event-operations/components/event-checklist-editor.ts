import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventOperationService } from '../services/event-operation.service';
import { EventOperation, ChecklistItem, CHECKLIST_CATEGORIES, ChecklistCategory, ChecklistProgress } from '../models/checklist.models';

@Component({
  selector: 'app-event-checklist-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './event-checklist-editor.html',
  styleUrl: './event-checklist-editor.scss'
})
export class EventChecklistEditor implements OnInit {
  @Input() event!: EventOperation;
  @Output() close = new EventEmitter<void>();

  checklist: ChecklistItem[] = [];
  categories = CHECKLIST_CATEGORIES;
  selectedCategory: ChecklistCategory | 'All' = 'All';
  progress: ChecklistProgress | undefined = undefined;

  showItemForm = false;
  editingItemId: string | null = null;
  itemForm!: FormGroup;

  searchTerm = '';
  sortBy: 'name' | 'category' | 'packed' = 'category';

  constructor(
    private eventService: EventOperationService,
    private fb: FormBuilder
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.updateChecklist();
  }

  private initializeForm(): void {
    this.itemForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      category: ['Miscellaneous', Validators.required],
      quantityNeeded: [1, [Validators.required, Validators.min(1)]],
      notes: ['']
    });
  }

  private updateChecklist(): void {
    const event = this.eventService.getEventById(this.event.id);
    if (event) {
      this.checklist = event.checklist;
      this.progress = this.eventService.getChecklistProgress(this.event.id);
    }
  }

  get filteredChecklist(): ChecklistItem[] {
    let filtered = [...this.checklist];

    // Filter by category
    if (this.selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === this.selectedCategory);
    }

    // Filter by search term
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(search) ||
        item.notes?.toLowerCase().includes(search)
      );
    }

    // Sort
    if (this.sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy === 'category') {
      filtered.sort((a, b) => a.category.localeCompare(b.category));
    } else if (this.sortBy === 'packed') {
      filtered.sort((a, b) => (a.packed ? 1 : -1) - (b.packed ? 1 : -1));
    }

    return filtered;
  }

  get categoryCounts(): Map<ChecklistCategory, { total: number; packed: number }> {
    const counts = new Map<ChecklistCategory, { total: number; packed: number }>();

    this.categories.forEach(cat => {
      const items = this.checklist.filter(i => i.category === cat);
      const packed = items.filter(i => i.packed).length;
      counts.set(cat, { total: items.length, packed });
    });

    return counts;
  }

  toggleItemPacked(item: ChecklistItem): void {
    this.eventService.toggleItemPacked(this.event.id, item.id);
    this.updateChecklist();
  }

  markCategoryAsPacked(): void {
    if (this.selectedCategory !== 'All') {
      this.eventService.markCategoryAsPacked(this.event.id, this.selectedCategory);
      this.updateChecklist();
    }
  }

  addItem(): void {
    this.showItemForm = true;
    this.editingItemId = null;
    this.itemForm.reset({ category: 'Miscellaneous', quantityNeeded: 1 });
  }

  editItem(item: ChecklistItem): void {
    this.editingItemId = item.id;
    this.itemForm.patchValue({
      name: item.name,
      category: item.category,
      quantityNeeded: item.quantityNeeded,
      notes: item.notes
    });
    this.showItemForm = true;
  }

  saveItem(): void {
    if (this.itemForm.invalid) return;

    const formValue = this.itemForm.value;

    if (this.editingItemId) {
      this.eventService.updateChecklistItem(this.event.id, this.editingItemId, {
        name: formValue.name,
        category: formValue.category,
        quantityNeeded: formValue.quantityNeeded,
        notes: formValue.notes
      });
    } else {
      this.eventService.addChecklistItem(this.event.id, {
        name: formValue.name,
        category: formValue.category,
        quantityNeeded: formValue.quantityNeeded,
        packed: false,
        notes: formValue.notes
      });
    }

    this.cancelItemEdit();
    this.updateChecklist();
  }

  deleteItem(item: ChecklistItem): void {
    if (confirm(`Delete "${item.name}"?`)) {
      this.eventService.removeChecklistItem(this.event.id, item.id);
      this.updateChecklist();
    }
  }

  cancelItemEdit(): void {
    this.showItemForm = false;
    this.editingItemId = null;
    this.itemForm.reset({ category: 'Miscellaneous', quantityNeeded: 1 });
  }

  getItemCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'Matcha Tools': '#8B7355',
      'Brewing Equipment': '#4A90E2',
      'Ingredients': '#2ECC71',
      'Packaging': '#F39C12',
      'POS Equipment': '#9B59B6',
      'Furniture': '#E74C3C',
      'Cleaning Supplies': '#1ABC9C',
      'Merchandise': '#F1C40F',
      'Utilities': '#34495E',
      'Miscellaneous': '#95A5A6'
    };
    return colors[category] || '#95A5A6';
  }

  getCategoryName(category: string): string {
    return category;
  }

  closeEditor(): void {
    this.close.emit();
  }

  downloadChecklist(): void {
    const csv = this.generateCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${this.event.name}-checklist.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private generateCSV(): string {
    const headers = ['Item Name', 'Category', 'Quantity Needed', 'Packed', 'Notes'];
    const rows = this.checklist.map(item => [
      item.name,
      item.category,
      item.quantityNeeded.toString(),
      item.packed ? 'Yes' : 'No',
      item.notes || ''
    ]);

    const all = [headers, ...rows];
    return all.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  printChecklist(): void {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      let html = `
        <html>
          <head>
            <title>${this.event.name} - Checklist</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; margin-bottom: 10px; }
              .event-info { color: #666; font-size: 14px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              th { background: #f0f0f0; font-weight: bold; }
              tr.packed { background: #f0f8f0; }
              .category { color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <h1>${this.event.name} - Checklist</h1>
            <div class="event-info">
              <p>📍 ${this.event.venue} | 📅 ${new Date(this.event.date).toLocaleDateString()} | 🕒 ${this.event.time}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Packed</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
      `;

      this.checklist.forEach(item => {
        html += `
          <tr ${item.packed ? 'class="packed"' : ''}>
            <td><input type="checkbox" ${item.packed ? 'checked' : ''} disabled> ${item.name}</td>
            <td><span class="category">${item.category}</span></td>
            <td>${item.quantityNeeded}</td>
            <td>${item.packed ? '✓' : ''}</td>
            <td>${item.notes || ''}</td>
          </tr>
        `;
      });

      html += `
              </tbody>
            </table>
            <p style="margin-top: 30px; color: #999; font-size: 12px;">
              ${this.progress?.packedItems || 0} of ${this.progress?.totalItems || 0} items packed
            </p>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  }
}
