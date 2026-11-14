# AngularNotes

AngularNotes is a clean, responsive note-taking app built with **Angular 22** and the official **Angular Material** component library. Its interface follows Google's Material 3 design language, with a familiar notes workspace, Roboto typography, soft surfaces, and note colors.

## Features

- Create and edit text notes or interactive checklists with a title and comma-separated labels
- Search note titles, note content, tags, reminder dates, and checklist items; use operators such as `tag:work`, `type:checklist`, `is:pinned`, and `has:reminder`
- Pin important notes and add notes to Favorites
- Organize notes into Recent, Archive, and Trash views
- Restore notes from Trash or permanently delete them
- Filter between all notes, text notes, and checklists
- Sort by newest or oldest edits, newest or oldest creation, title in either direction, reminder date, or your own manual order
- Drag notes to reorder them in Manual order, or move an individual note to the top or bottom from its menu
- Switch between grid and list layouts
- Choose from a set of soft note colors
- Check off checklist items directly from the notes grid and track completion with a progress bar
- Duplicate notes or copy note text to the clipboard
- Filter notes by label from the sidebar or directly from note cards
- Select multiple notes at once to toggle favorites and pins, change colors, clear reminders, archive, restore, delete with Undo, copy, duplicate, or export selected notes
- Share notes with the device or browser share sheet when supported, with copy-to-clipboard fallback
- Download individual notes or the current filtered view as Markdown
- Use keyboard shortcuts: Ctrl/⌘ + N for a note, Ctrl/⌘ + Shift + L for a checklist, and Ctrl/⌘ + K to search
- Create notes from Meeting, Daily journal, Project plan, Shopping list, Recipe, Reading list, and Travel plan templates
- Set a reminder date on any note with Today, Tomorrow, and Next week quick presets
- View live word and character counts while editing, and save with Ctrl/⌘ + Enter
- See overdue and due-today reminder indicators on note cards; reminder dates are local in-app dates and do not send device notifications
- Reorder completed checklist items or clear them in one action
- Import and export notes as JSON backups
- Responsive layout for desktop, tablet, and mobile
- Browser-local autosave

## Run locally

Angular 22 requires Node.js 22.22.3 or newer in the supported Node 22 line.

```bash
npm install
npm start
```

Open the local URL printed by Angular CLI (normally `http://localhost:4200`).

## Build for GitHub Pages

```bash
npm run build:pages
```

The GitHub Actions workflow in `.github/workflows/deploy.yml` builds the app with the `/AngularNotes/` base path and deploys `dist/angular-notes/browser` whenever changes are pushed to `main`.

In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.

## Storage and privacy

Notes are saved automatically to local storage in the current browser on the current device. No account or server is used, and notes do not sync between devices. Use **More options → Export notes** to keep a JSON backup before clearing browser data or moving to another device.


## Cloud accounts and sync

AngularNotes now uses the Supabase project AngularNotes for email/password authentication and cloud note storage.

- Notes are stored in the public.notes table and protected by row-level security. Each signed-in account can access only rows whose user_id matches its authenticated Supabase user ID.
- The browser app uses the Supabase publishable key only. A service-role key must never be added to this public GitHub Pages repository.
- Existing browser notes are merged into the signed-in account on first login. Notes with newer local timestamps are preferred during the initial merge; cloud-only notes are kept.
- A device-local, account-specific cache supports quick loading and recovery during temporary connection failures. It stores only notes owned by that account; shared notes are re-authorized and fetched from Supabase on sign-in. Normal edits sync to Supabase automatically, and Realtime updates refresh other open sessions.
- Configure Supabase Auth URL settings so the Site URL and allowed redirect URL include https://bradleysouciercomputer.github.io/AngularNotes/. Email confirmation and password reset links return to the GitHub Pages app.
- Export JSON backups remain available from the More options menu.


## Shared notes and collaboration

- Open a note's actions menu and choose **Manage access** to add collaborators by email.
- **Viewer** access opens the complete note in a read-only view and allows copying it. **Editor** access allows changing the shared note; the owner remains the owner.
- Collaborators sign in to AngularNotes using the exact invited email address, then find the note in **Shared with me**.
- Owners can change roles or revoke access. Collaborators can remove a note from their own Shared with me collection.
- Collaboration permissions are enforced by Postgres row-level security. Shared editor saves update the owner's record without reassigning ownership.
- The current invitation flow grants access by email but does not send a separate email notification yet. The recipient must already have an AngularNotes account or create one using that same email address.
