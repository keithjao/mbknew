import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ChecklistTemplateService } from '../services/checklist-template.service';
import { ChecklistTemplate, ChecklistItem, CHECKLIST_CATEGORIES } from '../models/checklist.models';

@Component({
  selector: 'app-template-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './template-management.html',
  styleUrl: './template-management.scss'
})
export class TemplateManagement implements OnInit {
  templates: ChecklistTemplate[] = [];
  selectedTemplate: ChecklistTemplate | null = null;
  showForm = false;
  showItemForm = false;

  templateForm!: FormGroup;
  itemForm!: FormGroup;

  categories = CHECKLIST_CATEGORIES;
  editingItemId: string | null = null;

  constructor(
    private templateService: ChecklistTemplateService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.templateService.getTemplates().subscribe((templates: ChecklistTemplate[]) => {
      this.templates = templates;
    });
  }

  private initializeForms(): void {
    this.templateForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required]
    });

    this.itemForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      category: ['Miscellaneous', Validators.required],
      quantityNeeded: [1, [Validators.required, Validators.min(1)]],
      notes: ['']
    });
  }

  selectTemplate(template: ChecklistTemplate): void {
    this.selectedTemplate = template;
    this.showForm = false;
    this.showItemForm = false;
    this.editingItemId = null;
  }

  createNewTemplate(): void {
    this.selectedTemplate = null;
    this.showForm = true;
    this.templateForm.reset();
  }

  saveTemplate(): void {
    if (this.templateForm.invalid) return;

    const formValue = this.templateForm.value;
    this.templateService.createTemplate({
      name: formValue.name,
      description: formValue.description,
      items: []
    });

    this.templateForm.reset();
    this.showForm = false;
  }

  updateTemplate(): void {
    if (!this.selectedTemplate || this.templateForm.invalid) return;

    const formValue = this.templateForm.value;
    this.templateService.updateTemplate(this.selectedTemplate.id, {
      name: formValue.name,
      description: formValue.description
    });

    this.showForm = false;
  }

  deleteTemplate(template: ChecklistTemplate): void {
    if (confirm(`Delete template "${template.name}"? This cannot be undone.`)) {
      this.templateService.deleteTemplate(template.id);
      if (this.selectedTemplate?.id === template.id) {
        this.selectedTemplate = null;
      }
    }
  }

  editTemplate(): void {
    if (!this.selectedTemplate) return;
    this.templateForm.patchValue({
      name: this.selectedTemplate.name,
      description: this.selectedTemplate.description
    });
    this.showForm = true;
  }

  cancelEdit(): void {
    this.showForm = false;
    this.templateForm.reset();
  }

  addItem(): void {
    if (!this.selectedTemplate) return;
    this.showItemForm = true;
    this.editingItemId = null;
    this.itemForm.reset({ category: 'Miscellaneous', quantityNeeded: 1 });
  }

  saveItem(): void {
    if (!this.selectedTemplate || this.itemForm.invalid) return;

    const formValue = this.itemForm.value;

    if (this.editingItemId) {
      this.templateService.updateTemplate(this.selectedTemplate.id, {
        ...this.selectedTemplate,
        items: this.selectedTemplate.items.map((item: ChecklistItem) =>
          item.id === this.editingItemId
            ? { ...item, ...formValue, updatedAt: new Date() }
            : item
        )
      });
      this.editingItemId = null;
    } else {
      this.templateService.addItemToTemplate(this.selectedTemplate.id, formValue);
    }

    this.itemForm.reset({ category: 'Miscellaneous', quantityNeeded: 1 });
    this.showItemForm = false;
  }

  editItem(item: ChecklistItem): void {
    if (!this.selectedTemplate) return;
    this.editingItemId = item.id;
    this.itemForm.patchValue({
      name: item.name,
      category: item.category,
      quantityNeeded: item.quantityNeeded,
      notes: item.notes
    });
    this.showItemForm = true;
  }

  deleteItem(item: ChecklistItem): void {
    if (!this.selectedTemplate) return;
    if (confirm(`Delete item "${item.name}"?`)) {
      this.templateService.removeItemFromTemplate(this.selectedTemplate.id, item.id);
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
}
