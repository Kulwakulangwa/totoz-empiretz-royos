# Production Safety

This app stores business data in Supabase. Frontend changes and normal Vite deployments do not delete database rows by themselves, but SQL migrations and manual database edits can.

Before deploying app-only changes:

1. Run `npm run build`.
2. Run `npm run check:migrations`.
3. Deploy the app without running Supabase migrations unless the change needs a schema update.

Before applying a Supabase migration to production:

1. Take a Supabase backup or snapshot.
2. Test the migration against a staging copy of production data.
3. Review every finding from `npm run check:migrations`.
4. Prefer additive changes: create new tables/columns/functions first, backfill safely, then switch the app code.
5. Avoid `DROP`, `TRUNCATE`, and broad `DELETE` in production migrations unless there is a written rollback plan.

The current draft persistence fix is browser-only. It writes unsaved form state to `localStorage`; it does not write draft data to Supabase until the user submits the form.
