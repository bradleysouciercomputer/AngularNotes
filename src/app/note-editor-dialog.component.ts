import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  trashed: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NoteDraft = Pick<Note, 'title' | 'content' | 'tags' | 'pinned' | 'favorite'>;

@Component({
  selector: 'app-note-editor-dialog',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatCheckboxModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './note-editor-dialog.component.html',
  styleUrl: './note-editor-dialog.component.css'
})
export class NoteEditorDialogComponent {
  readonly data = inject<Note>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<NoteEditorDialogComponent, NoteDraft>>(MatDialogRef);

  title = this.data.title;
  content = this.data.content;
  tagsText = this.data.tags.join(', ');
  pinned = this.data.pinned;
  favorite = this.data.favorite;

  save(): void {
    const tags = [...new Set(this.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean))];
    this.dialogRef.close({
      title: this.title,
      content: this.content,
      tags,
      pinned: this.pinned,
      favorite: this.favorite
    });
  }
}