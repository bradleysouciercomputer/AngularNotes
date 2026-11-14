import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { Note } from './note-editor-dialog.component';

@Component({
  selector: 'app-note-viewer-dialog',
  standalone: true,
  imports: [CommonModule, DatePipe, MatButtonModule, MatChipsModule, MatDialogModule, MatIconModule],
  templateUrl: './note-viewer-dialog.component.html',
  styleUrl: './note-viewer-dialog.component.css'
})
export class NoteViewerDialogComponent {
  readonly data = inject<Note>(MAT_DIALOG_DATA);
}
