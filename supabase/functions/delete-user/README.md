# delete-user (Supabase Edge Function)

Deletes the currently authenticated Supabase Auth user on the server using the service role key.

## Setup

1. Ensure you have the Supabase CLI installed and logged in.
2. In your project's environment for this function, set:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep secret; only available on the server-side)

## Deploy

```
supabase functions deploy delete-user
```

## Invoke (from client)

Send a POST request with the user's auth token in the `Authorization` header:

```ts
const { data: { session } } = await supabase.auth.getSession();
await fetch(`${SUPABASE_FUNCTIONS_URL}/delete-user`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token ?? ''}`,
  },
});
```

In production with Supabase-hosted functions, `SUPABASE_FUNCTIONS_URL` is typically `https://<project-ref>.functions.supabase.co`.

## Notes
- This function validates the caller's identity, then uses the service role to delete the Auth user.
- Pair this with client-side data purge before calling the function to remove all app data tied to the user.
