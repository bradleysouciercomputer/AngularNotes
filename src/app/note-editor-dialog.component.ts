import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  color: string;
  type: 'text' | 'checklist';
  checklistItems: { id: string; text: string; checked: boolean }[];
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  trashed: boolean;
  createdAt: number;
  updatedAt: number;
  reminderDate?: string;
}

export type NoteDraft = Pick<Note, 'title' | 'content' | 'tags' | 'color' | 'type' | 'checklistItems' | 'pinned' | 'favorite' | 'reminderDate'>;

@Component({
  selector: 'app-note-editor-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCheckboxModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTooltipModule],
  templateUrl: './note-editor-dialog.component.html',
  styleUrl: './note-editor-dialog.component.css'
})
export class NoteEditorDialogComponent {
  readonly data = inject<Note>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<NoteEditorDialogComponent, NoteDraft>>(MatDialogRef);

  readonly colorOptions = [
    { label: 'Default', value: '#ffffff' },
    { label: 'Red', value: '#fce8e6' },
    { label: 'Orange', value: '#fef1e1' },
    { label: 'Yellow', value: '#fef7d1' },
    { label: 'Green', value: '#e6f4ea' },
    { label: 'Teal', value: '#e4f7f5' },
    { label: 'Blue', value: '#e8f0fe' },
    { label: 'Purple', value: '#f3e8fd' },
    { label: 'Pink', value: '#fce8f3' },
    { label: 'Gray', value: '#f1f3f4' }
  ];

  title = this.data.title;
  content = this.data.content;
  tagsText = this.data.tags.join(', ');
  color = this.data.color || '#ffffff';
  type: 'text' | 'checklist' = this.data.type || 'text';
  checklistItems = (this.data.checklistItems || []).map((item) => ({ ...item }));
  pinned = this.data.pinned;
  favorite = this.data.favorite;
  reminderDate = this.data.reminderDate || '';

  addChecklistItem(): void {
    this.checklistItems = [...this.checklistItems, {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : 'item-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      text: '',
      checked: false
    }];
  }

  removeChecklistItem(id: string): void {
    this.checklistItems = this.checklistItems.filter((item) => item.id !== id);
  }

  hasChecklistText(): boolean {
    return this.checklistItems.some((item) => item.text.trim().length > 0);
  }

  hasCompletedChecklistItems(): boolean {
    return this.checklistItems.some((item) => item.checked);
  }

  moveCompletedToBottom(): void {
    this.checklistItems = [
      ...this.checklistItems.filter((item) => !item.checked),
      ...this.checklistItems.filter((item) => item.checked)
    ];
  }

  clearCompletedChecklistItems(): void {
    this.checklistItems = this.checklistItems.filter((item) => !item.checked);
  }

  save(): void {
    const tags = [...new Set(this.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean))];
    this.dialogRef.close({
      title: this.title,
      content: this.content,
      tags,
      color: this.color,
      type: this.type,
      checklistItems: this.checklistItems.filter((item) => item.text.trim()).map((item) => ({ ...item, text: item.text.trim() })),
      pinned: this.pinned,
      favorite: this.favorite,
      reminderDate: this.reminderDate || undefined
    });
  }
}