# Mongo Diagram

Mongo Diagram is a visual app to design MongoDB/Mongoose schemas using **Vue 3 + Vue Flow**.
You can create collections, add fields (including nested object/array fields), build relationships between fields, and export the result as Mongoose schema code.

## Screenshot

![Mongo Diagram Screenshot](./screenshoot-1.png)

## Main Features

- Node-based visual editor for MongoDB collections.
- Multi-database workspace flow: choose/create database first, then manage collections inside it.
- Create/delete collections.
- Create/delete fields in collections.
- Supports nested fields (`Object` / `Array`) in a tree structure.
- Drag & drop field reordering within the same parent level.
- Create relationships between collections by connecting fields (`ObjectId` references).
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
- Copy exported code to clipboard.
- Schema data is persisted automatically in browser local storage.
- Keyboard shortcuts:
  - `Delete` / `Backspace`: remove selected item (collection/relationship)
  - `Ctrl/Cmd + C`: copy selected collection
  - `Ctrl/Cmd + V`: paste collection

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
