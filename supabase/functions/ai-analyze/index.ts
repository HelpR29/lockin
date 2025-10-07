// @ts-nocheck
// deno-lint-ignore-file
// Supabase Edge Function: ai-analyze
// Generates weekly/monthly trading analysis via OpenAI using a server-side API key.
// Quotas: 1 free weekly per user. Monthly: 1 free for premium users only.
//
// Required env vars (set in Supabase project):
// - SUPABASE_URL
// - SUPABASE_ANON_KEY
// - SUPABASE_SERVICE_ROLE_KEY
// - OPENAI_API_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2';

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '*';
  const reqHeaders = req.headers.get('Access-Control-Request-Headers') || 'authorization, content-type, apikey, x-client-info';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': reqHeaders,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function isoWeekKey(d: Date): { key: string; start: Date; end: Date } {
  // ISO week: week starts Monday 00:00 UTC
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday in current week decides the year.
  const day = date.getUTCDay() || 7; // 1..7
  if (day !== 1) date.setUTCDate(date.getUTCDate() + (1 - day)); // back to Monday
  const monday = new Date(date); monday.setUTCHours(0,0,0,0);
  const end = new Date(monday); end.setUTCDate(end.getUTCDate() + 7);

  // Compute week number
  const temp = new Date(monday);
  temp.setUTCDate(temp.getUTCDate() + 3); // Thursday
  const year = temp.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((monday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const key = `${year}-${String(week).padStart(2,'0')}`;
  return { key, start: monday, end };
}

function monthKey(d: Date): { key: string; start: Date; end: Date } {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
  const key = `${year}-${String(month + 1).padStart(2,'0')}`;
  return { key, start, end };
}

Deno.serve(async (req: Request): Promise<Response> => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL') || Deno.env.get('URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey || !openaiKey) {
      return new Response(JSON.stringify({ error: 'Missing server configuration' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const period = (body?.period === 'monthly') ? 'monthly' : 'weekly';

    // User-scoped client validates identity
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    // Admin client for DB access
    const admin = createClient(supabaseUrl, serviceKey);

    // Check premium status
    const { data: profile } = await admin.from('user_profiles').select('is_premium').eq('user_id', userId).single();
    const isPremium = !!profile?.is_premium;

    // Compute period key and bounds
    const now = new Date();
    const wk = isoWeekKey(now);
    const mk = monthKey(now);
    const key = period === 'weekly' ? wk.key : mk.key;
    const start = period === 'weekly' ? wk.start : mk.start;
    const end = period === 'weekly' ? wk.end : mk.end;

    // Quotas
    const allowed = period === 'weekly' ? 1 : (isPremium ? 1 : 0);
    if (allowed <= 0) {
      return new Response(JSON.stringify({ error: 'Monthly AI analysis is for premium users only.' }), {
        status: 402, // Payment Required
        headers: {
          ...cors,
          'Access-Control-Allow-Origin': req.headers.get('Origin') || '*',
          'Access-Control-Allow-Headers': req.headers.get('Access-Control-Request-Headers') || 'authorization, content-type, apikey, x-client-info',
          'Content-Type': 'application/json',
        },
      });
    }

    // Usage check
    const { data: usageRow } = await admin
      .from('ai_usage')
      .select('used_count')
      .eq('user_id', userId)
      .eq('period', period)
      .eq('period_key', key)
      .maybeSingle();

    if ((usageRow?.used_count || 0) >= allowed) {
      return new Response(JSON.stringify({ error: 'Quota exceeded for this period.' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Fetch trades for timeframe (closed only)
    const { data: trades, error: tErr } = await admin
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .order('created_at', { ascending: true });

    if (tErr) {
      return new Response(JSON.stringify({ error: 'Failed to load trades' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Prepare compact trade summary
    const compact = (trades || []).slice(-100).map((t: any) => ({
      symbol: t.symbol,
      type: t.trade_type,
      direction: t.direction,
      entry: t.entry_price,
      exit: t.exit_price,
      size: t.position_size,
      status: t.status,
      notes: t.notes || '',
      created_at: t.created_at,
    }));

    // Build system + user messages
    const sys = `You are a trading performance coach. Produce a concise ${period} analysis covering:\n- Key stats (win rate, profit factor, best/worst day/hour)\n- Patterns (time-of-day, emotions if present in notes)\n- 3-5 actionable recommendations\nReturn clean HTML only (no CSS/JS). Use short paragraphs and bullet lists.`;

    const userMsg = `Analyze this user's ${period} trade history (UTC timeframe ${start.toISOString()} .. ${end.toISOString()}).\nHere are up to 100 recent closed trades in this period:\n${JSON.stringify(compact).slice(0, 18000)}`;

    // Call OpenAI Chat Completions
    const oaResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [ { role: 'system', content: sys }, { role: 'user', content: userMsg } ],
        temperature: 0.4,
        max_tokens: 1200,
      }),
    });

    if (!oaResp.ok) {
      const txt = await oaResp.text().catch(()=>'');
      return new Response(JSON.stringify({ error: 'OpenAI request failed', detail: txt }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const oaData = await oaResp.json();
    const html = oaData?.choices?.[0]?.message?.content?.trim() || '<div>No analysis generated.</div>';

    // Record usage
    await admin.from('ai_usage').upsert({
      user_id: userId,
      period,
      period_key: key,
      used_count: (usageRow?.used_count || 0) + 1,
      last_used_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ html, period, period_key: key }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // Build CORS again if req not available (edge case)
    const fallbackCors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
    return new Response(JSON.stringify({ error: 'Unexpected error', detail: String(e) }), {
      status: 500,
      headers: { ...fallbackCors, 'Content-Type': 'application/json' },
    });
  }
});
