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
import { SupabaseService } from './supabase.service';

export interface NoteAttachment {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
}

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
  attachments?: NoteAttachment[];
  ownerId?: string;
  shareRole?: 'owner' | 'editor' | 'viewer';
}

export type NoteDraft = Pick<Note, 'title' | 'content' | 'tags' | 'color' | 'type' | 'checklistItems' | 'pinned' | 'favorite' | 'reminderDate' | 'attachments'> & { removedAttachmentPaths?: string[] };

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
  private readonly supabase = inject(SupabaseService);

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
  attachments: NoteAttachment[] = (this.data.attachments ?? []).map((attachment) => ({ ...attachment }));
  pendingAttachments: File[] = [];
  removedAttachments: NoteAttachment[] = [];
  attachmentError = '';
  attachmentBusy = false;
  downloadingAttachmentId: string | null = null;

  get attachmentCount(): number { return this.attachments.length + this.pendingAttachments.length; }
  get canManageAttachments(): boolean { return this.data.shareRole !== 'viewer'; }

  onAttachmentFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    input.value = '';
    if (!selected.length) return;
    const accepted: File[] = [];
    const errors: string[] = [];
    for (const file of selected) {
      if (file.size > 20 * 1024 * 1024) { errors.push(file.name + ' is larger than 20 MB.'); continue; }
      if (this.attachments.length + this.pendingAttachments.length + accepted.length >= 20) {
        errors.push('A note can have up to 20 attachments.'); break;
      }
      accepted.push(file);
    }
    this.pendingAttachments = [...this.pendingAttachments, ...accepted];
    this.attachmentError = errors.join(' ');
  }

  removePendingAttachment(file: File): void {
    this.pendingAttachments = this.pendingAttachments.filter((item) => item !== file);
    this.attachmentError = '';
  }

  removeSavedAttachment(attachment: NoteAttachment): void {
    this.attachments = this.attachments.filter((item) => item.id !== attachment.id);
    if (!this.removedAttachments.some((item) => item.path === attachment.path)) this.removedAttachments = [...this.removedAttachments, attachment];
    this.attachmentError = '';
  }

  formatAttachmentSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(bytes < 10240 ? 1 : 0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0) + ' MB';
  }

  attachmentIcon(attachment: Pick<NoteAttachment, 'mimeType' | 'name'>): string {
    const mime = (attachment.mimeType || '').toLowerCase();
    const name = attachment.name.toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'movie';
    if (mime.startsWith('audio/')) return 'audio_file';
    if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'picture_as_pdf';
    if (/(word|document|officedocument|text\\/)/.test(mime) || /\\.(docx?|odt|rtf|txt|md)$/.test(name)) return 'description';
    if (/(sheet|excel|spreadsheet)/.test(mime) || /\\.(xlsx?|csv|ods)$/.test(name)) return 'table_chart';
    return 'insert_drive_file';
  }

  async downloadAttachment(attachment: NoteAttachment): Promise<void> {
    this.downloadingAttachmentId = attachment.id;
    this.attachmentError = '';
    try {
      const blob = await this.supabase.downloadNoteAttachment(attachment.path);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = attachment.name;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      this.attachmentError = error instanceof Error ? error.message : 'Could not download this attachment.';
    } finally {
      this.downloadingAttachmentId = null;
    }
  }

  get wordCount(): number {
    const text = this.type === 'checklist'
      ? this.checklistItems.map((item) => item.text).join(' ')
      : this.content;
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  get characterCount(): number {
    return this.type === 'checklist'
      ? this.checklistItems.reduce((total, item) => total + item.text.length, 0)
      : this.content.length;
  }

  setReminderPreset(daysFromToday: number): void {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + daysFromToday);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    this.reminderDate = year + '-' + month + '-' + day;
  }

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

  async save(): Promise<void> {
    if (this.attachmentBusy) return;
    this.attachmentBusy = true;
    this.attachmentError = '';
    this.dialogRef.disableClose = true;
    const uploaded: NoteAttachment[] = [];
    try {
      if (this.pendingAttachments.length || this.removedAttachments.length) {
        const { data, error } = await this.supabase.client.auth.getUser();
        if (error) throw error;
        if (!data.user) throw new Error('Sign in again before changing note attachments.');
        const ownerId = this.data.ownerId || data.user.id;
        for (const file of this.pendingAttachments) uploaded.push(await this.supabase.uploadNoteAttachment(ownerId, this.data.id, file));
      }
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
      reminderDate: this.reminderDate || undefined,
      attachments: [...this.attachments, ...uploaded],
      removedAttachmentPaths: this.removedAttachments.map((attachment) => attachment.path)
      });
    } catch (error) {
      if (uploaded.length) {
        try { await this.supabase.removeNoteAttachments(uploaded.map((attachment) => attachment.path)); } catch { /* Keep note metadata unchanged if cleanup fails. */ }
      }
      this.attachmentError = error instanceof Error ? error.message : 'Could not save note attachments.';
    } finally {
      this.attachmentBusy = false;
      this.dialogRef.disableClose = false;
    }
  }
}