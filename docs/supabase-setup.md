# Supabase setup for BookEr AI

## Existing project

The Supabase workspace contains a project named **BookerAI** (`eecefbxelrtrtyeceeln`, region `ap-northeast-1`). It was reported as **inactive** when inspected. Restore it in the Supabase dashboard before applying the migration or testing API connectivity:

https://supabase.com/dashboard/project/eecefbxelrtrtyeceeln

Do not create a replacement project unless you intend to change the backend target.

## Environment variables

Configure these variables in your local `.env.local` and in the hosting provider environment:

- `NEXT_PUBLIC_SUPABASE_URL=https://eecefbxelrtrtyeceeln.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=` or the project publishable key from Supabase API settings
- `OPENAI_API_KEY=` (server-side secret; never use a `NEXT_PUBLIC_` prefix)
- `OPENAI_MODEL=gpt-4o-mini` (optional)

Never commit `.env.local`, an OpenAI API key, a Supabase service-role key, or any other secret. The public Supabase key should only be exposed when Row Level Security is correctly configured.

## Database migration

After the project is restored, apply `supabase/migrations/20261010120000_bookerai_core.sql` in the Supabase SQL Editor, or apply it through the Supabase CLI migration workflow.

It creates:
- `booker_projects`: per-user project JSON with a composite user/project key
- `booker_settings`: per-user settings JSON
- `booker_daily_stats`: per-user daily writing statistics

All three tables enable Row Level Security and grant access only to authenticated users. Policies constrain operations to rows whose `user_id` matches `auth.uid()`.

After applying the migration, verify that all three tables have RLS enabled and test that one authenticated user cannot read or modify another user’s rows.

## Authentication provider configuration

Email/password sign-in can use Supabase Auth once the app auth UI is connected to the Supabase client. For Google sign-in, enable Google under **Authentication → Sign In / Providers**, configure its OAuth client credentials, and add the deployed callback URL to the Supabase redirect allow list. The callback route and auth UI integration are still implementation work; enabling the provider alone does not make the current UI authenticate users.

## Current limitation

Existing projects, settings, and writing statistics remain in browser `localStorage` until cloud sync and an import/migration path are implemented. Do not delete browser data while migrating. The database schema alone does not sync local data.
