# AutoLux Phase 1 + Phase 2 Integration

The supplied Phase 1 and Phase 2 archives have already been combined in this project.

## What is connected

- The Phase 1 public website, MUI theme, global styles, navigation, footer and animation setup remain the main frontend shell.
- Phase 2 login, registration, account, auth context and protected-route components are added to that shell.
- The frontend uses one Axios client pointed at `/api/v1`, including refresh-token handling.
- The backend uses one Express application and one PostgreSQL pool.
- Phase 2 auth, user and initial-admin routes are mounted under `/api/v1`.
- Phase 1 health/readiness URLs remain as aliases, alongside the Phase 2 `/api/v1` endpoints.
- The combined migration runner applies the Phase 1 foundation migration before the Phase 2 identity migration and recognizes either standalone migration-ledger column format.

## Local startup

Follow the commands in the root `README.md`. Configure backend `.env` values before starting the API. Do not replace real credentials when copying example settings into an existing environment file.

## Existing database warning

Back up an existing PostgreSQL database before running migrations. The migration runner handles the `schema_migrations.filename` format from Phase 1 and the `schema_migrations.name` format from standalone Phase 2. Review the current migration ledger and database schema before applying this combined project to a database that has been modified manually.

## Not included yet

The 100-vehicle catalogue, verified live vehicle image assets and market-priced vehicle records, booking/checkout/payment flows, and complete MFA workflows are not delivered by this integration. Refer to `100-vehicle-catalog-plan.md` and `MFA-AND-SECURITY-BOUNDARIES.md` for the current scope boundaries.
