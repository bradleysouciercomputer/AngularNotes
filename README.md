# AngularNotes

AngularNotes is a clean, responsive note-taking app built with **Angular 22** and the official **Angular Material** component library.

## Features

- Create and edit notes with a title, multiline note editor, and comma-separated tags
- Search note titles, note content, and tags
- Pin important notes and add notes to Favorites
- Organize notes into Recent, Archive, and Trash views
- Restore notes from Trash or permanently delete them
- Sort by last updated, date created, or title
- Switch between grid and list layouts
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
