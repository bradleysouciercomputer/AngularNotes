import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Note } from './note-editor-dialog.component';
import { NoteShareRecord, SupabaseService } from './supabase.service';

interface NoteSharingDialogData {
  note: Note;
  ownerId: string;
  currentEmail: string;
}

@Component({
  selector: 'app-note-sharing-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './note-sharing-dialog.component.html',
  styleUrl: './note-sharing-dialog.component.css'
})
export class NoteSharingDialogComponent {
  readonly data = inject<NoteSharingDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<NoteSharingDialogComponent, boolean>>(MatDialogRef);
  private readonly supabase = inject(SupabaseService);

  readonly shares = signal<NoteShareRecord[]>([]);
  readonly email = signal('');
  readonly role = signal<'viewer' | 'editor'>('viewer');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  private changed = false;

  constructor() {
    void this.loadShares();
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }
    return fallback;
  }

  async loadShares(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.shares.set(await this.supabase.listNoteShares(this.data.ownerId, this.data.note.id));
    } catch (error) {
      this.error.set(this.errorMessage(error, 'Could not load collaborators.'));
    } finally {
      this.loading.set(false);
    }
  }

  async addCollaborator(): Promise<void> {
    this.error.set('');
    this.message.set('');
    const email = this.email().trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.error.set('Enter a valid email address.');
      return;
    }
    if (email === (this.data.currentEmail || '').trim().toLowerCase()) {
      this.error.set('You already own this note.');
      return;
    }

    this.saving.set(true);
    try {
      await this.supabase.addNoteShare(this.data.ownerId, this.data.note.id, email, this.role());
      await this.loadShares();
      this.email.set('');
      this.role.set('viewer');
      this.changed = true;
      this.message.set('Access saved for ' + email + '. They can see this note after signing in with that email address.');
    } catch (error) {
      this.error.set(this.errorMessage(error, 'Could not share this note.'));
    } finally {
      this.saving.set(false);
    }
  }

  async changeRole(share: NoteShareRecord, role: 'viewer' | 'editor'): Promise<void> {
    if (share.role === role) return;
    this.error.set('');
    this.saving.set(true);
    try {
      await this.supabase.updateNoteShareRole(share.id, role);
      this.shares.update((current) => current.map((item) => item.id === share.id ? { ...item, role } : item));
      this.changed = true;
    } catch (error) {
      this.error.set(this.errorMessage(error, 'Could not update this role.'));
    } finally {
      this.saving.set(false);
    }
  }

  async removeCollaborator(share: NoteShareRecord): Promise<void> {
    this.error.set('');
    this.saving.set(true);
    try {
      await this.supabase.revokeNoteShare(share.id);
      this.shares.update((current) => current.filter((item) => item.id !== share.id));
      this.changed = true;
      this.message.set('Access revoked for ' + share.invited_email + '.');
    } catch (error) {
      this.error.set(this.errorMessage(error, 'Could not revoke access.'));
    } finally {
      this.saving.set(false);
    }
  }

  close(): void {
    this.dialogRef.close(this.changed);
  }
}
