
# SocialConnect (Next.js + Supabase)

A clean, working implementation of the spec you shared. It uses Supabase Auth, Postgres and Realtime. All endpoints are implemented via direct Supabase queries from the client for simplicity, plus SQL triggers for counts and notifications.

> Tip: This project **does not use RLS** per your request. For production, enable RLS and convert writes to **server routes with the service role**.

## 1) Prereqs

- Node.js 18+
- A Supabase project
- Create Storage buckets:
  - `post-images` (public)
  - `avatars` (public)
- Enable Realtime for the `public` schema.

## 2) Database

Open Supabase SQL editor and run:

```sql
-- copy contents of supabase_schema.sql into the SQL editor, run it.
```

## 3) Env

Copy `.env.example` to `.env` and fill values:

```
NEXT_PUBLIC_SUPABASE_URL=...         # from Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only secret
```

## 4) Install & run

```bash
npm i
npm run dev
```

App opens on http://localhost:3000

- Register → creates auth user + profile row.
- Login → email or username supported.
- Compose → create posts (JPEG/PNG ≤2MB). Images go to `post-images` bucket.
- Feed → shows followed users + your posts chronologically.
- Notifications → realtime via triggers.
- Admin → requires your profile role to be `admin`.

## 5) Admin

Set any profile `role` to `admin` in the `profiles` table to unlock `/admin`.

## 6) Notes

- Tokens stored in Supabase session (client-managed).
- If you already have a `profiles` table, adjust column names or run a migration.
- This is a solid base. You can move mutations to `/app/api/*` routes with the service key for stricter control later.
