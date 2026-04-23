import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    try {
      return JSON.parse(envOrigins);
    } catch {
      return envOrigins.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [
    'https://obshak.space',
    'http://obshak.space',
    'https://www.obshak.space',
    'http://www.obshak.space',
    'https://awswwgvlnhbtcfeexyqv.supabase.co',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3000',
  ];
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

/**
 * Validate Telegram Mini App initData
 * Uses HMAC-SHA256 with "WebAppData" derivation
 */
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

/**
 * Validate Telegram Login Widget data
 * Uses HMAC-SHA256 with bot token directly (no WebAppData derivation)
 */
async function validateLoginWidgetData(
  userData: { id: number; first_name: string; last_name?: string; username?: string; photo_url?: string; auth_date: number; hash: string },
  botToken: string
): Promise<{ id: number; first_name: string; last_name: string | null; username: string | null; photo_url: string | null; auth_date: number }> {
  const { hash, ...dataWithoutHash } = userData;

  // Build data check string (sorted alphabetically by key)
  const entries = Object.entries(dataWithoutHash)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  const encoder = new TextEncoder();

  // HMAC-SHA256 with bot token directly
  const secretKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(botToken),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(dataCheckString));
  const hexHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (hexHash !== hash) throw new Error('Invalid Login Widget signature');

  return {
    id: userData.id,
    first_name: userData.first_name,
    last_name: userData.last_name || null,
    username: userData.username || null,
    photo_url: userData.photo_url || null,
    auth_date: userData.auth_date,
  };
}

/** Find user by email with pagination */
async function findAuthUserIdByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string,
): Promise<string | undefined> {
  const perPage = 1000;
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < perPage) return undefined;
  }
  return undefined;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { initData, loginWidgetData } = body;

    let telegramId: number;
    let firstName: string;
    let lastName: string | null;
    let username: string | null;
    let photoUrl: string | null;

    if (initData) {
      // Telegram Mini App authentication
      const parsed = await validateInitData(initData, botToken);
      const userStr = parsed['user'];
      if (!userStr) throw new Error('No user in initData');
      const tgUser = JSON.parse(userStr);

      telegramId = tgUser.id;
      firstName = tgUser.first_name || 'User';
      lastName = tgUser.last_name || null;
      username = tgUser.username || null;
      photoUrl = tgUser.photo_url || null;

      // Check auth_date freshness (max 1 day)
      const authDate = parseInt(parsed['auth_date'] || '0');
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - authDate > 86400) {
        return new Response(
          JSON.stringify({ error: 'Auth data is outdated' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (loginWidgetData) {
      // Telegram Login Widget authentication
      const validated = await validateLoginWidgetData(loginWidgetData, botToken);

      telegramId = validated.id;
      firstName = validated.first_name;
      lastName = validated.last_name;
      username = validated.username;
      photoUrl = validated.photo_url;

      // Check auth_date freshness (max 1 week for Login Widget)
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime - validated.auth_date > 604800) { // 7 days
        return new Response(
          JSON.stringify({ error: 'Auth data is outdated' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Missing initData or loginWidgetData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deterministic email from telegram_id
    const email = `tg_${telegramId}@telegram.internal`;

    const existingId = await findAuthUserIdByEmail(supabase, email);

    let userId: string;

    if (existingId) {
      userId = existingId;
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
    return new Response(
      JSON.stringify({ error: 'Authentication failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});