# Notes

A minimal, offline-capable PWA note-taking app vibe-coded with React, TypeScript, and Vite.

## Features

- **Read / Edit modes** -- notes open in read mode by default; switch to edit mode to make changes.
- **PIN lock** -- a simple 4-digit PIN screen on launch to keep notes private.
- **Font size control** -- adjustable between 12px and 28px, preference persisted across sessions.
- **Reflow tool** -- collapses extra newlines and breaks text into one sentence per line.
- **Title from text** -- pulls the first line of content into the title field with one click.
- **Recently visited** -- the landing page shows the last 5 notes you opened.
- **Offline support** -- service worker precaches all assets; works without an internet connection.
- **Installable** -- can be added to home screen on mobile or installed as a desktop app.
- **IndexedDB storage** -- notes are stored in the browser's IndexedDB for reliable persistence.
- **Responsive** -- sidebar collapses into a slide-out drawer on small screens.

## Tech Stack

| Layer       | Technology                      |
|-------------|---------------------------------|
| Framework   | React 19                        |
| Language    | TypeScript 6                    |
| Build       | Vite 8                          |
| Styling     | Tailwind CSS 4 (via Vite plugin)|
| Storage     | IndexedDB (via `idb`)           |
| PWA         | vite-plugin-pwa (Workbox)       |

## Getting Started

### Prerequisites

- Node.js 20+
- Yarn (a `yarn.lock` is included)

### Install and Run

```bash
cd reader
yarn install
yarn dev
```

The dev server starts at `http://localhost:5173`.

### Build for Production

```bash
yarn build
yarn preview
```

The production build outputs to `dist/` with a service worker for offline use.

## Project Structure

```
src/
├── main.tsx                   # App entry point
├── App.tsx                    # Root component: PIN gate, layout, routing
├── index.css                  # Tailwind CSS import
├── types.ts                   # Note interface
├── db.ts                      # IndexedDB wrapper (idb)
├── components/
│   ├── PinLock.tsx            # PIN entry screen
│   ├── Landing.tsx            # Welcome page with recent notes
│   ├── NoteList.tsx           # Sidebar note list
│   ├── NoteView.tsx           # Read/edit view with toolbar actions
│   └── FontSizeControl.tsx    # A-/A+ font size buttons
└── hooks/
    ├── useNotes.ts            # CRUD operations backed by IndexedDB
    ├── useRecentNotes.ts      # Last 5 visited notes (localStorage)
    └── useFontSize.ts         # Font size preference (localStorage)
```

## Available Scripts

| Command        | Description                          |
|----------------|--------------------------------------|
| `yarn dev`     | Start development server             |
| `yarn build`   | Type-check and build for production  |
| `yarn preview` | Preview the production build locally |
| `yarn lint`    | Run ESLint                           |

## Notes on Security

The PIN lock is a basic UI-level screen lock with a hardcoded PIN. It is **not** a security feature -- all data is stored unencrypted in the browser's IndexedDB and can be accessed through dev tools. Do not rely on it to protect sensitive information.
