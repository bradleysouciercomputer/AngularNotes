# AngularNotes

A note-taking application built with Angular and the official Angular Material component library.

## Development

```bash
npm install
npm start
```

## Build

```bash
npm run build:pages
```

The GitHub Actions workflow builds and deploys the application to GitHub Pages on pushes to `main`.

## Storage

Notes are saved in the current browser using local storage. They remain on that device and browser; this project does not currently sync notes between devices.
