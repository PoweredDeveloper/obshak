import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function validateInitData(initData: string, botToken: string): Promise<Record<string, string>> {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('Missing hash');

  params.delete('hash');
  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  const encoder = new TextEncoder();

  // HMAC-SHA256 with "WebAppData" as key to derive secret
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const secretKey = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(botToken));

  // HMAC-SHA256 with secret to compute hash
  const validationKey = await crypto.subtle.importKey(
    'raw',
    secretKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', validationKey, encoder.encode(dataCheckString));
  const hexHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (hexHash !== hash) throw new Error('Invalid initData signature');

  // Return parsed params as object
  const result: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(initData).entries()) {
    result[k] = v;
  }
  return result;
}

async function validateLoginWidgetData(
  data: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
  },
  botToken: string,
) {
  const { hash, ...payload } = data;
  const entries = Object.entries(payload)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  const encoder = new TextEncoder();
  const secret = await crypto.subtle.digest('SHA-256', encoder.encode(botToken));
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(dataCheckString));
  const expected = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (expected !== hash) throw new Error('Invalid Login Widget signature');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { initData, loginWidgetData } = await req.json();
    if (!initData && !loginWidgetData) {
      return new Response(
        JSON.stringify({ error: 'Missing initData or loginWidgetData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let telegramId: number;
    let firstName: string;
    let lastName: string | null;
    let username: string | null;
    let photoUrl: string | null;
    let authDate: number;

    if (initData) {
      const parsed = await validateInitData(initData, botToken);
      const userStr = parsed['user'];
      if (!userStr) throw new Error('No user in initData');
      const tgUser = JSON.parse(userStr);

      telegramId = tgUser.id;
      firstName = tgUser.first_name || 'User';
      lastName = tgUser.last_name || null;
      username = tgUser.username || null;
      photoUrl = tgUser.photo_url || null;
      authDate = parseInt(parsed['auth_date'] || '0');
    } else {
      await validateLoginWidgetData(loginWidgetData, botToken);
      telegramId = loginWidgetData.id;
      firstName = loginWidgetData.first_name || 'User';
      lastName = loginWidgetData.last_name || null;
      username = loginWidgetData.username || null;
      photoUrl = loginWidgetData.photo_url || null;
      authDate = Number(loginWidgetData.auth_date || 0);
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime - authDate > 86400) {
      return new Response(
        JSON.stringify({ error: 'Auth data is outdated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deterministic email from telegram_id
    const email = `tg_${telegramId}@telegram.internal`;

    // Check if auth user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          first_name: firstName,
          last_name: lastName,
          username,
        },
      });
      if (createErr) throw new Error(`Auth user creation failed: ${createErr.message}`);
      userId = newUser.user.id;
    }

    // Upsert profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          telegram_id: telegramId,
          first_name: firstName,
          last_name: lastName,
          username,
          photo_url: photoUrl,
        },
        { onConflict: 'telegram_id' }
      )
      .select()
      .single();

    if (profileErr) throw new Error(`Profile error: ${profileErr.message}`);

    // Generate magic link for session
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkErr) throw new Error(`Magic link error: ${linkErr.message}`);

    const url = new URL(linkData.properties.action_link);
    const tokenHash = url.searchParams.get('token_hash') || url.searchParams.get('token');

    return new Response(
      JSON.stringify({ profile, token_hash: tokenHash, email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Telegram auth error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status =
      message.includes('Invalid Login Widget signature') || message.includes('Invalid initData signature')
        ? 401
        : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
