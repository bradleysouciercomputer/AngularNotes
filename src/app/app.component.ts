import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Note, NoteDraft, NoteEditorDialogComponent } from './note-editor-dialog.component';

export type NoteView = 'all' | 'recent' | 'favorites' | 'pinned' | 'archive' | 'trash';
export type SortMode = 'updated' | 'created' | 'title';

const STORAGE_KEY = 'angularnotes.notes.v1';
const NOTE_COLORS = [
  '#ffffff', '#fce8e6', '#fef1e1', '#fef7d1', '#e6f4ea',
  '#e4f7f5', '#e8f0fe', '#f3e8fd', '#fce8f3', '#f1f3f4'
];

function starterNotes(): Note[] {
  const now = Date.now();
  return [
    {
      id: 'starter-welcome',
      title: 'A little space for big ideas',
      content: 'Welcome to AngularNotes! This is your space to capture thoughts, keep track of plans, and collect the little things you do not want to forget.\n\nSelect this note to edit it, or create a fresh note whenever inspiration strikes.',
      tags: ['Getting started', 'Ideas'], color: '#fef7d1', type: 'text', checklistItems: [], pinned: true, favorite: true,
      archived: false, trashed: false, createdAt: now - 1000 * 60 * 60 * 3, updatedAt: now - 1000 * 60 * 60 * 3
    },
    {
      id: 'starter-weekly',
      title: 'A calmer weekly reset',
      content: '1. Clear the desk and close old tabs\n2. Write down the three most important things\n3. Make room for a proper break\n4. Celebrate what moved forward',
      tags: ['Personal', 'Planning'], color: '#e6f4ea', type: 'text', checklistItems: [], pinned: false, favorite: false,
      archived: false, trashed: false, createdAt: now - 1000 * 60 * 60 * 26, updatedAt: now - 1000 * 60 * 60 * 26
    },
    {
      id: 'starter-reading',
      title: 'Things worth exploring',
      content: 'A running list of ideas, references, and topics to come back to. Add links, snippets, or questions here as you discover them.',
      tags: ['Reference'], color: '#e8f0fe', type: 'text', checklistItems: [], pinned: false, favorite: false,
      archived: false, trashed: false, createdAt: now - 1000 * 60 * 60 * 52, updatedAt: now - 1000 * 60 * 60 * 52
    }
  ];
}

function readStoredNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return starterNotes();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return starterNotes();
    return parsed.filter((item): item is Note =>
      typeof item === 'object' && item !== null &&
      typeof (item as Note).id === 'string' &&
      typeof (item as Note).title === 'string' &&
      typeof (item as Note).content === 'string'
    ).map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      color: typeof item.color === 'string' && NOTE_COLORS.includes(item.color) ? item.color : '#ffffff',
      type: item.type === 'checklist' ? 'checklist' : 'text',
      checklistItems: Array.isArray(item.checklistItems) ? item.checklistItems
        .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null && typeof entry['text'] === 'string')
        .map((entry, index) => ({
          id: typeof entry['id'] === 'string' ? entry['id'] : 'item-' + index,
          text: String(entry['text']),
          checked: Boolean(entry['checked'])
        })) : [],
      pinned: Boolean(item.pinned),
      favorite: Boolean(item.favorite),
      archived: Boolean(item.archived),
      trashed: Boolean(item.trashed),
      createdAt: Number(item.createdAt) || Date.now(),
      updatedAt: Number(item.updatedAt) || Date.now()
    }));
  } catch {
    return starterNotes();
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, DatePipe, FormsModule, MatButtonModule, MatCardModule, MatCheckboxModule, MatChipsModule,
    MatDialogModule, MatDividerModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatListModule, MatMenuModule, MatSelectModule, MatSidenavModule, MatSnackBarModule,
    MatToolbarModule, MatTooltipModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly activeView = signal<NoteView>('all');
  readonly searchTerm = signal('');
  readonly sortMode = signal<SortMode>('updated');
  readonly layoutMode = signal<'grid' | 'list'>('grid');
  readonly notes = signal<Note[]>(readStoredNotes());

  readonly viewTitle = computed(() => ({
    all: 'Notes', recent: 'Recent', favorites: 'Favorites',
    pinned: 'Pinned', archive: 'Archive', trash: 'Trash'
  })[this.activeView()]);

  readonly visibleNotes = computed(() => {
    const selectedView = this.activeView();
    const query = this.searchTerm().trim().toLocaleLowerCase();
    const filtered = this.notes().filter((note) => {
      if (selectedView === 'trash') return note.trashed;
      if (note.trashed) return false;
      if (selectedView === 'archive') return note.archived;
      if (note.archived) return false;
      if (selectedView === 'favorites' && !note.favorite) return false;
      if (selectedView === 'pinned' && !note.pinned) return false;
      if (selectedView === 'recent' && Date.now() - note.updatedAt > 1000 * 60 * 60 * 24 * 14) return false;
      if (!query) return true;
      return [note.title, note.content, ...note.tags].join(' ').toLocaleLowerCase().includes(query);
    });
    const mode = this.sortMode();
    return filtered.sort((a, b) => {
      if (mode === 'title') return a.title.localeCompare(b.title);
      if (mode === 'created') return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt;
    });
  });

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notes()));
      } catch {
        this.snackBar.open('Browser storage is full. Export your notes to keep a backup.', 'Dismiss', { duration: 5000 });
      }
    });
  }

  count(view: NoteView): number {
    const notes = this.notes();
    if (view === 'trash') return notes.filter((note) => note.trashed).length;
    if (view === 'archive') return notes.filter((note) => note.archived && !note.trashed).length;
    if (view === 'favorites') return notes.filter((note) => note.favorite && !note.archived && !note.trashed).length;
    if (view === 'pinned') return notes.filter((note) => note.pinned && !note.archived && !note.trashed).length;
    if (view === 'recent') return notes.filter((note) => !note.archived && !note.trashed && Date.now() - note.updatedAt <= 1000 * 60 * 60 * 24 * 14).length;
    return notes.filter((note) => !note.archived && !note.trashed).length;
  }

  setView(view: NoteView): void {
    this.activeView.set(view);
    this.searchTerm.set('');
  }

  private makeId(prefix = 'note'): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  createNote(): void {
    const now = Date.now();
    this.openEditor({
      id: this.makeId(), title: '', content: '', tags: [], color: '#ffffff',
      type: 'text', checklistItems: [],
      pinned: false, favorite: false, archived: false, trashed: false,
      createdAt: now, updatedAt: now
    });
  }

  createChecklist(): void {
    const now = Date.now();
    this.openEditor({
      id: this.makeId(), title: '', content: '', tags: [], color: '#ffffff',
      type: 'checklist', checklistItems: [{ id: this.makeId('item'), text: '', checked: false }],
      pinned: false, favorite: false, archived: false, trashed: false,
      createdAt: now, updatedAt: now
    });
  }

  editNote(note: Note): void {
    this.openEditor({
      ...note,
      tags: [...note.tags],
      checklistItems: (note.checklistItems || []).map((item) => ({ ...item }))
    });
  }

  private openEditor(note: Note): void {
    const ref = this.dialog.open<NoteEditorDialogComponent, Note, NoteDraft>(
      NoteEditorDialogComponent,
      {
        data: note, width: '560px', maxWidth: 'calc(100vw - 28px)',
        autoFocus: 'first-tabbable', restoreFocus: true, panelClass: 'angularnotes-editor-panel'
      }
    );
    ref.afterClosed().subscribe((draft) => {
      if (!draft || (!draft.title.trim() && !draft.content.trim() && !draft.checklistItems.some((item) => item.text.trim()))) return;
      const saved: Note = {
        ...note, ...draft, title: draft.title.trim() || 'Untitled note',
        tags: draft.tags, updatedAt: Date.now()
      };
      this.notes.update((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      this.activeView.set('all');
      this.snackBar.open('Note saved', 'Dismiss', { duration: 1800 });
    });
  }

  togglePinned(note: Note): void { this.patchNote(note.id, { pinned: !note.pinned }); }
  toggleFavorite(note: Note): void { this.patchNote(note.id, { favorite: !note.favorite }); }

  toggleChecklistItem(note: Note, itemId: string, checked: boolean): void {
    const checklistItems = (note.checklistItems || []).map((item) =>
      item.id === itemId ? { ...item, checked } : { ...item }
    );
    this.patchNote(note.id, { checklistItems });
  }

  duplicateNote(note: Note): void {
    const now = Date.now();
    const copy: Note = {
      ...note,
      id: this.makeId(),
      title: note.title.trim() ? note.title.trim() + ' (copy)' : 'Untitled note (copy)',
      checklistItems: (note.checklistItems || []).map((item) => ({ ...item, id: this.makeId('item') })),
      pinned: false,
      favorite: false,
      archived: false,
      trashed: false,
      createdAt: now,
      updatedAt: now
    };
    this.notes.update((current) => [copy, ...current]);
    this.activeView.set('all');
    this.snackBar.open('Note duplicated', 'Dismiss', { duration: 1800 });
  }

  async copyNote(note: Note): Promise<void> {
    const checklistText = note.type === 'checklist'
      ? (note.checklistItems || []).map((item) => (item.checked ? '[x] ' : '[ ] ') + item.text).join('\n')
      : '';
    const text = [note.title, note.content, checklistText].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      this.snackBar.open('Note copied to clipboard', 'Dismiss', { duration: 1800 });
    } catch {
      this.snackBar.open('Clipboard access is unavailable in this browser.', 'Dismiss', { duration: 3000 });
    }
  }

  toggleArchive(note: Note): void {
    this.patchNote(note.id, { archived: !note.archived });
    this.snackBar.open(note.archived ? 'Note restored from archive' : 'Note moved to archive', 'Dismiss', { duration: 2000 });
  }

  moveToTrash(note: Note): void {
    this.patchNote(note.id, { trashed: true, archived: false });
    this.snackBar.open('Moved to trash', 'Undo', { duration: 4000 }).onAction().subscribe(() => {
      this.patchNote(note.id, { trashed: false });
    });
  }

  restoreNote(note: Note): void {
    this.patchNote(note.id, { trashed: false, archived: false });
    this.snackBar.open('Note restored', 'Dismiss', { duration: 1800 });
  }

  permanentlyDelete(note: Note): void {
    this.notes.update((current) => current.filter((item) => item.id !== note.id));
    this.snackBar.open('Note permanently deleted', 'Dismiss', { duration: 1800 });
  }

  emptyTrash(): void {
    const total = this.count('trash');
    if (total === 0 || !confirm('Permanently delete all ' + total + ' notes in the trash? This cannot be undone.')) return;
    this.notes.update((current) => current.filter((note) => !note.trashed));
    this.snackBar.open('Trash emptied', 'Dismiss', { duration: 1800 });
  }

  private patchNote(id: string, changes: Partial<Note>): void {
    this.notes.update((current) => current.map((note) =>
      note.id === id ? { ...note, ...changes, updatedAt: Date.now() } : note
    ));
  }

  exportNotes(): void {
    const file = new Blob([JSON.stringify(this.notes(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'angularnotes-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    anchor.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('Your notes backup is ready', 'Dismiss', { duration: 2200 });
  }

  async importNotes(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error('The file does not contain a note list.');
      const imported: Note[] = parsed.filter((item): item is Record<string, unknown> =>
        typeof item === 'object' && item !== null &&
        typeof item['title'] === 'string' && typeof item['content'] === 'string'
      ).map((item, index) => ({
        id: 'import-' + Date.now().toString(36) + '-' + index,
        title: String(item['title']),
        content: String(item['content']),
        tags: Array.isArray(item['tags']) ? item['tags'].filter((tag): tag is string => typeof tag === 'string') : [],
        color: typeof item['color'] === 'string' && NOTE_COLORS.includes(item['color']) ? item['color'] : '#ffffff',
        type: item['type'] === 'checklist' ? 'checklist' : 'text',
        checklistItems: Array.isArray(item['checklistItems']) ? item['checklistItems']
          .filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null && typeof entry['text'] === 'string')
          .map((entry, itemIndex) => ({
            id: typeof entry['id'] === 'string' ? entry['id'] : 'import-item-' + itemIndex,
            text: String(entry['text']),
            checked: Boolean(entry['checked'])
          })) : [],
        pinned: Boolean(item['pinned']),
        favorite: Boolean(item['favorite']),
        archived: Boolean(item['archived']),
        trashed: false,
        createdAt: Number(item['createdAt']) || Date.now(),
        updatedAt: Number(item['updatedAt']) || Date.now()
      }));
      if (imported.length === 0) throw new Error('No valid notes were found in that file.');
      this.notes.update((current) => [...imported, ...current]);
      this.setView('all');
      this.snackBar.open('Imported ' + imported.length + ' notes', 'Dismiss', { duration: 2600 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'That file could not be imported.';
      this.snackBar.open(message, 'Dismiss', { duration: 4000 });
    } finally {
      input.value = '';
    }
  }

  toggleLayout(): void { this.layoutMode.update((mode) => mode === 'grid' ? 'list' : 'grid'); }
  trackById(_index: number, note: Note): string { return note.id; }
  trackByChecklistItem(_index: number, item: { id: string }): string { return item.id; }
  completedChecklistCount(note: Note): number {
    return (note.checklistItems || []).filter((item) => item.checked).length;
  }

  showStorageInfo(): void {
    this.snackBar.open('Your notes are stored in this browser on this device. Use Export notes to create a backup.', 'Got it', { duration: 5000 });
  }
}