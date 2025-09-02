# Copilot Instructions for Workout Tracker

## Project Overview

- This is a React single-page application (SPA) for tracking workout progress, built with Vite for fast development and HMR.
- Main features: create, view, and manage workout sessions; view workout history.
- Data is stored in browser localStorage using JSON serialization (see `src/lib/storage.js`).

## Key Architecture & Patterns

- **Pages:** Located in `src/pages/` (`Home.jsx`, `WorkoutEditor.jsx`, `History.jsx`). Each page is a functional React component.
- **Navigation:** Uses `react-router-dom` for client-side routing. Main routes are `/`, `/workout/new`, `/history` (see `src/App.jsx`).
- **State & Data:** Workouts are saved and loaded via helper functions in `src/lib/storage.js` using a versioned key (`wt.workouts.v1`).
- **ID Generation:** Unique IDs for workouts are generated via `src/lib/id.js` (`uid()`), using `crypto.randomUUID()` if available, otherwise a fallback.
- **Styling:** Uses inline styles and CSS files (`App.css`, `index.css`). No CSS-in-JS or CSS modules.

## Developer Workflow

- **Start Dev Server:** `npm run dev` (Vite)
- **Build:** `npm run build`
- **Lint:** `npm run lint` (uses ESLint, config in `eslint.config.js`)
- **No test suite is present.**
- **No backend integration.**

## Project-Specific Conventions

- **LocalStorage Keys:** Use constants from `STORAGE_KEYS` in `src/lib/storage.js` for all storage operations.
- **Error Handling:** Storage helpers log errors to console and always return fallback values to avoid crashes.
- **ID Format:** Fallback IDs are prefixed with `id-` and include a timestamp and random string.
- **History Page:** `src/pages/History.jsx` is a stub; workouts list should be rendered here using data from localStorage.
- **Component Structure:** Prefer small, focused functional components. No class components.

## Integration Points

- **External Libraries:**
  - `react`, `react-dom`, `react-router-dom` (routing)
  - `vite` (build/dev)
- **No API calls or server communication.**

## Examples

- To load workouts: `loadJSON(STORAGE_KEYS.WORKOUTS, [])`
- To save workouts: `saveJSON(STORAGE_KEYS.WORKOUTS, workoutsArray)`
- To generate an ID: `uid()`

## Key Files

- `src/App.jsx` — main app shell and routing
- `src/pages/History.jsx` — history page stub
- `src/lib/storage.js` — localStorage helpers
- `src/lib/id.js` — unique ID generation

---

**If you add new features, document any new conventions or workflows here.**
