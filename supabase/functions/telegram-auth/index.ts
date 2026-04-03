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
  entries.sort(([a], [b]) => a.localeCompare(b));
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

    const { initData } = await req.json();
    if (!initData) {
      return new Response(
        JSON.stringify({ error: 'Missing initData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate initData signature
    const parsed = await validateInitData(initData, botToken);

    // Parse user object
    const userStr = parsed['user'];
    if (!userStr) throw new Error('No user in initData');
    const tgUser = JSON.parse(userStr);

    const telegramId = tgUser.id;
    const firstName = tgUser.first_name || 'User';
    const lastName = tgUser.last_name || null;
    const username = tgUser.username || null;
    const photoUrl = tgUser.photo_url || null;

    // Check auth_date freshness (max 1 day)
    const authDate = parseInt(parsed['auth_date'] || '0');
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
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
