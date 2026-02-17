# Release Notes

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
