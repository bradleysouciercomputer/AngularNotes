import { Injectable } from '@angular/core';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Note } from './note-editor-dialog.component';

const SUPABASE_URL = 'https://ohaofxocvmoaurdgyaso.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_OeIjLtU8zsGDdcWz4WIujg_aHY3k_vR';

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

  async loadNotes(): Promise<Note[]> {
    const { data, error } = await this.client
      .from('notes')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;

    return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
      id: String(row['id']),
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
    }));
  }

  async syncNotes(userId: string, notes: Note[]): Promise<void> {
    const rows = notes.map((note, index) => ({
      id: note.id,
      user_id: userId,
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
      sort_order: index
    }));

    if (rows.length) {
      const { error } = await this.client
        .from('notes')
        .upsert(rows, { onConflict: 'user_id,id' });
      if (error) throw error;
    }

    const { data: existing, error: readError } = await this.client
      .from('notes')
      .select('id')
      .eq('user_id', userId);
    if (readError) throw readError;

    const liveIds = new Set(notes.map((note) => note.id));
    const staleIds = (existing ?? [])
      .map((row) => String((row as { id: string }).id))
      .filter((id) => !liveIds.has(id));

    if (staleIds.length) {
      const { error } = await this.client
        .from('notes')
        .delete()
        .eq('user_id', userId)
        .in('id', staleIds);
      if (error) throw error;
    }
  }

  subscribeToNotes(userId: string, onChange: () => void): RealtimeChannel {
    return this.client
      .channel('angularnotes-user-' + userId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: 'user_id=eq.' + userId
        },
        () => onChange()
      )
      .subscribe();
  }

  private redirectUrl(): string {
    return window.location.origin + window.location.pathname;
  }
}
