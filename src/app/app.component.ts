import { CommonModule, DatePipe } from '@angular/common';
import type { User } from '@supabase/supabase-js';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
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
import { SupabaseService } from './supabase.service';
import { NoteSharingDialogComponent } from './note-sharing-dialog.component';

export type NoteView = 'all' | 'recent' | 'favorites' | 'pinned' | 'reminders' | 'archive' | 'trash' | 'shared';
export type SortMode = 'updated' | 'updated-asc' | 'created' | 'created-asc' | 'title' | 'title-desc' | 'reminder' | 'manual';
export type NoteTypeFilter = 'all' | 'text' | 'checklist';

const STORAGE_KEY = 'angularnotes.notes.v1';
const NOTE_COLOR_OPTIONS = [
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
const NOTE_COLORS: string[] = NOTE_COLOR_OPTIONS.map((option) => option.value);

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

function normalizeNotes(parsed: unknown): Note[] {
  if (!Array.isArray(parsed)) return [];
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
    reminderDate: typeof item.reminderDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.reminderDate) ? item.reminderDate : undefined,
    ownerId: typeof item.ownerId === 'string' ? item.ownerId : undefined,
    shareRole: item.shareRole === 'viewer' || item.shareRole === 'editor' || item.shareRole === 'owner' ? item.shareRole : undefined,
    createdAt: Number(item.createdAt) || Date.now(),
    updatedAt: Number(item.updatedAt) || Date.now()
  }));
}

function readStoredNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeNotes(JSON.parse(raw)) : starterNotes();
  } catch {
    return starterNotes();
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, DatePipe, DragDropModule, FormsModule, MatButtonModule, MatCardModule, MatCheckboxModule, MatChipsModule,
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
  private readonly supabase = inject(SupabaseService);

  readonly activeView = signal<NoteView>('all');
  readonly searchTerm = signal('');
  readonly sortMode = signal<SortMode>('updated');
  readonly noteTypeFilter = signal<NoteTypeFilter>('all');
  readonly noteColorOptions = NOTE_COLOR_OPTIONS;
  readonly layoutMode = signal<'grid' | 'list'>('grid');
  readonly notes = signal<Note[]>(readStoredNotes());
  readonly authReady = signal(false);
  readonly currentUser = signal<User | null>(null);
  readonly authMode = signal<'signin' | 'signup'>('signin');
  readonly recoveryMode = signal(false);
  readonly authEmail = signal('');
  readonly authPassword = signal('');
  readonly newPassword = signal('');
  readonly authBusy = signal(false);
  readonly authError = signal('');
  readonly authMessage = signal('');
  readonly cloudStatus = signal<'loading' | 'saving' | 'saved' | 'error' | 'idle'>('loading');
  readonly cloudSyncReady = signal(false);
  private activeUserId: string | null | undefined;
  private activatingUserId: string | null | undefined;
  private authGeneration = 0;
  private cloudSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private realtimeReloadTimer: ReturnType<typeof setTimeout> | null = null;
  private cloudWriteInProgress = false;
  private lastSyncedSnapshot = '';
  private notesChannel: ReturnType<SupabaseService['subscribeToNotes']> | null = null;
  readonly activeTag = signal<string | null>(null);
  readonly selectionMode = signal(false);
  readonly selectedNoteIds = signal<string[]>([]);
  readonly selectedNotes = computed(() => {
    const selected = new Set(this.selectedNoteIds());
    return this.notes().filter((note) => selected.has(note.id));
  });
  readonly selectedAllFavorited = computed(() =>
    this.selectedNotes().length > 0 && this.selectedNotes().every((note) => note.favorite)
  );
  readonly selectedAllPinned = computed(() =>
    this.selectedNotes().length > 0 && this.selectedNotes().every((note) => note.pinned)
  );
  readonly selectedReminderCount = computed(() =>
    this.selectedNotes().filter((note) => Boolean(note.reminderDate)).length
  );
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
      pinned: 'Pinned', reminders: 'Reminders', archive: 'Archive', trash: 'Trash', shared: 'Shared with me'
    })[this.activeView()];
  });

  readonly visibleNotes = computed(() => {
    const selectedView = this.activeView();
    const selectedTag = this.activeTag();
    const typeFilter = this.noteTypeFilter();
    const query = this.searchTerm().trim().toLocaleLowerCase();
    const currentUserId = this.currentUser()?.id;
    const filtered = this.notes().filter((note) => {
      const isShared = Boolean(note.ownerId && note.ownerId !== currentUserId);
      if (selectedView === 'shared') {
        if (!isShared) return false;
      } else if (isShared) {
        return false;
      }
      if (selectedView === 'trash') {
        if (!note.trashed) return false;
      } else {
        if (note.trashed) return false;
        if (selectedView === 'archive') {
          if (!note.archived) return false;
        } else if (selectedView !== 'shared' && note.archived) {
          return false;
        }
      }
      if (typeFilter === 'text' && note.type !== 'text') return false;
      if (typeFilter === 'checklist' && note.type !== 'checklist') return false;
      if (selectedView === 'reminders' && !note.reminderDate) return false;
      if (selectedView === 'favorites' && !note.favorite) return false;
      if (selectedView === 'pinned' && !note.pinned) return false;
      if (selectedView === 'recent' && Date.now() - note.updatedAt > 1000 * 60 * 60 * 24 * 14) return false;
      if (selectedTag && !note.tags.some((tag) => tag.toLocaleLowerCase() === selectedTag.toLocaleLowerCase())) return false;
      if (!query) return true;
      return this.matchesSearch(note, query);
    });
    const mode = this.sortMode();
    if (mode === 'manual') return filtered;
    return filtered.sort((a, b) => {
      if (mode === 'reminder') {
        return (a.reminderDate || '9999-12-31').localeCompare(b.reminderDate || '9999-12-31');
      }
      if (selectedView === 'reminders') return (a.reminderDate || '').localeCompare(b.reminderDate || '');
      if (mode === 'title') return a.title.localeCompare(b.title);
      if (mode === 'title-desc') return b.title.localeCompare(a.title);
      if (mode === 'created') return b.createdAt - a.createdAt;
      if (mode === 'created-asc') return a.createdAt - b.createdAt;
      if (mode === 'updated-asc') return a.updatedAt - b.updatedAt;
      return b.updatedAt - a.updatedAt;
    });
  });

  private matchesSearch(note: Note, query: string): boolean {
    const tokens = query.match(/"[^"]+"|'[^']+'|\S+/g) || [];
    const textTerms: string[] = [];
    const tagTerms: string[] = [];
    let requiredType: NoteTypeFilter = 'all';
    let requiresPinned = false;
    let requiresFavorite = false;
    let requiresReminder = false;
    let requiresChecklist = false;

    for (const rawToken of tokens) {
      const token = rawToken.replace(/^["']|["']$/g, '');
      if (token.startsWith('tag:') && token.length > 4) {
        tagTerms.push(token.slice(4));
      } else if (token.startsWith('type:')) {
        const type = token.slice(5);
        if (type === 'text' || type === 'checklist') requiredType = type;
        else textTerms.push(token);
      } else if (token === 'is:pinned') {
        requiresPinned = true;
      } else if (token === 'is:favorite') {
        requiresFavorite = true;
      } else if (token === 'has:reminder') {
        requiresReminder = true;
      } else if (token === 'has:checklist') {
        requiresChecklist = true;
      } else {
        textTerms.push(token);
      }
    }

    if (requiredType !== 'all' && note.type !== requiredType) return false;
    if (requiresPinned && !note.pinned) return false;
    if (requiresFavorite && !note.favorite) return false;
    if (requiresReminder && !note.reminderDate) return false;
    if (requiresChecklist && note.type !== 'checklist') return false;
    if (tagTerms.some((term) => !note.tags.some((tag) => tag.toLocaleLowerCase().includes(term)))) return false;

    const checklistText = (note.checklistItems || []).map((item) => item.text).join(' ');
    const haystack = [note.title, note.content, checklistText, note.reminderDate || '', ...note.tags]
      .join(' ').toLocaleLowerCase();
    return textTerms.every((term) => haystack.includes(term));
  }

  readonly allVisibleSelected = computed(() => {
    const visible = this.visibleNotes();
    const selected = new Set(this.selectedNoteIds());
    return visible.length > 0 && visible.every((note) => selected.has(note.id));
  });

  constructor() {
    effect(() => {
      const user = this.currentUser();
      const ready = this.cloudSyncReady() || this.cloudStatus() === 'error';
      const notes = this.notes();
      if (!user || !ready) return;
      try {
        localStorage.setItem(this.userStorageKey(user.id), JSON.stringify(notes));
      } catch {
        this.snackBar.open('This device could not update its local note cache. Your cloud notes remain available.', 'Dismiss', { duration: 5000 });
      }
    });

    effect(() => {
      const user = this.currentUser();
      const ready = this.cloudSyncReady();
      const notes = this.notes();
      if (!user || !ready) return;
      const snapshot = JSON.stringify(notes);
      if (snapshot === this.lastSyncedSnapshot) return;
      if (this.cloudSaveTimer) clearTimeout(this.cloudSaveTimer);
      this.cloudStatus.set('saving');
      const userId = user.id;
      this.cloudSaveTimer = setTimeout(() => {
        this.cloudSaveTimer = null;
        void this.persistCloudNotes(userId, notes, snapshot);
      }, 450);
    });

    void this.initializeAuth();
  }

  private userStorageKey(userId: string): string {
    return STORAGE_KEY + '.user.' + userId;
  }

  private readCachedNotes(key: string): Note[] {
    try {
      const raw = localStorage.getItem(key);
      return raw ? normalizeNotes(JSON.parse(raw)) : [];
    } catch {
      return [];
    }
  }

  private async initializeAuth(): Promise<void> {
    this.supabase.client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') this.recoveryMode.set(true);
      if (event === 'SIGNED_OUT') this.recoveryMode.set(false);
      // Defer database work until Supabase has finished its auth callback.
      void Promise.resolve().then(() => this.activateUser(session?.user ?? null));
    });

    try {
      const { data, error } = await this.supabase.client.auth.getSession();
      if (error) throw error;
      await this.activateUser(data.session?.user ?? null);
    } catch (error) {
      this.authError.set(this.errorMessage(error, 'Could not initialize sign-in.'));
      this.authReady.set(true);
    }
  }

  private async activateUser(user: User | null, force = false): Promise<void> {
    const userId = user?.id ?? null;
    if (this.activatingUserId === userId) return;
    if (!force && this.activeUserId === userId && this.authReady()) return;

    const generation = ++this.authGeneration;
    this.activatingUserId = userId;
    if (this.cloudSaveTimer) clearTimeout(this.cloudSaveTimer);
    this.cloudSaveTimer = null;
    if (this.realtimeReloadTimer) clearTimeout(this.realtimeReloadTimer);
    this.realtimeReloadTimer = null;
    this.cloudSyncReady.set(false);
    this.currentUser.set(user);

    if (this.notesChannel) {
      void this.supabase.client.removeChannel(this.notesChannel);
      this.notesChannel = null;
    }

    if (!user) {
      this.activeUserId = null;
      this.lastSyncedSnapshot = '';
      this.notes.set(starterNotes());
      this.cloudStatus.set('idle');
      this.authReady.set(true);
      this.activatingUserId = undefined;
      return;
    }

    this.cloudStatus.set('loading');
    let cachedNotes: Note[] = [];
    try {
      const cacheKey = this.userStorageKey(user.id);
      const hasUserCache = localStorage.getItem(cacheKey) !== null;
      const hasLegacyCache = localStorage.getItem(STORAGE_KEY) !== null;
      cachedNotes = this.readCachedNotes(hasUserCache ? cacheKey : STORAGE_KEY);
      if (!hasUserCache && !hasLegacyCache) cachedNotes = [];
      this.notes.set(cachedNotes.length ? cachedNotes : (hasUserCache || hasLegacyCache ? [] : starterNotes()));

      const remoteNotes = await this.supabase.loadNotes(user.id);
      if (generation !== this.authGeneration || this.currentUser()?.id !== user.id) return;

      let mergedNotes: Note[];
      if (remoteNotes.length === 0) {
        mergedNotes = cachedNotes.length
          ? cachedNotes
          : (hasUserCache || hasLegacyCache ? [] : starterNotes());
      } else {
        const mergedById = new Map(remoteNotes.map((note) => [note.id, note]));
        for (const localNote of cachedNotes) {
          const remoteNote = mergedById.get(localNote.id);
          if (!remoteNote || localNote.updatedAt > remoteNote.updatedAt) {
            mergedById.set(localNote.id, localNote);
          }
        }
        mergedNotes = Array.from(mergedById.values());
      }

      this.notes.set(mergedNotes);
      const remoteSnapshot = JSON.stringify(remoteNotes);
      const mergedSnapshot = JSON.stringify(mergedNotes);
      if (remoteSnapshot !== mergedSnapshot) {
        await this.supabase.syncNotes(user.id, mergedNotes);
      }
      if (generation !== this.authGeneration || this.currentUser()?.id !== user.id) return;

      this.lastSyncedSnapshot = mergedSnapshot;
      this.activeUserId = user.id;
      localStorage.setItem(cacheKey, JSON.stringify(mergedNotes));
      localStorage.removeItem(STORAGE_KEY);
      this.cloudStatus.set('saved');
      this.cloudSyncReady.set(true);
      this.notesChannel = this.supabase.subscribeToNotes(user.id, () => this.scheduleCloudReload(user.id));
    } catch (error) {
      if (generation !== this.authGeneration) return;
      if (cachedNotes.length) this.notes.set(cachedNotes);
      this.activeUserId = undefined;
      this.cloudStatus.set('error');
      this.snackBar.open(
        'Could not sync your notes with the cloud. Your device copy is being kept safe.',
        'Retry',
        { duration: 7000 }
      ).onAction().subscribe(() => this.retryCloudSync());
    } finally {
      if (generation === this.authGeneration) {
        this.authReady.set(true);
        this.activatingUserId = undefined;
      }
    }
  }

  private async persistCloudNotes(userId: string, notes: Note[], snapshot: string): Promise<void> {
    if (this.currentUser()?.id !== userId || !this.cloudSyncReady()) return;
    this.cloudWriteInProgress = true;
    try {
      await this.supabase.syncNotes(userId, notes);
      if (this.currentUser()?.id === userId) {
        this.lastSyncedSnapshot = snapshot;
        this.cloudStatus.set('saved');
      }
    } catch (error) {
      if (this.currentUser()?.id === userId) {
        this.cloudStatus.set('error');
        this.snackBar.open(
          'A cloud save failed. Your changes are cached on this device.',
          'Retry',
          { duration: 7000 }
        ).onAction().subscribe(() => this.retryCloudSync());
      }
    } finally {
      this.cloudWriteInProgress = false;
    }
  }

  private scheduleCloudReload(userId: string): void {
    if (this.cloudWriteInProgress || this.cloudSaveTimer) return;
    if (this.realtimeReloadTimer) clearTimeout(this.realtimeReloadTimer);
    this.realtimeReloadTimer = setTimeout(async () => {
      this.realtimeReloadTimer = null;
      if (this.currentUser()?.id !== userId || !this.cloudSyncReady() || this.cloudSaveTimer) return;
      try {
        const remoteNotes = await this.supabase.loadNotes(userId);
        if (this.currentUser()?.id !== userId || this.cloudSaveTimer) return;
        const remoteSnapshot = JSON.stringify(remoteNotes);
        if (remoteSnapshot !== JSON.stringify(this.notes())) {
          this.lastSyncedSnapshot = remoteSnapshot;
          this.notes.set(remoteNotes);
        }
      } catch {
        // Keep the current device copy visible when a realtime refresh is temporarily unavailable.
      }
    }, 300);
  }

  async retryCloudSync(): Promise<void> {
    const user = this.currentUser();
    if (!user) return;
    await this.activateUser(user, true);
  }

  async submitAuth(): Promise<void> {
    this.authError.set('');
    this.authMessage.set('');
    const email = this.authEmail().trim();
    const password = this.authPassword();
    if (!email || !password) return;

    this.authBusy.set(true);
    try {
      if (this.authMode() === 'signup') {
        const { data, error } = await this.supabase.signUp(email, password);
        if (error) throw error;
        if (data.session && data.user) {
          await this.activateUser(data.user);
        } else {
          this.authMessage.set('Your account was created. Check your email for the confirmation link, then return here to sign in.');
          this.authMode.set('signin');
          this.authPassword.set('');
        }
      } else {
        const { data, error } = await this.supabase.signIn(email, password);
        if (error) throw error;
        if (data.user) await this.activateUser(data.user);
      }
    } catch (error) {
      this.authError.set(this.errorMessage(error, 'Sign-in failed. Please try again.'));
    } finally {
      this.authBusy.set(false);
    }
  }

  async sendPasswordReset(): Promise<void> {
    this.authError.set('');
    this.authMessage.set('');
    const email = this.authEmail().trim();
    if (!email) {
      this.authError.set('Enter your email address first.');
      return;
    }
    this.authBusy.set(true);
    try {
      const { error } = await this.supabase.sendPasswordReset(email);
      if (error) throw error;
      this.authMessage.set('Password reset email sent. Follow the link to choose a new password.');
    } catch (error) {
      this.authError.set(this.errorMessage(error, 'Could not send a password reset email.'));
    } finally {
      this.authBusy.set(false);
    }
  }

  async completePasswordRecovery(): Promise<void> {
    this.authError.set('');
    this.authMessage.set('');
    if (this.newPassword().length < 6) {
      this.authError.set('Choose a password with at least 6 characters.');
      return;
    }
    this.authBusy.set(true);
    try {
      const { error } = await this.supabase.updatePassword(this.newPassword());
      if (error) throw error;
      this.recoveryMode.set(false);
      this.newPassword.set('');
      this.authMessage.set('Your password has been updated.');
    } catch (error) {
      this.authError.set(this.errorMessage(error, 'Could not update your password.'));
    } finally {
      this.authBusy.set(false);
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabase.signOut();
      if (error) throw error;
    } catch (error) {
      this.snackBar.open(this.errorMessage(error, 'Could not sign out.'), 'Dismiss', { duration: 4500 });
    }
  }

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  count(view: NoteView): number {
    const notes = this.notes();
    if (view === 'shared') return notes.filter((note) => Boolean(note.ownerId && note.ownerId !== this.currentUser()?.id) && !note.trashed).length;
    if (view === 'trash') return notes.filter((note) => note.trashed && (!note.ownerId || note.ownerId === this.currentUser()?.id)).length;
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
    this.clearSelectionMode();
  }

  setSearchTerm(value: string): void {
    if (value !== this.searchTerm()) this.selectedNoteIds.set([]);
    this.searchTerm.set(value);
  }

  setNoteTypeFilter(value: NoteTypeFilter): void {
    this.noteTypeFilter.set(value);
    this.selectedNoteIds.set([]);
  }

  toggleSelectionMode(): void {
    if (this.activeView() === 'trash' || this.activeView() === 'shared') return;
    if (this.selectionMode()) {
      this.clearSelectionMode();
    } else {
      this.selectionMode.set(true);
      this.selectedNoteIds.set([]);
    }
  }

  clearSelectionMode(): void {
    this.selectionMode.set(false);
    this.selectedNoteIds.set([]);
  }

  isNoteSelected(id: string): boolean {
    return this.selectedNoteIds().includes(id);
  }

  toggleNoteSelection(note: Note, checked?: boolean): void {
    const selected = this.selectedNoteIds();
    const currentlySelected = selected.includes(note.id);
    const shouldSelect = checked ?? !currentlySelected;
    this.selectedNoteIds.set(
      shouldSelect
        ? (currentlySelected ? selected : [...selected, note.id])
        : selected.filter((id) => id !== note.id)
    );
  }

  selectAllVisible(): void {
    const visibleIds = this.visibleNotes().map((note) => note.id);
    if (this.allVisibleSelected()) {
      const visible = new Set(visibleIds);
      this.selectedNoteIds.update((ids) => ids.filter((id) => !visible.has(id)));
    } else {
      this.selectedNoteIds.update((ids) => Array.from(new Set([...ids, ...visibleIds])));
    }
  }

  private applyBulkChanges(changes: Partial<Note>, successMessage: string): void {
    const selected = new Set(this.selectedNoteIds());
    if (!selected.size) return;
    const now = Date.now();
    this.notes.update((current) => current.map((note) =>
      selected.has(note.id) ? { ...note, ...changes, updatedAt: now } : note
    ));
    const count = selected.size;
    this.clearSelectionMode();
    this.snackBar.open(successMessage.replace('{count}', String(count)), 'Dismiss', { duration: 2200 });
  }

  bulkFavorite(): void {
    const favorite = !this.selectedAllFavorited();
    this.applyBulkChanges(
      { favorite },
      favorite ? 'Added {count} notes to favorites' : 'Removed {count} notes from favorites'
    );
  }

  bulkPin(): void {
    const pinned = !this.selectedAllPinned();
    this.applyBulkChanges(
      { pinned },
      pinned ? 'Pinned {count} notes' : 'Unpinned {count} notes'
    );
  }

  bulkSetColor(color: string): void {
    if (!NOTE_COLORS.includes(color)) return;
    this.applyBulkChanges({ color }, 'Updated the color of {count} notes');
  }

  bulkClearReminders(): void {
    const reminderNotes = this.selectedNotes().filter((note) => Boolean(note.reminderDate));
    if (!reminderNotes.length) return;
    const reminderIds = new Set(reminderNotes.map((note) => note.id));
    const now = Date.now();
    this.notes.update((current) => current.map((note) =>
      reminderIds.has(note.id) ? { ...note, reminderDate: undefined, updatedAt: now } : note
    ));
    this.clearSelectionMode();
    this.snackBar.open(
      'Removed reminders from ' + reminderNotes.length + ' notes',
      'Dismiss',
      { duration: 2200 }
    );
  }
  async copySelectedNotes(): Promise<void> {
    const notes = this.selectedNotes();
    if (!notes.length) return;
    const text = notes.map((note) => this.plainTextForNote(note)).join('\n\n──────────\n\n');
    try {
      await navigator.clipboard.writeText(text);
      this.snackBar.open('Copied ' + notes.length + ' notes', 'Dismiss', { duration: 2000 });
    } catch {
      this.snackBar.open('Clipboard access is unavailable in this browser.', 'Dismiss', { duration: 3000 });
    }
  }

  duplicateSelectedNotes(): void {
    const selected = this.selectedNotes();
    if (!selected.length) return;
    const now = Date.now();
    const copies = selected.map((note) => {
      const { ownerId: _ownerId, shareRole: _shareRole, ...copySource } = note;
      return {
      ...copySource,
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
    });
    this.notes.update((current) => [...copies, ...current]);
    this.activeView.set('all');
    this.activeTag.set(null);
    this.searchTerm.set('');
    this.noteTypeFilter.set('all');
    this.clearSelectionMode();
    this.snackBar.open('Duplicated ' + copies.length + ' notes', 'Dismiss', { duration: 2200 });
  }

  exportSelectedMarkdown(): void {
    const notes = this.selectedNotes();
    if (!notes.length) return;
    const markdown = notes.map((note) => this.markdownForNote(note)).join('\n---\n\n');
    const date = new Date().toISOString().slice(0, 10);
    this.downloadText(markdown, 'angularnotes-selected-' + date + '.md', 'text/markdown;charset=utf-8');
    this.snackBar.open('Exported ' + notes.length + ' selected notes as Markdown', 'Dismiss', { duration: 2200 });
  }

  exportSelectedJson(): void {
    const notes = this.selectedNotes();
    if (!notes.length) return;
    const date = new Date().toISOString().slice(0, 10);
    this.downloadText(
      JSON.stringify(notes, null, 2),
      'angularnotes-selected-' + date + '.json',
      'application/json;charset=utf-8'
    );
    this.snackBar.open('Exported ' + notes.length + ' selected notes as JSON', 'Dismiss', { duration: 2200 });
  }

  bulkArchive(): void {
    const archived = this.activeView() !== 'archive';
    this.applyBulkChanges({ archived }, archived ? 'Archived {count} notes' : 'Restored {count} notes from archive');
  }
  bulkTrash(): void {
    const selected = this.selectedNotes();
    if (!selected.length) return;
    const selectedIds = new Set(selected.map((note) => note.id));
    const previousById = new Map(selected.map((note) => [note.id, note]));
    const now = Date.now();
    this.notes.update((current) => current.map((note) =>
      selectedIds.has(note.id) ? { ...note, trashed: true, archived: false, updatedAt: now } : note
    ));
    this.clearSelectionMode();
    this.snackBar.open('Moved ' + selected.length + ' notes to trash', 'Undo', { duration: 5000 })
      .onAction().subscribe(() => {
        const restoredAt = Date.now();
        this.notes.update((current) => current.map((note) => {
          const previous = previousById.get(note.id);
          return previous ? { ...previous, updatedAt: restoredAt } : note;
        }));
        this.snackBar.open('Restored ' + selected.length + ' notes', 'Dismiss', { duration: 1800 });
      });
  }

  canReorderNotes(): boolean {
    return this.sortMode() === 'manual' && this.activeView() !== 'trash' && this.activeView() !== 'shared' && !this.selectionMode();
  }

  dropNote(event: CdkDragDrop<Note[]>): void {
    if (!this.canReorderNotes() || event.previousIndex === event.currentIndex) return;
    const reorderedVisible = [...this.visibleNotes()];
    moveItemInArray(reorderedVisible, event.previousIndex, event.currentIndex);
    const visibleIds = new Set(reorderedVisible.map((note) => note.id));
    let nextVisibleIndex = 0;
    this.notes.update((current) => current.map((note) =>
      visibleIds.has(note.id) ? reorderedVisible[nextVisibleIndex++] : note
    ));
    this.snackBar.open('Note order updated', 'Dismiss', { duration: 1400 });
  }

  moveNoteToTop(note: Note): void {
    this.moveNoteInCollection(note.id, 'top');
  }

  moveNoteToBottom(note: Note): void {
    this.moveNoteInCollection(note.id, 'bottom');
  }

  private moveNoteInCollection(noteId: string, destination: 'top' | 'bottom'): void {
    const current = this.notes();
    const index = current.findIndex((note) => note.id === noteId);
    if (index < 0) return;
    const reordered = [...current];
    const [note] = reordered.splice(index, 1);
    if (destination === 'top') reordered.unshift(note);
    else reordered.push(note);
    this.notes.set(reordered);
    this.sortMode.set('manual');
    this.snackBar.open(
      destination === 'top' ? 'Moved note to the top' : 'Moved note to the bottom',
      'Dismiss',
      { duration: 1600 }
    );
  }

  filterByTag(tag: string): void {
    this.activeView.set('all');
    this.activeTag.set(tag);
    this.searchTerm.set('');
    this.clearSelectionMode();
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

  createFromTemplate(template: 'meeting' | 'journal' | 'project' | 'shopping' | 'recipe' | 'reading' | 'travel'): void {
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
    } else if (template === 'shopping') {
      note.title = 'Shopping list';
      note.type = 'checklist';
      note.checklistItems = ['Produce', 'Pantry', 'Household'].map((text) => ({
        id: this.makeId('item'), text, checked: false
      }));
      note.tags = ['Shopping'];
      note.color = '#fef1e1';
    } else if (template === 'recipe') {
      note.title = 'Recipe';
      note.content = 'Description\n\nPrep time\n\nCook time\n\nServings\n\nIngredients\n• \n\nInstructions\n1. \n2. \n3. \n\nNotes and variations';
      note.tags = ['Recipes'];
      note.color = '#fce8e6';
    } else if (template === 'reading') {
      note.title = 'Reading list';
      note.type = 'checklist';
      note.checklistItems = ['Want to read', 'Currently reading', 'Finished'].map((text) => ({
        id: this.makeId('item'), text, checked: false
      }));
      note.tags = ['Reading'];
      note.color = '#f3e8fd';
    } else {
      note.title = 'Travel plan';
      note.content = 'Destination\n\nTravel dates\n\nConfirmation numbers\n\nPlaces to visit\n• \n\nThings to pack\n• \n\nTravel notes';
      note.tags = ['Travel'];
      note.color = '#e4f7f5';
    }
    this.openEditor(note);
  }

  canEditNote(note: Note): boolean {
    return !note.ownerId || note.ownerId === this.currentUser()?.id || note.shareRole === 'editor';
  }

  isSharedNote(note: Note): boolean {
    return Boolean(note.ownerId && note.ownerId !== this.currentUser()?.id);
  }

  canManageSharing(note: Note): boolean {
    return !this.isSharedNote(note) && !note.trashed;
  }

  editNote(note: Note): void {
    if (!this.canEditNote(note)) {
      this.snackBar.open('You have viewer access to this note.', 'Dismiss', { duration: 2500 });
      return;
    }
    this.openEditor({
      ...note,
      tags: [...note.tags],
      checklistItems: (note.checklistItems || []).map((item) => ({ ...item }))
    });
  }

  private openEditor(note: Note): void {
    this.clearSelectionMode();
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
      this.activeView.set(this.isSharedNote(saved) ? 'shared' : 'all');
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
    const { ownerId: _ownerId, shareRole: _shareRole, ...copySource } = note;
    const copy: Note = {
      ...copySource,
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

  private plainTextForNote(note: Note): string {
    const checklistText = note.type === 'checklist'
      ? (note.checklistItems || []).map((item) => (item.checked ? '[x] ' : '[ ] ') + item.text).join('\n')
      : '';
    return [note.title, note.content, checklistText].filter(Boolean).join('\n\n');
  }

  async copyNote(note: Note): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.plainTextForNote(note));
      this.snackBar.open('Note copied to clipboard', 'Dismiss', { duration: 1800 });
    } catch {
      this.snackBar.open('Clipboard access is unavailable in this browser.', 'Dismiss', { duration: 3000 });
    }
  }

  async shareNote(note: Note): Promise<void> {
    const user = this.currentUser();
    if (!user || !this.canManageSharing(note)) return;
    const currentNotes = this.notes();
    const snapshot = JSON.stringify(currentNotes);
    if (this.cloudSaveTimer) clearTimeout(this.cloudSaveTimer);
    this.cloudSaveTimer = null;
    try {
      if (snapshot !== this.lastSyncedSnapshot) {
        await this.supabase.syncNotes(user.id, currentNotes);
        this.lastSyncedSnapshot = snapshot;
        this.cloudStatus.set('saved');
      }
    } catch (error) {
      this.cloudStatus.set('error');
      this.snackBar.open(error instanceof Error ? error.message : 'Save this note before sharing it.', 'Dismiss', { duration: 4000 });
      return;
    }

    const ref = this.dialog.open(NoteSharingDialogComponent, {
      data: { note, ownerId: user.id, currentEmail: user.email || '' },
      width: '520px',
      maxWidth: 'calc(100vw - 28px)',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      panelClass: 'angularnotes-sharing-panel'
    });
    ref.afterClosed().subscribe(async (changed) => {
      if (!changed || !this.currentUser()) return;
      try {
        const refreshed = await this.supabase.loadNotes(user.id);
        this.lastSyncedSnapshot = JSON.stringify(refreshed);
        this.notes.set(refreshed);
      } catch {
        this.snackBar.open('Access was updated, but the note list could not refresh yet.', 'Dismiss', { duration: 3500 });
      }
    });
  }

  async leaveSharedNote(note: Note): Promise<void> {
    if (!this.isSharedNote(note) || !note.ownerId) return;
    try {
      await this.supabase.leaveNoteShare(note.ownerId, note.id);
      this.notes.update((current) => current.filter((item) => item.id !== note.id));
      this.snackBar.open('Note removed from Shared with me', 'Dismiss', { duration: 2200 });
    } catch (error) {
      this.snackBar.open(error instanceof Error ? error.message : 'Could not leave this shared note.', 'Dismiss', { duration: 3500 });
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
    if (this.isSharedNote(note)) {
      void this.leaveSharedNote(note);
      return;
    }
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
    const target = this.notes().find((note) => note.id === id);
    if (target && !this.canEditNote(target)) {
      this.snackBar.open('You have viewer access to this note.', 'Dismiss', { duration: 2500 });
      return;
    }
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
        reminderDate: typeof item['reminderDate'] === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item['reminderDate']) ? item['reminderDate'] : undefined,
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

  checklistProgress(note: Note): number {
    const total = note.checklistItems?.length || 0;
    return total ? Math.round((this.completedChecklistCount(note) / total) * 100) : 0;
  }

  showStorageInfo(): void {
    this.snackBar.open('Your notes are saved to your AngularNotes cloud account and cached on this device. Export a JSON backup for an extra copy.', 'Got it', { duration: 6000 });
  }

  showSearchTips(): void {
    this.snackBar.open(
      'Search operators: tag:work · type:checklist · type:text · is:pinned · is:favorite · has:reminder · has:checklist. Combine them with normal words.',
      'Got it',
      { duration: 8000 }
    );
  }

  showKeyboardShortcuts(): void {
    this.snackBar.open('Shortcuts: Ctrl/⌘ + N = new note · Ctrl/⌘ + Shift + L = checklist · Ctrl/⌘ + K = search · Ctrl/⌘ + Shift + A = select notes · Esc = exit selection', 'Got it', { duration: 7000 });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if (key === 'escape' && this.selectionMode()) {
      this.clearSelectionMode();
      return;
    }

    const modifier = event.ctrlKey || event.metaKey;
    if (!modifier || event.altKey) return;
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
    } else if (key === 'a' && event.shiftKey) {
      event.preventDefault();
      this.toggleSelectionMode();
    }
  }
}