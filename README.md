# Speak

A mobile app that helps you sound natural in everyday English. Type (voice coming
later) a message, and Claude returns the mistakes it found, a natural corrected
version, and a different way to say the same thing. Everything is saved to a
History tab, and a Profile tab aggregates your recurring mistakes so you know
what to practice.

## Stack

- **App:** Expo (React Native + TypeScript), file-based routing via `expo-router`
- **Backend:** Supabase (Postgres + Auth + Row Level Security + Edge Functions)
- **AI:** `claude-opus-4-8` for the analysis, called from a Supabase Edge Function
  so the API key never ships in the app

## Project layout

```
src/
  app/                    screens (expo-router)
    _layout.tsx           auth gate + navigation
    sign-in.tsx           email/password auth
    (tabs)/
      index.tsx           Coach: type a message, get feedback
      history.tsx         list of past entries
      profile.tsx         aggregated mistakes + areas to study
    entry/[id].tsx        one past entry in full
  components/             ResultView, MistakeCard, SeverityBadge, themed-*
  lib/                    supabase client, auth, api calls, types
supabase/
  migrations/0001_init.sql   schema + RLS + category taxonomy + stats view
  functions/
    _shared/prompt.ts        Claude system prompt + response schema
    analyze/index.ts         Edge Function: text -> Claude -> saved entry
```

## One-time setup

### 1. Create a Supabase project
At https://supabase.com create a project. From **Project Settings -> API** copy
the Project URL and the `anon` public key.

### 2. App environment
```bash
cp .env.example .env
```
Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

### 3. Install the Supabase CLI and link the project
```bash
brew install supabase/tap/supabase   # or: npm i -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Push the database schema
```bash
supabase db push
```
This creates the tables, Row Level Security policies, the category list, and the
`category_stats` view.

### 5. Set the Claude key and deploy the function
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy analyze
```

## Run the app
```bash
npm start        # then press i (iOS), a (Android), or w (web)
```

Create an account on the sign-in screen, then type a message on the Coach tab.

> **Email confirmation:** by default Supabase may require email confirmation on
> sign-up. For fast testing with friends, turn it off in
> **Authentication -> Providers -> Email** (Confirm email = off), or confirm via
> the link Supabase emails.

## Adding voice later
The data model already supports it (`entries.source = 'audio'`, `audio_path`).
To add speech-to-text: add a `transcribe` Edge Function that takes an audio file,
calls a speech-to-text API (e.g. Whisper), and returns text, then feed that text
into the existing `analyze` flow.
