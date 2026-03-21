# Database Bootstrap and Migration Guide

This directory now has a single canonical bootstrap path plus incremental migrations.

## Canonical files

- `setup_database.sql`: full schema bootstrap and seed data for local MySQL workflows.
- `migrations/`: ordered migration scripts for containerized deployment workflows.
- `reset_database.sql`: destructive reset helper for local development only.

## Local setup

Use one of:

- `install_database.sh`
- `install_database.bat`

Both execute `setup_database.sql`.

## Containerized setup

`docker-compose.*` mounts `backend/database/migrations` to the database init directory.

## Notes

- Legacy patch scripts (`fix_*`, `phpmyadmin_*`, duplicated complete/original variants) were removed to eliminate drift and conflicting schema states.
- Keep new schema changes in `migrations/` and update `setup_database.sql` when introducing a new baseline.
