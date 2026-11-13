import { CommonModule, DatePipe } from '@angular/common';
import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
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

export type NoteView = 'all' | 'recent' | 'favorites' | 'pinned' | 'reminders' | 'archive' | 'trash';
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
        .filter((entry) => typeof entry.text === 'string')
        .map((entry, index) => ({
          id: typeof entry.id === 'string' ? entry.id : 'item-' + index,
          text: entry.text,
          checked: Boolean(entry.checked)
        })) : [],
      pinned: Boolean(item.pinned),
      favorite: Boolean(item.favorite),
      archived: Boolean(item.archived),
      trashed: Boolean(item.trashed),
      reminderDate: typeof item.reminderDate === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(item.reminderDate) ? item.reminderDate : undefined,
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
  readonly activeTag = signal<string | null>(null);
  readonly availableTags = computed(() => {
    const tags = new Set<string>();
    for (const note of this.notes()) {
      if (note.trashed || note.archived) continue;
      for (const tag of note.tags) {
        const cleaned = tag.trim();
        if (cleaned) tags.add(cleaned);
      }
    }
    return Array.from(tags).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  });

  readonly viewTitle = computed(() => {
    const tag = this.activeTag();
    if (tag) return tag;
    return ({
      all: 'Notes', recent: 'Recent', favorites: 'Favorites',
      pinned: 'Pinned', reminders: 'Reminders', archive: 'Archive', trash: 'Trash'
    })[this.activeView()];
  });

  readonly visibleNotes = computed(() => {
    const selectedView = this.activeView();
    const selectedTag = this.activeTag();
    const query = this.searchTerm().trim().toLocaleLowerCase();
    const filtered = this.notes().filter((note) => {
      if (selectedView === 'trash') return note.trashed;
      if (note.trashed) return false;
      if (selectedView === 'archive') return note.archived;
      if (note.archived) return false;
      if (selectedView === 'reminders' && !note.reminderDate) return false;
      if (selectedView === 'favorites' && !note.favorite) return false;
      if (selectedView === 'pinned' && !note.pinned) return false;
      if (selectedView === 'recent' && Date.now() - note.updatedAt > 1000 * 60 * 60 * 24 * 14) return false;
      if (selectedTag && !note.tags.some((tag) => tag.toLocaleLowerCase() === selectedTag.toLocaleLowerCase())) return false;
      if (!query) return true;
      return [note.title, note.content, ...note.tags].join(' ').toLocaleLowerCase().includes(query);
    });
    const mode = this.sortMode();
    return filtered.sort((a, b) => {
      if (selectedView === 'reminders') return (a.reminderDate || '').localeCompare(b.reminderDate || '');
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
    if (view === 'reminders') return notes.filter((note) => Boolean(note.reminderDate) && !note.archived && !note.trashed).length;
    if (view === 'recent') return notes.filter((note) => !note.archived && !note.trashed && Date.now() - note.updatedAt <= 1000 * 60 * 60 * 24 * 14).length;
    return notes.filter((note) => !note.archived && !note.trashed).length;
  }

  setView(view: NoteView): void {
    this.activeView.set(view);
    this.activeTag.set(null);
    this.searchTerm.set('');
  }

  filterByTag(tag: string): void {
    this.activeView.set('all');
    this.activeTag.set(tag);
    this.searchTerm.set('');
  }

  tagCount(tag: string): number {
    return this.notes().filter((note) =>
      !note.archived && !note.trashed &&
      note.tags.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase())
    ).length;
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

  createFromTemplate(template: 'meeting' | 'journal' | 'project' | 'shopping'): void {
    const now = Date.now();
    const note: Note = {
      id: this.makeId(), title: '', content: '', tags: [], color: '#ffffff',
      type: 'text', checklistItems: [], pinned: false, favorite: false,
      archived: false, trashed: false, createdAt: now, updatedAt: now
    };

    if (template === 'meeting') {
      note.title = 'Meeting notes';
      note.content = 'Attendees:\n\nAgenda\n• \n\nDiscussion\n• \n\nDecisions\n• \n\nAction items\n• ';
      note.tags = ['Work', 'Meetings'];
      note.color = '#e8f0fe';
    } else if (template === 'journal') {
      note.title = 'Daily journal';
      note.content = 'Today I am grateful for…\n\nWhat happened today?\n\nWhat I learned\n\nOne thing for tomorrow';
      note.tags = ['Personal', 'Journal'];
      note.color = '#fef7d1';
    } else if (template === 'project') {
      note.title = 'Project plan';
      note.content = 'Goal\n\nMilestones\n1. \n2. \n3. \n\nPeople and resources\n\nRisks or blockers\n\nNext steps';
      note.tags = ['Work', 'Projects'];
      note.color = '#e6f4ea';
    } else {
      note.title = 'Shopping list';
      note.type = 'checklist';
      note.checklistItems = ['Produce', 'Pantry', 'Household'].map((text) => ({
        id: this.makeId('item'), text, checked: false
      }));
      note.tags = ['Shopping'];
      note.color = '#fef1e1';
    }
    this.openEditor(note);
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
  clearReminder(note: Note): void {
    this.patchNote(note.id, { reminderDate: undefined });
    this.snackBar.open('Reminder removed', 'Dismiss', { duration: 1800 });
  }

  private localDateString(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  isReminderOverdue(note: Note): boolean {
    return Boolean(note.reminderDate && note.reminderDate < this.localDateString());
  }

  isReminderToday(note: Note): boolean {
    return Boolean(note.reminderDate && note.reminderDate === this.localDateString());
  }

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

  private markdownForNote(note: Note): string {
    const lines = ['# ' + (note.title || 'Untitled note'), ''];
    if (note.tags.length) lines.push('*Labels: ' + note.tags.join(', ') + '*', '');
    if (note.reminderDate) lines.push('*Reminder: ' + note.reminderDate + '*', '');
    if (note.type === 'checklist') {
      lines.push(...(note.checklistItems || []).map((item) => '- [' + (item.checked ? 'x' : ' ') + '] ' + item.text));
    } else if (note.content.trim()) {
      lines.push(note.content.trim());
    }
    return lines.join('\n').trim() + '\n';
  }

  downloadNoteMarkdown(note: Note): void {
    const baseName = (note.title || 'untitled-note')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'untitled-note';
    this.downloadText(this.markdownForNote(note), baseName + '.md', 'text/markdown;charset=utf-8');
    this.snackBar.open('Markdown note downloaded', 'Dismiss', { duration: 1800 });
  }

  exportVisibleMarkdown(): void {
    const notes = this.visibleNotes();
    if (!notes.length) {
      this.snackBar.open('There are no visible notes to export.', 'Dismiss', { duration: 2000 });
      return;
    }
    const markdown = notes.map((note) => this.markdownForNote(note)).join('\n---\n\n');
    const date = new Date().toISOString().slice(0, 10);
    this.downloadText(markdown, 'angularnotes-' + date + '.md', 'text/markdown;charset=utf-8');
    this.snackBar.open('Exported ' + notes.length + ' notes as Markdown', 'Dismiss', { duration: 2200 });
  }

  private downloadText(content: string, filename: string, mimeType: string): void {
    const file = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
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
        reminderDate: typeof item['reminderDate'] === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(item['reminderDate']) ? item['reminderDate'] : undefined,
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

  showKeyboardShortcuts(): void {
    this.snackBar.open('Shortcuts: Ctrl/⌘ + N = new note · Ctrl/⌘ + Shift + L = checklist · Ctrl/⌘ + K = search', 'Got it', { duration: 6500 });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    const modifier = event.ctrlKey || event.metaKey;
    if (!modifier || event.altKey) return;

    const key = event.key.toLowerCase();
    if (key === 'k') {
      event.preventDefault();
      const search = document.querySelector<HTMLInputElement>('.search-field input');
      search?.focus();
      search?.select();
      return;
    }

    if (this.dialog.openDialogs.length > 0) return;
    const target = event.target as HTMLElement | null;
    const editingText = !!target && (
      target.matches('input, textarea, select') || target.isContentEditable
    );
    if (editingText) return;

    if (key === 'n' && !event.shiftKey) {
      event.preventDefault();
      this.createNote();
    } else if (key === 'l' && event.shiftKey) {
      event.preventDefault();
      this.createChecklist();
    }
  }
}