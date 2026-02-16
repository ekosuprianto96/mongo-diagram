# Mongo Diagram

Mongo Diagram is a visual app to design MongoDB/Mongoose schemas using **Vue 3 + Vue Flow**.
You can create collections, add fields (including nested object/array fields), build relationships between fields, and export the result as Mongoose schema code.

## Screenshot



## Main Features

- Node-based visual editor for MongoDB collections.
- Multi-database workspace flow: choose/create database first, then manage collections inside it.
- Database management in sidebar (create, switch, delete active database).
- Create/delete collections.
- Create/delete fields in collections.
- Supports nested fields (`Object` / `Array`) in a tree structure.
- Drag & drop field reordering within the same parent level.
- Create relationships between collections by connecting fields (`ObjectId` references).
- Multi-select collections (canvas + sidebar sync) with bulk actions:
  - Export selected code
  - Delete selected collections
- Undo/Redo history with configurable limits via env:
  - `VITE_HISTORY_MAX_SIZE`
  - `VITE_HISTORY_RETENTION_MS`
- Type-based relationship edge style (colored dashed lines).
- Edit collection properties:
  - Collection name
  - Timestamps option
  - Custom `createdAt` / `updatedAt` field names
  - Advanced Mongoose schema options via structured controls (`select`, `input`, `switch`)
- Edit field properties:
  - Field name
  - Data type
  - Type-aware options via structured controls (String/Number/Boolean/Date/ObjectId/Map/Array)
  - `required`, `unique`, `index`, `sparse`, `immutable`, `select`, `alias`
  - String options: `trim`, `lowercase`, `uppercase`, `minLength`, `maxLength`, `match`, enum list, default
  - Number options: `min`, `max`, default
  - Date options: default (`Date.now`/custom), `min`, `max`, `expires`
  - ObjectId options: `ref`, default
- Export Mongoose schema code:
  - All collections
  - Or a single collection
  - Or selected collections (bulk export)
- Export/Import full project JSON with database-aware structure.
- Copy exported code to clipboard.
- Schema data is persisted automatically in browser local storage.
- Custom modal system for `confirm`, `prompt`, `alert` (no browser default dialogs).
- Toast notifications for user feedback and warning states.
- Keyboard shortcuts:
  - `Delete` / `Backspace`: remove selected item (collection/relationship)
  - `Ctrl/Cmd + C`: copy selected collection
  - `Ctrl/Cmd + V`: paste collection
  - `Ctrl/Cmd + Z`: undo
  - `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y`: redo

## What's New in v2.0.0

- Introduced database-first workflow:
  - Create and manage multiple databases.
  - Each collection and relationship belongs to a specific database.
  - Active database controls what is shown on canvas and in sidebar.
- Added multi-select workflow:
  - `Ctrl/Cmd + Click` and `Shift + Click` support for collection multi-selection.
  - Selection state is synchronized between canvas nodes and sidebar list.
  - Added floating bulk action menu for selected collections.
- Added Undo/Redo system:
  - Snapshot-based history with retention + max size limits from env.
  - Undo/Redo buttons are disabled when no changes are available.
- Replaced browser native dialogs:
  - Implemented custom UI modal for prompt/confirm/alert.
  - Implemented toast notifications for success/error/info states.
- Expanded Mongoose support:
  - More complete schema options at collection level and field level.
  - Type-aware form controls instead of free-text for key options.
- Improved visual quality:
  - Updated collection node styling and field row clarity.
  - Added drag affordance for fields.
  - Type-colored dashed relationship lines.
- Improved GitHub Pages readiness:
  - Build output targets `docs/`.
  - Asset/script paths configured for static hosting.

## Fixes & Improvements in v2.0.0

- Fixed field-to-field connection behavior so dragging fields no longer conflicts with creating relationships.
- Fixed edge line position updates after field reorder (connection mapping stays accurate).
- Reduced lag in edge reposition updates.
- Fixed selection persistence issue on browser refresh (selection now resets properly).
- Fixed right properties panel behavior to auto-hide when nothing is selected and auto-show when selection exists.
- Fixed multiple issues around database-scoped persistence in local storage.
- Fixed import/export compatibility with database-aware project structure.
- Added local storage quota handling with explicit warning to export project before data loss.
- Fixed phantom/orphan edge rendering cases after collection create/delete operations.
- Fixed `Ctrl/Cmd + Click` node multi-select behavior and bulk action visibility sync.
- Reduced unnecessary node/edge rerendering to improve canvas performance when creating/deleting collections.

## Tech Stack

- Vue 3
- Vite
- Pinia
- Vue Flow (`@vue-flow/core`, `@vue-flow/background`, `@vue-flow/controls`)
- Tailwind CSS 4
- Lucide Icons
- VueUse (`useStorage`)

## Project Structure

```txt
src/
  App.vue
  main.js
  style.css
  stores/
    schemaStore.js
  components/
    Sidebar.vue
    DiagramCanvas.vue
    PropertiesPanel.vue
    CodeExport.vue
    ContextMenu.vue
    nodes/
      CollectionNode.vue
      FieldItem.vue
```

## How to Run

### 1. Install dependencies

```bash
npm install
```

### 2. Start development server

```bash
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

### 3. Build for production

```bash
npm run build
```

### 4. Preview production build

```bash
npm run preview
```

## Quick Usage Guide

1. Add a collection from the sidebar (`New Collection`) or right-click on the canvas (`Create Collection`).
2. Click a collection to select it, then use `Add Field` to add fields.
3. For `Object` or `Array` fields, click the `+` icon on a field to add child fields.
4. Create relationships by dragging from the source field's right handle to the target field's left handle.
5. Click any item (collection/field/relationship) to edit its properties in the right panel.
6. Click `Export` in the top toolbar or the export icon in the sidebar to view schema code.
7. Use `Copy Code` to copy exported code.

## Notes

- The `AI Analyze` feature is currently a placeholder alert (no real AI analysis yet).
- This project focuses on generating Mongoose schemas, not automatic database migration.

## License

This project is licensed under the **MIT License**. See `LICENSE`.
