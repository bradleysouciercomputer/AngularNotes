import { Injectable } from '@angular/core';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Note } from './note-editor-dialog.component';

const SUPABASE_URL = 'https://ohaofxocvmoaurdgyaso.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OeIjLtU8zsGDdcWz4WIujg_aHY3k_vR';

export interface NoteShareRecord {
  id: string;
  invited_email: string;
  role: 'viewer' | 'editor';
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true
    }
  });

  signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  signUp(email: string, password: string) {
    return this.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: this.redirectUrl() }
    });
  }

  sendPasswordReset(email: string) {
    return this.client.auth.resetPasswordForEmail(email, {
      redirectTo: this.redirectUrl()
    });
  }

  updatePassword(password: string) {
    return this.client.auth.updateUser({ password });
  }

  signOut() {
    return this.client.auth.signOut();
  }

  async loadNotes(userId: string): Promise<Note[]> {
    const [notesResult, sharesResult] = await Promise.all([
      this.client.from('notes').select('*').order('sort_order', { ascending: true }),
      this.client.from('note_shares').select('owner_id,note_id,role')
    ]);
    if (notesResult.error) throw notesResult.error;
    if (sharesResult.error) throw sharesResult.error;

    const shareRoles = new Map<string, 'viewer' | 'editor'>();
    for (const share of (sharesResult.data ?? []) as Array<{ owner_id: string; note_id: string; role: 'viewer' | 'editor' }>) {
      shareRoles.set(share.owner_id + ':' + share.note_id, share.role);
    }

    return ((notesResult.data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
      const ownerId = String(row['user_id']);
      const id = String(row['id']);
      const isOwner = ownerId === userId;
      return {
        id,
        ownerId,
        shareRole: isOwner ? 'owner' as const : (shareRoles.get(ownerId + ':' + id) ?? 'viewer'),
        title: String(row['title'] ?? ''),
        content: String(row['content'] ?? ''),
        tags: Array.isArray(row['tags']) ? row['tags'].filter((tag): tag is string => typeof tag === 'string') : [],
        color: typeof row['color'] === 'string' ? row['color'] : '#ffffff',
        type: row['note_type'] === 'checklist' ? 'checklist' as const : 'text' as const,
        checklistItems: Array.isArray(row['checklist_items'])
          ? row['checklist_items'].filter((item): item is { id: string; text: string; checked: boolean } =>
              typeof item === 'object' && item !== null &&
              typeof (item as { text?: unknown }).text === 'string'
            ).map((item, index) => ({
              id: typeof item.id === 'string' ? item.id : 'item-' + index,
              text: item.text,
              checked: Boolean(item.checked)
            }))
          : [],
        pinned: Boolean(row['pinned']),
        favorite: Boolean(row['favorite']),
        archived: Boolean(row['archived']),
        trashed: Boolean(row['trashed']),
        reminderDate: typeof row['reminder_date'] === 'string' ? row['reminder_date'].slice(0, 10) : undefined,
        createdAt: Number(row['created_at_ms']) || Date.now(),
        updatedAt: Number(row['updated_at_ms']) || Date.now()
      };
    });
  }

  async syncNotes(userId: string, notes: Note[]): Promise<void> {
    const ownNotes = notes.filter((note) => !note.ownerId || note.ownerId === userId);
    const editableSharedNotes = notes.filter((note) =>
      Boolean(note.ownerId && note.ownerId !== userId && note.shareRole === 'editor')
    );

    const rowFor = (note: Note, ownerId: string, sortOrder: number) => ({
      id: note.id,
      user_id: ownerId,
      title: note.title,
      content: note.content,
      tags: note.tags,
      color: note.color,
      note_type: note.type,
      checklist_items: note.checklistItems ?? [],
      pinned: note.pinned,
      favorite: note.favorite,
      archived: note.archived,
      trashed: note.trashed,
      reminder_date: note.reminderDate ?? null,
      created_at_ms: note.createdAt,
      updated_at_ms: note.updatedAt,
      sort_order: sortOrder
    });

    if (ownNotes.length) {
      const rows = ownNotes.map((note, index) => rowFor(note, userId, index));
      const { error } = await this.client.from('notes').upsert(rows, { onConflict: 'user_id,id' });
      if (error) throw error;
    }

    for (const [index, note] of editableSharedNotes.entries()) {
      const ownerId = note.ownerId!;
      const { id: _id, user_id: _userId, ...updates } = rowFor(note, ownerId, ownNotes.length + index);
      const { data, error } = await this.client
        .from('notes')
        .update(updates)
        .eq('user_id', ownerId)
        .eq('id', note.id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Your Editor access to a shared note may have been removed.');
    }

    // Remove only this account's own notes that were permanently deleted. Shared records are owned by someone else.
    const { data: existing, error: readError } = await this.client
      .from('notes')
      .select('id')
      .eq('user_id', userId);
    if (readError) throw readError;

    const liveOwnIds = new Set(ownNotes.map((note) => note.id));
    const staleIds = (existing ?? [])
      .map((row) => String((row as { id: string }).id))
      .filter((id) => !liveOwnIds.has(id));

    if (staleIds.length) {
      const { error } = await this.client
        .from('notes')
        .delete()
        .eq('user_id', userId)
        .in('id', staleIds);
      if (error) throw error;
    }
  }

  async listNoteShares(ownerId: string, noteId: string): Promise<NoteShareRecord[]> {
    const { data, error } = await this.client
      .from('note_shares')
      .select('id,invited_email,role,created_at')
      .eq('owner_id', ownerId)
      .eq('note_id', noteId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as NoteShareRecord[];
  }

  async addNoteShare(ownerId: string, noteId: string, email: string, role: 'viewer' | 'editor'): Promise<void> {
    const invitedEmail = email.trim().toLowerCase();
    const { data: userResult, error: userError } = await this.client.auth.getUser();
    if (userError) throw userError;
    if (!userResult.user || userResult.user.id !== ownerId) throw new Error('Only the note owner can invite collaborators.');
    if (invitedEmail === (userResult.user.email || '').toLowerCase()) throw new Error('You already own this note.');
    const { error } = await this.client
      .from('note_shares')
      .upsert(
        { owner_id: ownerId, note_id: noteId, invited_email: invitedEmail, role },
        { onConflict: 'owner_id,note_id,invited_email' }
      );
    if (error) throw error;
  }

  async updateNoteShareRole(shareId: string, role: 'viewer' | 'editor'): Promise<void> {
    const { data, error } = await this.client
      .from('note_shares')
      .update({ role })
      .eq('id', shareId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Could not update this collaborator. Check that you still own the note.');
  }

  async revokeNoteShare(shareId: string): Promise<void> {
    const { data, error } = await this.client
      .from('note_shares')
      .delete()
      .eq('id', shareId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Could not revoke access for this collaborator.');
  }

  async leaveNoteShare(ownerId: string, noteId: string): Promise<void> {
    const { data, error } = await this.client
      .from('note_shares')
      .delete()
      .eq('owner_id', ownerId)
      .eq('note_id', noteId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('This shared note is no longer available to leave.');
  }

  subscribeToNotes(userId: string, onChange: () => void): RealtimeChannel {
    return this.client
      .channel('angularnotes-collaboration-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => onChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'note_shares' }, () => onChange())
      .subscribe();
  }

  private redirectUrl(): string {
    return window.location.origin + window.location.pathname;
  }
}
