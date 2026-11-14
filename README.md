# AngularNotes

AngularNotes is a clean, responsive note-taking app built with **Angular 22** and the official **Angular Material** component library. Its interface follows Google's Material 3 design language, with a familiar notes workspace, Roboto typography, soft surfaces, and note colors.

## Features

- Create and edit text notes or interactive checklists with a title and comma-separated labels
- Search note titles, note content, tags, reminder dates, and checklist items; use operators such as `tag:work`, `type:checklist`, `is:pinned`, and `has:reminder`
- Pin important notes and add notes to Favorites
- Organize notes into Recent, Archive, and Trash views
- Restore notes from Trash or permanently delete them
- Filter between all notes, text notes, and checklists
- Sort by newest or oldest edits, newest or oldest creation, title in either direction, or reminder date
- Switch between grid and list layouts
- Choose from a set of soft note colors
- Check off checklist items directly from the notes grid
- Duplicate notes or copy note text to the clipboard
- Filter notes by label from the sidebar or directly from note cards
- Select multiple notes at once to toggle favorites and pins, change colors, clear reminders, archive, restore, delete with Undo, copy, duplicate, or export selected notes
- Share notes with the device or browser share sheet when supported, with copy-to-clipboard fallback
- Download individual notes or the current filtered view as Markdown
- Use keyboard shortcuts: Ctrl/⌘ + N for a note, Ctrl/⌘ + Shift + L for a checklist, and Ctrl/⌘ + K to search
- Create notes from Meeting, Daily journal, Project plan, and Shopping list templates
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
