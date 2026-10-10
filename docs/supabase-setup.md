# BookEr AI: Supabase and Vercel setup

## Existing backend

BookEr AI uses the existing Supabase project **BookerAI** (project ref eecefbxelrtrtyeceeln, region ap-northeast-1):
https://supabase.com/dashboard/project/eecefbxelrtrtyeceeln

The application has been wired to Supabase Auth and the cloud tables. Verify the project is active before testing authentication or sync.

## Vercel environment variables

In the linked Vercel project, configure these for Production, Preview, and Development as appropriate:

- `NEXT_PUBLIC_SUPABASE_URL=https://eecefbxelrtrtyeceeln.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the project's public anon/publishable key
- `OPENAI_API_KEY`: your OpenAI API key (server-side secret; required for real AI responses)
- `OPENAI_MODEL=gpt-4o-mini` (optional; default model)
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase service-role secret, required only for account deletion

Never prefix secret keys with `NEXT_PUBLIC_`, commit them to Git, or paste them into client-side code. The service-role key bypasses RLS and must only be used by server-side code.

After changing Vercel environment variables, redeploy the project for the new values to take effect.

## Database

The migration is stored at `supabase/migrations/20261010120000_bookerai_core.sql`. It defines:

- `booker_projects`: project JSON, keyed by user and project ID
- `booker_settings`: settings JSON per user
- `booker_daily_stats`: per-user writing statistics by date

RLS policies restrict rows to the authenticated user. Confirm the migration is applied in the Supabase SQL Editor and verify that all three tables have RLS enabled.

## Email/password authentication

The sign-in and registration forms call Supabase Auth. If email confirmation is enabled, registration may require the user to confirm their email before signing in. Phone login requires phone auth and SMS verification to be configured in Supabase.

## Google OAuth setup

1. In Supabase, open **Authentication → Sign In / Providers → Google** and enable Google.
2. Enter the OAuth client ID and client secret from your Google Cloud OAuth configuration.
3. Add the Supabase-provided callback URL to the authorized redirect URIs in Google Cloud.
4. Add these application callback URLs to Supabase's redirect URL allow list:
   - `http://localhost:3000/auth/callback` for local development
   - `https://YOUR-VERCEL-DOMAIN/auth/callback` for the deployed app
5. Save the provider settings and test Google sign-in on the deployed domain.

The application callback retrieves the signed-in user from Supabase before storing the session.

## Data sync and migration

After sign-in, the app merges browser projects with cloud projects and uploads local projects. Settings and daily statistics also sync. Keep the original browser data until you confirm it has appeared in the cloud and on another device.

Cloud sync is best-effort in the current client implementation: inspect the browser console and Supabase logs if data does not appear. Do not treat a successful local save as proof that a cloud request succeeded.

## Account deletion

The server endpoint `/api/account` verifies the caller's Supabase access token before deleting that user's Auth record. Configure `SUPABASE_SERVICE_ROLE_KEY` as a server-only Vercel environment variable for this feature. If it is absent, the endpoint returns a configuration error rather than claiming deletion succeeded.

## Required verification

After configuring the external keys/providers:

- Register with an email account and verify confirmation behavior.
- Sign in and sign out; verify unauthenticated dashboard access redirects to sign-in.
- Create a project, edit a chapter, reload, and confirm the project remains.
- Check the three tables in Supabase and test on a second browser/device.
- Test Google OAuth after enabling the provider.
- Test an AI synopsis and an AI Studio request with a valid OpenAI key.
- Test password update and account deletion only after confirming the account is disposable.
