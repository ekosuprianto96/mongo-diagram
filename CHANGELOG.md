# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2026-02-22

### Added

- Official support for Laravel via [Laravel Visual Migrator](https://github.com/ekosuprianto96/laravel-visual-migrator).
- Root documentation now includes direct links to the Laravel repository.

### Changed

- Updated project versioning to `2.5.0`.
- Synced `README.md`, `RELEASE_NOTES.md`, and `.env` to the new version.

## [2.4.0] - 2026-02-17

### Added

- New code export targets for SQL-based databases (MySQL & PostgreSQL):
    - **Prisma** schema export.
    - **Laravel Migration** export.
    - **TypeORM Entity** export.
    - **Sequelize Model** export.
- **Cardinality** support for relationships:
    - Support for **One-to-One (1:1)**, **One-to-Many (1:N)**, and **Many-to-Many (N:N)**.
    - Double-click on edges to quickly cycle through cardinality types.
    - Relationship legend in the bottom-left corner of the canvas.
    - Visual representation for each type (Solid: 1-1, Dashed: 1-N, Dotted: N-N).

### Fixed

- Visual tree lines for nested objects/arrays are now continuous and properly aligned.
- Stabilized drag-and-drop field reordering in the properties panel and collection nodes.

### Changed

- Updated terminology based on active database type (Collections for MongoDB, Tables for SQL).
- Refined SQL export generation order for better reliability (Tables -> Indexes -> Foreign Keys).

## [2.3.2] - 2026-02-17

### Fixed

- Right properties panel no longer closes unexpectedly when editing SQL field properties (field selection is now preserved while the parent collection is still valid).
- Resolved overflow in MongoDB `String Options` controls in the right panel by switching to a safer vertical layout with stable toggle sizing.

### Changed

- Release metadata and docs synced to `v2.3.2`:
  - `package.json` version
  - `.env` -> `VITE_APP_VERSION=2.3.2`
  - `README.md`, `CHANGELOG.md`, `RELEASE_NOTES.md`

## [2.3.1] - 2026-02-17

### Fixed

- Sidebar database selector row overflow on narrow sidebar width:
  - select now shrinks correctly with `min-w-0`
  - action buttons stay stable with `shrink-0`

### Changed

- Release metadata and docs synced to `v2.3.1`:
  - `package.json` version
  - `.env` -> `VITE_APP_VERSION=2.3.1`
  - `README.md`, `RELEASE_NOTES.md`, `CHANGELOG.md`

## [2.3.0] - 2026-02-17

### Added

- Database adapter factory for reusable per-database behavior.
- Dynamic terminology by DB type:
  - MongoDB => Collection/Collections
  - MySQL/PostgreSQL => Table/Tables
- Ordered default naming for new entities (`new_collection_1`, `new_table_1`, etc.).
- SQL constraint controls in field properties:
  - Foreign key configuration (`references`, `ON DELETE`, `ON UPDATE`)
  - Check constraint expression and optional name
  - Index naming
- Import test payloads in `test-data/` for all supported databases.
- Automated version sync script `npm run version:sync`.

### Changed

- SQL export generation now outputs runnable order:
  1. `CREATE TABLE`
  2. `CREATE INDEX`
  3. `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`
- SQL identifier normalization improved to snake_case for table/column names.
- FK mapping improved to use stable `referencesColumnId` (fallback to name when needed).
- Default new field type now follows active DB type:
  - MongoDB => `String`
  - MySQL/PostgreSQL => `VARCHAR`
- Sidebar/app version label now loads dynamically from `VITE_APP_VERSION` / package version.

### Fixed

- SQL export scope aligned with active database in code export flow.
- Export payload now excludes transient UI selection state (`selected`).

### Security

- Project JSON import switched to strict validation:
  - validates database list, active database id, collections, edges, and references
  - rejects invalid payloads with specific error messages

<!-- Optional: add repository compare/release links here when remote URL is available. -->
