import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function isCallerAdmin(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data: prof, error: pe } = await adminClient
    .from('profiles')
    .select('telegram_id')
    .eq('id', userId)
    .maybeSingle();
  if (pe || !prof?.telegram_id) return false;
  const { data: adm } = await adminClient
    .from('admins')
    .select('id')
    .eq('telegram_id', prof.telegram_id)
    .maybeSingle();
  return !!adm;
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data = await res.json();
  return { ok: data.ok === true, data };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!botToken) {
    return json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceKey);
  if (!(await isCallerAdmin(adminClient, userData.user.id))) {
    return json({ error: 'Forbidden' }, 403);
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const message = body.message?.trim();
  if (!message) {
    return json({ error: 'message required' }, 400);
  }

  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('telegram_id')
    .not('telegram_id', 'is', null);

  if (profilesError) {
    return json({ error: profilesError.message }, 500);
  }

  const chatIds = [
    ...new Set(
      (profiles || [])
        .map((p) => p.telegram_id)
        .filter((id): id is number => typeof id === 'number' && id > 0),
    ),
  ];

  let sent = 0;
  let failed = 0;

  for (const chatId of chatIds) {
    const result = await sendTelegramMessage(botToken, chatId, message);
    if (result.ok) sent += 1;
    else failed += 1;
    await new Promise((r) => setTimeout(r, 40));
  }

  return json({ ok: true, sent, failed, total: chatIds.length });
});
