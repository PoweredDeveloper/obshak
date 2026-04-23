import { createHmac, timingSafeEqual } from 'node:crypto';

export function validateInitData(initData: string, botToken: string): Record<string, string> {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('Missing hash');

  params.delete('hash');
  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hash, 'hex'))) {
    throw new Error('Invalid initData signature');
  }

  const result: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(initData).entries()) {
    result[k] = v;
  }
  return result;
}

export function validateLoginWidgetData(
  userData: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
  },
  botToken: string,
): { id: number; first_name: string; last_name: string | null; username: string | null; photo_url: string | null; auth_date: number } {
  const { hash, ...dataWithoutHash } = userData;
  const entries = Object.entries(dataWithoutHash)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
  const expected = createHmac('sha256', botToken).update(dataCheckString).digest('hex');
  if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hash, 'hex'))) {
    throw new Error('Invalid Login Widget signature');
  }
  return {
    id: userData.id,
    first_name: userData.first_name,
    last_name: userData.last_name ?? null,
    username: userData.username ?? null,
    photo_url: userData.photo_url ?? null,
    auth_date: userData.auth_date,
  };
}
