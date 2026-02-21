# Release Notes

## v2.5.0 - 2026-02-22

### Highlights

- **Laravel Companion Package**: Launched [Laravel Visual Migrator](https://github.com/ekosuprianto96/laravel-visual-migrator) to bridge Mongo Diagram with Laravel projects.
- **Version Sync**: Improved automation for versioning across dependencies.

### New Features

- **Laravel Integration**: You can now use the Laravel Visual Migrator package to import and sync migrations directly from your Laravel environment.
- **Documentation Update**: Added quick links to the Laravel package repository in the root README.

### Improved & Fixed

- **Version Consistency**: Updated all documentation and environment variables to reflect `v2.5.0`.
- **Sync Scripts**: Refined `scripts/sync-version.mjs` for better reliability during build.

---

## v2.4.0 - 2026-02-17

### Highlights

- **Comprehensive Export Engine**: Added support for Prisma, Laravel Migrations, TypeORM Entities, and Sequelize Models.
- **Visual Cardinality**: Fully integrated relationship cardinality (1:1, 1:N, N:N) with visual styles and a legend.
- **UX Refinements**: Continuous lines for nested fields and improved drag-and-drop stability.

### New Features

- **Multi-Framework Export Support**:
    - **Prisma Schema**: Export your diagram directly to a `.prisma` file structure.
    - **Laravel Migrations**: Generate runnable PHP migrations with foreign key support.
    - **TypeORM & Sequelize**: Support for popular Node.js ORMs with class/model generation.
- **Relationship Cardinality**:
    - Manage **1:1**, **1:N**, and **N:N** relationships with unique visual indicators.
    - Double-click an edge to cycle through cardinality types instantly.
    - Interactive **Relationship Legend** added to the canvas for quick reference.

### Improved & Fixed

- **Visual Tree Lines**: Fixed broken or disconnected lines for nested MongoDB fields.
- **Drag & Drop**: Fixed various jumps and selection issues when reordering fields.
- **SQL Generation**: Improved `ALTER TABLE` ordering for foreign key constraints to ensure schema runs correctly out of the box.

### Files Added/Updated in this release

- Added: `src/utils/prismaGenerator.js`
- Added: `src/utils/laravelMigrationGenerator.js`
- Added: `src/utils/typeormGenerator.js`
- Added: `src/utils/sequelizeGenerator.js`
- Updated: `src/components/DiagramCanvas.vue` (Legend & Cardinality styles)
- Updated: `src/components/PropertiesPanel.vue` (Cardinality & Edge editor)
- Updated: `src/components/nodes/FieldItem.vue` (Visual lines)
- Updated: `src/stores/schemaStore.js` (Reordering logic)
- Updated: `src/factories/databaseFactory.js` (Export targets)

---

## v2.3.2 - 2026-02-17

### Highlights

- Patch release focused on right-panel editing stability and layout robustness.

### Fixed

- Right properties panel now stays open while editing SQL field properties (no unexpected auto-close on field updates).
- Fixed overflow in MongoDB `String Options` area by using a safer stacked toggle layout.

### Updated

- Synced release metadata to `v2.3.2`:
  - `package.json` version
  - `.env` `VITE_APP_VERSION`
  - `README.md`, `CHANGELOG.md`, and `RELEASE_NOTES.md`

## v2.3.1 - 2026-02-17

### Highlights

- Minor patch release for UI stability and version synchronization.

### Fixed

- Resolved sidebar overflow in database selector row on narrow width:
  - `select` now uses `min-w-0` and can shrink correctly.
  - action buttons now use `shrink-0` to prevent layout break.

### Updated

- Synced release metadata to `v2.3.1`:
  - `package.json` version
  - `.env` `VITE_APP_VERSION`
  - `README.md`, `CHANGELOG.md`, and `RELEASE_NOTES.md`

## v2.3.0 - 2026-02-17

### Highlights

- Multi-database experience now fully consistent across MongoDB, MySQL, and PostgreSQL.
- SQL modeling has been significantly expanded with foreign keys and constraints.
- Export/import reliability has been improved for real project workflows.
- App version display is now automated from project version metadata.

### New

- Database adapter factory for reusable per-database behavior.
- Dynamic domain terms by DB type:
  - MongoDB: Collection/Collections
  - MySQL/PostgreSQL: Table/Tables
- Ordered default naming for new entities:
  - `new_collection_1`, `new_collection_2`, ...
  - `new_table_1`, `new_table_2`, ...
- SQL field-level constraint controls in properties panel:
  - Foreign Key toggle
  - Reference table and reference column
  - Constraint name
  - `ON DELETE` and `ON UPDATE`
  - Check expression and optional check constraint name
  - Optional index name
- Ready-to-import test payloads in `test-data/` for all database scenarios.

### Improved

- Default new field type now follows active DB type:
  - MongoDB => `String`
  - MySQL => `VARCHAR`
  - PostgreSQL => `VARCHAR`
- SQL identifier formatting improved (snake_case normalization for table/column names).
- SQL export now generated in execution-safe order:
  1. `CREATE TABLE`
  2. `CREATE INDEX`
  3. `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`
- FK resolution improved using stable `referencesColumnId` (with fallback by name).
- Export scope is aligned to active database for SQL code export.

### Data Integrity and Import/Export

- Project JSON import switched to strict validation:
  - Validates root structure, `databases`, `collections`, `edges`, and references.
  - Rejects invalid payloads with specific error messages.
- Project JSON export now strips UI-only transient state (`selected`) to keep files clean.

### Dev Experience

- Added automated version sync script:
  - `npm run version:sync`
  - syncs `package.json` version to `.env` as `VITE_APP_VERSION`
- `predev` and `prebuild` now run version sync automatically.
- Sidebar version label now reads dynamic app version instead of hardcoded text.

### Files Added/Updated in this release

- Added: `scripts/sync-version.mjs`
- Added: `test-data/import-all-databases.json`
- Added: `test-data/import-mongodb-only.json`
- Added: `test-data/import-mysql-only.json`
- Added: `test-data/import-postgresql-only.json`
- Updated: `src/factories/databaseFactory.js`
- Updated: `src/components/Sidebar.vue`
- Updated: `src/components/CodeExport.vue`
- Updated: `src/components/PropertiesPanel.vue`
- Updated: `src/components/DiagramCanvas.vue`
- Updated: `src/components/nodes/CollectionNode.vue`
- Updated: `src/components/nodes/FieldItem.vue`
- Updated: `src/stores/schemaStore.js`
- Updated: `src/utils/sqlGenerator.js`
- Updated: `vite.config.js`
- Updated: `package.json`
- Updated: `README.md`
