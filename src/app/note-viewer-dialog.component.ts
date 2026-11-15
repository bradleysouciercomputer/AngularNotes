import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import type { Note, NoteAttachment } from './note-editor-dialog.component';
import { SupabaseService } from './supabase.service';

@Component({
  selector: 'app-note-viewer-dialog',
  standalone: true,
  imports: [CommonModule, DatePipe, MatButtonModule, MatChipsModule, MatDialogModule, MatIconModule],
  templateUrl: './note-viewer-dialog.component.html',
  styleUrl: './note-viewer-dialog.component.css'
})
export class NoteViewerDialogComponent {
  readonly data = inject<Note>(MAT_DIALOG_DATA);
  private readonly supabase = inject(SupabaseService);
  downloadingAttachmentId: string | null = null;
  attachmentError = '';

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

  formatAttachmentSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  attachmentIcon(attachment: NoteAttachment): string {
    const mime = attachment.mimeType.toLowerCase();
    const name = attachment.name.toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'movie';
    if (mime.startsWith('audio/')) return 'audio_file';
    if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'picture_as_pdf';
    if (/\\.(docx?|odt|rtf|txt|md)$/.test(name)) return 'description';
    if (/\\.(xlsx?|csv|ods)$/.test(name)) return 'table_chart';
    return 'insert_drive_file';
  }
}
