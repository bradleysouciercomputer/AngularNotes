import { CommonModule, DatePipe } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Note } from './note-editor-dialog.component';

@Component({
  selector: 'app-note-viewer-dialog',
  standalone: true,
  imports: [CommonModule, DatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './note-viewer-dialog.component.html',
  styleUrl: './note-viewer-dialog.component.css'
})
export class NoteViewerDialogComponent {
  readonly data = inject<Note>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<void, NoteViewerDialogComponent>>(DialogRef);
  @ViewChild('materialDialog', { static: true }) private materialDialog!: ElementRef<HTMLElement & { close: () => void }>;

  close(): void {
    this.materialDialog.nativeElement.close();
  }

  onClosed(): void {
    this.dialogRef.close();
  }
}
