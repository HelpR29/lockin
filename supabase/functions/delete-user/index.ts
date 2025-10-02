// @ts-nocheck
// deno-lint-ignore-file
// Supabase Edge Function: delete-user
// Deletes the currently authenticated Supabase Auth user (server-side, secure)
// Requires the following environment variables to be set for this function:
// - SUPABASE_URL
// - SUPABASE_ANON_KEY
// - SUPABASE_SERVICE_ROLE_KEY (keep secret)

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Built-in envs are provided by Supabase. Allow custom fallbacks without the SUPABASE_ prefix
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL') || Deno.env.get('URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Missing server configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use a user-scoped client to validate the caller identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;

    // Use an admin client with service role (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Remove user-owned rows across app tables to avoid FK violations
    const safeDelete = async (table: string, column: string = 'user_id') => {
      try { await adminClient.from(table).delete().eq(column, userId); } catch (_) {}
    };

    // Order matters where there may be cross-table FKs
    await safeDelete('rule_violations');
    await safeDelete('trades');
    await safeDelete('trading_rules');
    await safeDelete('user_defined_rules');
    await safeDelete('notifications');
    await safeDelete('share_history');
    await safeDelete('daily_stats');
    await safeDelete('daily_check_ins');
    await safeDelete('beer_spills');
    await safeDelete('beer_completions');
    await safeDelete('user_stars');
    await safeDelete('user_achievements');
    await safeDelete('user_customization');
    await safeDelete('user_onboarding');
    await safeDelete('privacy_settings');
    await safeDelete('user_subscriptions');
    // follows has two foreign keys
    await safeDelete('follows', 'follower_id');
    await safeDelete('follows', 'following_id');
    await safeDelete('user_goals');
    await safeDelete('user_progress');
    // Finally profile
    await safeDelete('user_profiles');

    // Remove avatar files in storage (best-effort)
    try {
      const listed = await adminClient.storage.from('avatars').list(userId, { limit: 1000 });
      const files = listed?.data || [];
      if (files.length) {
        const paths = files.map((f: any) => `${userId}/${f.name}`);
        await adminClient.storage.from('avatars').remove(paths);
      }
    } catch (_) { /* ignore */ }

    // Diagnostics: check remaining rows across tables before deleting auth user
    const tablesToCheck = [
      'rule_violations','trades','trading_rules','user_defined_rules','notifications','share_history',
      'daily_stats','daily_check_ins','beer_spills','beer_completions','user_stars','user_achievements',
      'user_customization','user_onboarding','privacy_settings','user_subscriptions','follows','user_goals',
      'user_progress','user_profiles'
    ];
    const remaining: Record<string, number> = {};
    for (const t of tablesToCheck) {
      try {
        const { count } = await adminClient.from(t).select('*', { count: 'exact', head: true }).eq('user_id', userId);
        if ((count ?? 0) > 0) remaining[t] = count as number;
      } catch (_) { /* ignore count errors */ }
      // Also check follows secondary columns
      if (t === 'follows') {
        try {
          const { count: c1 } = await adminClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId);
          if ((c1 ?? 0) > 0) remaining['follows.follower_id'] = c1 as number;
          const { count: c2 } = await adminClient.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId);
          if ((c2 ?? 0) > 0) remaining['follows.following_id'] = c2 as number;
        } catch (_) {}
      }
    }
    if (Object.keys(remaining).length > 0) {
      return new Response(JSON.stringify({ error: 'Rows still reference user', remaining }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Now delete the auth user
    const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);

    if (delErr) {
      // Fallback: call Admin REST API directly for better error surfacing
      try {
        const resp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (resp.ok) {
          return new Response(JSON.stringify({ success: true, note: 'Deleted via REST fallback' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // If 404, treat as success (already deleted)
        if (resp.status === 404) {
          return new Response(JSON.stringify({ success: true, note: 'User not found (already deleted)' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const text = await resp.text();
        return new Response(JSON.stringify({ error: 'Admin API error', status: resp.status, detail: text || delErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Database error deleting user', detail: String(delErr?.message || e) }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unexpected error', detail: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
