# AngularNotes

AngularNotes is a cloud-synced note-taking workspace built with Angular 22, the official Material Web component library (@material/web), and Supabase. The interface uses Material 3 Web Components directly, including buttons, text fields, menus, dialogs, cards, chips, checkboxes, selects, and icons.

## Features

- Create and edit text notes or interactive checklists with titles and comma-separated labels
- Search note titles, content, labels, reminders, and checklist items with operators such as tag:work, type:checklist, is:pinned, and has:reminder
- Pin important notes and add notes to Favorites
- Organize notes into Recent, Today, Upcoming, Reminders, Calendar, Archive, Trash, and Shared with me
- Browse a monthly reminder calendar and create a note with a reminder prefilled for the selected date
- Optional desktop notifications for due reminders while the app is open
- Snooze reminders until tomorrow or one week
- Filter by text notes or checklists, and sort by update date, creation date, title, reminder date, or manual order
- Drag notes to reorder them in Manual order, or move individual notes to the top or bottom
- Switch between grid and list layouts
- Choose from a set of soft note colors
- Check off checklist items directly from note cards and track completion
- Duplicate notes, copy note text, and download individual notes or filtered collections as Markdown
- Select multiple notes to favorite, pin, recolor, clear reminders, archive, restore, delete with Undo, copy, duplicate, or export
- Create notes from Meeting, Daily journal, Project plan, Shopping list, Recipe, Reading list, and Travel plan templates
- Import and export complete JSON backups
- Keyboard shortcuts: Ctrl/⌘ + N for a note, Ctrl/⌘ + Shift + L for a checklist, and Ctrl/⌘ + K to search
- Share notes by email with Viewer or Editor permissions; owners can change roles or revoke access
- Collaborators can find shared notes in Shared with me; permissions are enforced by Supabase row-level security
- Automatic cloud synchronization and Realtime updates across signed-in sessions
- Account-specific browser cache for quick loading and recovery during temporary connection failures
- Responsive layout for desktop, tablet, and mobile

## Material Web

The application uses the official @material/web package and its native md-* custom elements. Angular's CUSTOM_ELEMENTS_SCHEMA allows these components to be used directly in standalone Angular templates. Angular CDK is retained for drag-and-drop and for hosting standalone Angular dialog components; the visible dialog surfaces are Material Web md-dialog elements.

Material Web is currently in maintenance mode. This project follows the Material Web choice for this app; check the upstream project for future maintenance or compatibility changes.

## Run locally

Angular 22 requires Node.js 22.22.3 or newer in the supported Node 22 line.

```bash
npm install
npm start
```

Open the local URL printed by Angular CLI (normally http://localhost:4200).

## Build for GitHub Pages

```bash
npm run build:pages
```

The GitHub Actions workflow in .github/workflows/deploy.yml builds the app with the /AngularNotes/ base path and deploys dist/angular-notes/browser whenever changes are pushed to main.

In the repository, open Settings → Pages and set Build and deployment → Source to GitHub Actions.

## Cloud accounts and storage

AngularNotes uses the Supabase project AngularNotes for email/password authentication and cloud note storage.

- Notes are stored in the public.notes table and protected by row-level security. Each account can access only its own rows unless a note has explicitly been shared with it.
- The browser app uses the Supabase publishable key only. A service-role key must never be added to this public GitHub Pages repository.
- Existing browser notes are merged into the signed-in account on first login. Notes with newer local timestamps are preferred during the initial merge; cloud-only notes are kept.
- A device-local, account-specific cache stores only notes owned by that account. Shared notes are re-authorized and fetched from Supabase on sign-in. Normal edits sync automatically, and Realtime updates refresh other open sessions.
- Configure Supabase Auth URL settings so the Site URL and allowed redirect URL include https://bradleysouciercomputer.github.io/AngularNotes/. Email confirmation and password reset links return to the GitHub Pages app.
- Export JSON backups remain available from the More options menu.
- Desktop reminder preferences and notification delivery markers are stored locally per account and browser; reminder dates themselves sync with your cloud notes.

## Shared notes and collaboration

- Open a note's actions menu and choose Manage access to add collaborators by email.
- Viewer access opens the complete note in a read-only view. Editor access allows changes to the shared note; ownership remains with the original owner.
- Collaborators sign in using the exact invited email address, then find the note in Shared with me.
- Owners can change roles or revoke access. Collaborators can remove a note from their own Shared with me collection.
- Collaboration permissions are enforced by Postgres row-level security.
- The current invitation flow grants access by email but does not send a separate email notification. The recipient must create or sign in to AngularNotes using that same email address.
