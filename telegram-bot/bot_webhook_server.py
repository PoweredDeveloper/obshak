"""
Telegram webhook server - receives updates and sends responses via Telegram API
Works in Russia where api.telegram.org is blocked by routing through proxy
"""
import os
import asyncio
import json
from datetime import datetime, timezone
import aiohttp
from aiohttp import web

BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN') or os.environ.get('BOT_TOKEN')
MINI_APP_URL = (os.environ.get('MINI_APP_URL') or 'https://obshak.space').strip().rstrip('/')
MENU_BUTTON_TEXT = os.environ.get('MENU_BUTTON_TEXT', 'Открыть')
BASE_URL = os.environ.get('BASE_URL', '').rstrip('/')
WEBHOOK_PATH = os.environ.get('WEBHOOK_PATH', '/telegram-webhook')
PORT = int(os.environ.get('PORT', 8080))
WEBHOOK_SECRET_TOKEN = os.environ.get('TELEGRAM_WEBHOOK_SECRET_TOKEN') or os.environ.get(
    'WEBHOOK_SECRET_TOKEN'
)

TELEGRAM_API = 'https://api.telegram.org'
SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
HTTP_TIMEOUT_SECONDS = float(os.environ.get('HTTP_TIMEOUT_SECONDS', '12'))
TELEGRAM_SEND_CONCURRENCY = int(os.environ.get('TELEGRAM_SEND_CONCURRENCY', '10'))
TELEGRAM_MIN_DELAY_SECONDS = float(os.environ.get('TELEGRAM_MIN_DELAY_SECONDS', '0.04'))

from messages import get_bot_copy


def _supabase_headers():
    return {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    }


def _extract_actor(payload):
    if 'message' in payload:
        msg = payload.get('message', {})
        from_user = msg.get('from', {})
        return from_user.get('id'), msg.get('chat', {}).get('id')
    if 'callback_query' in payload:
        cb = payload.get('callback_query', {})
        from_user = cb.get('from', {})
        msg = cb.get('message', {})
        return from_user.get('id'), msg.get('chat', {}).get('id')
    return None, None

async def log_bot_event(event_type, payload, telegram_id=None, chat_id=None):
    """Write bot event for admin analytics."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return

    update_id = payload.get('update_id')
    body = {
        'telegram_id': telegram_id,
        'chat_id': chat_id,
        'update_id': update_id,
        'event_type': event_type,
        # Avoid storing full raw updates by default; keep logs slimmer and safer.
        'payload': {
            'update_id': update_id,
            'has_message': bool(payload.get('message')),
            'has_callback_query': bool(payload.get('callback_query')),
        },
    }

    url = f'{SUPABASE_URL}/rest/v1/bot_events'
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }
    session = _get_http_session()
    if not session:
        return
    try:
        async with session.post(url, headers=headers, json=body) as resp:
            if resp.status >= 400:
                print(f"⚠️ Failed to write bot_events: HTTP {resp.status}")
    except Exception as e:
        print(f"⚠️ Failed to write bot_events: {e}")

async def set_blocked_status(telegram_id, blocked, error_text=''):
    """Store current bot-user block status."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY or not telegram_id:
        return

    url = f'{SUPABASE_URL}/rest/v1/bot_user_status?on_conflict=telegram_id'
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }
    now_iso = datetime.now(timezone.utc).isoformat()
    body_for_rest = {
        'telegram_id': telegram_id,
        'is_blocked': blocked,
        'blocked_at': None,
        'unblocked_at': None,
        'last_error': error_text[:500] if error_text else None,
        'updated_at': now_iso,
    }
    if blocked:
        body_for_rest['blocked_at'] = now_iso
    else:
        body_for_rest['unblocked_at'] = now_iso

    session = _get_http_session()
    if not session:
        return
    try:
        async with session.post(url, headers=headers, json=body_for_rest) as resp:
            if resp.status >= 400:
                print(f"⚠️ Failed to upsert bot_user_status: HTTP {resp.status}")
    except Exception as e:
        print(f"⚠️ Failed to upsert bot_user_status: {e}")

async def supabase_is_admin(telegram_id):
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY or not telegram_id:
        return False
    url = f'{SUPABASE_URL}/rest/v1/admins?telegram_id=eq.{telegram_id}&select=id&limit=1'
    try:
        session = _get_http_session()
        if not session:
            return False
        async with session.get(url, headers=_supabase_headers()) as resp:
            if resp.status != 200:
                print(f'supabase_is_admin HTTP {resp.status}')
                return False
            rows = await resp.json()
            return bool(rows)
    except Exception as e:
        print(f'supabase_is_admin error: {e}')
        return False


async def fetch_profile_telegram_ids():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return []
    url = f'{SUPABASE_URL}/rest/v1/profiles?select=telegram_id&telegram_id=not.is.null'
    try:
        session = _get_http_session()
        if not session:
            return []
        async with session.get(url, headers=_supabase_headers()) as resp:
            if resp.status != 200:
                print(f'fetch_profile_telegram_ids HTTP {resp.status}')
                return []
            rows = await resp.json()
            return list({int(r['telegram_id']) for r in rows if r.get('telegram_id')})
    except Exception as e:
        print(f'fetch_profile_telegram_ids error: {e}')
        return []


async def handle_broadcast_command(payload, sender_telegram_id):
    if not await supabase_is_admin(sender_telegram_id):
        chat_id = payload.get('message', {}).get('chat', {}).get('id')
        await send_telegram_message(
            chat_id,
            'Команда только для администраторов.',
            parse_mode=None,
        )
        return

    text = payload.get('message', {}).get('text', '') or ''
    body = text[len('/broadcast'):].strip() if text.startswith('/broadcast') else ''
    chat_id = payload.get('message', {}).get('chat', {}).get('id')

    if not body:
        await send_telegram_message(
            chat_id,
            'Использование: /broadcast ваш текст сообщения',
            parse_mode=None,
        )
        return

    ids = await fetch_profile_telegram_ids()
    sent = 0
    failed = 0

    sem = asyncio.Semaphore(TELEGRAM_SEND_CONCURRENCY)

    async def _send_one(tid: int):
        nonlocal sent, failed
        async with sem:
            result = await send_telegram_message(tid, body, parse_mode=None, recipient_telegram_id=tid)
            if result and result.get('ok'):
                sent += 1
            else:
                failed += 1
            if TELEGRAM_MIN_DELAY_SECONDS > 0:
                await asyncio.sleep(TELEGRAM_MIN_DELAY_SECONDS)

    await asyncio.gather(*(_send_one(tid) for tid in ids))

    await send_telegram_message(
        chat_id,
        f'Рассылка завершена.\nОтправлено: {sent}\nОшибок: {failed}\nВсего: {len(ids)}',
        parse_mode=None,
    )


_HTTP_SESSION: aiohttp.ClientSession | None = None


def _get_http_session() -> aiohttp.ClientSession | None:
    return _HTTP_SESSION


async def _telegram_post_json(path: str, payload: dict) -> dict | None:
    session = _get_http_session()
    if not session:
        return None

    url = f'{TELEGRAM_API}/bot{BOT_TOKEN}{path}'
    timeout = aiohttp.ClientTimeout(total=HTTP_TIMEOUT_SECONDS)

    for attempt in range(4):
        try:
            async with session.post(url, json=payload, timeout=timeout) as resp:
                data = await resp.json()
                if resp.status == 429:
                    retry_after = int(data.get('parameters', {}).get('retry_after', 1))
                    await asyncio.sleep(max(1, retry_after))
                    continue
                if resp.status >= 500:
                    await asyncio.sleep(min(2**attempt, 8))
                    continue
                return data
        except asyncio.CancelledError:
            raise
        except Exception:
            await asyncio.sleep(min(2**attempt, 8))
    return None


async def send_telegram_message(chat_id, text, keyboard=None, parse_mode='Markdown', recipient_telegram_id=None):
    """Send message via Telegram Bot API"""
    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': parse_mode,
    }
    
    if keyboard:
        payload['reply_markup'] = keyboard

    try:
        result = await _telegram_post_json('/sendMessage', payload)
        if not result:
            return None

        # Don't spam logs for every send; keep a small breadcrumb only on errors.
        if not result.get('ok'):
            print(f"⚠️ Telegram sendMessage failed: {result.get('error_code')} {result.get('description')}")

        # Track block status only if we know the recipient's user telegram_id.
        if recipient_telegram_id:
            if result.get('ok'):
                await set_blocked_status(recipient_telegram_id, False, '')
            elif result.get('error_code') == 403:
                await set_blocked_status(recipient_telegram_id, True, result.get('description', ''))
        return result
    except Exception as e:
        print(f"❌ Error sending message: {e}")
        return None

async def sync_chat_menu_button(chat_id: int) -> None:
    """Refresh menu Web App URL for this chat (helps iOS when BotFather/API drift)."""
    await _telegram_post_json(
        '/setChatMenuButton',
        {
            'chat_id': chat_id,
            'menu_button': {
                'type': 'web_app',
                'text': MENU_BUTTON_TEXT,
                'web_app': {'url': MINI_APP_URL},
            },
        },
    )


async def handle_start(payload):
    """Handle /start command"""
    chat_id = payload.get('message', {}).get('chat', {}).get('id')
    user = payload.get('message', {}).get('from', {})
    first_name = user.get('first_name', 'друг')
    copy = get_bot_copy(first_name)

    if chat_id is not None:
        await sync_chat_menu_button(chat_id)

    keyboard = {
        "inline_keyboard": [
            [{"text": copy.open_button_text, "web_app": {"url": MINI_APP_URL}}],
            [{"text": copy.help_button_text, "callback_data": copy.help_callback_data}]
        ]
    }
    recipient_telegram_id = user.get('id')
    await send_telegram_message(chat_id, copy.start_message, keyboard, recipient_telegram_id=recipient_telegram_id)

async def handle_help_callback(payload):
    """Handle help callback"""
    chat_id = payload.get('callback_query', {}).get('message', {}).get('chat', {}).get('id')
    user = payload.get('callback_query', {}).get('from', {}) or {}
    copy = get_bot_copy(user.get('first_name', ''))

    recipient_telegram_id = user.get('id')
    await send_telegram_message(chat_id, copy.help_message, recipient_telegram_id=recipient_telegram_id)

async def process_update(payload):
    """Process incoming update"""
    telegram_id, chat_id = _extract_actor(payload)
    await log_bot_event('update_received', payload, telegram_id, chat_id)

    # Check for callback query
    if 'callback_query' in payload:
        data = payload['callback_query'].get('data', '')
        if data == 'help_home_screen':
            await log_bot_event('help_callback', payload, telegram_id, chat_id)
            await handle_help_callback(payload)
            return
        await log_bot_event('unrecognized_request', payload, telegram_id, chat_id)
        return

    if 'message' in payload:
        text = payload['message'].get('text', '') or ''
        if text == '/start' or text.startswith('/start '):
            await log_bot_event('start_command', payload, telegram_id, chat_id)
            await handle_start(payload)
            return
        if text.startswith('/broadcast ') or text == '/broadcast':
            await log_bot_event('broadcast_command', payload, telegram_id, chat_id)
            await handle_broadcast_command(payload, telegram_id)
            return
        await log_bot_event('unrecognized_request', payload, telegram_id, chat_id)
        return

    await log_bot_event('unrecognized_request', payload, telegram_id, chat_id)

async def webhook_handler(request):
    """Handle incoming webhook from Telegram"""
    try:
        if WEBHOOK_SECRET_TOKEN:
            got = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
            if got != WEBHOOK_SECRET_TOKEN:
                return web.json_response({"ok": False}, status=401)

        payload = await request.json()
        # Avoid logging full user payloads; DB event will keep minimal metadata.
        print(f"📥 Received update_id={payload.get('update_id')}")

        await process_update(payload)
        
        return web.json_response({"ok": True})

    except Exception as e:
        print(f"❌ Error: {e}")
        telegram_id, chat_id = _extract_actor(payload if 'payload' in locals() else {})
        await log_bot_event(
            'bot_crash',
            {'error': str(e), 'raw_update': payload if 'payload' in locals() else None},
            telegram_id,
            chat_id
        )
        return web.json_response({"ok": False, "error": str(e)}, status=200)

async def health_handler(request):
    return web.json_response({"ok": True})

async def main():
    app = web.Application()
    app.router.add_post(WEBHOOK_PATH, webhook_handler)
    app.router.add_get("/health", health_handler)

    async def _ctx(app_):
        global _HTTP_SESSION
        _HTTP_SESSION = aiohttp.ClientSession()
        try:
            yield
        finally:
            await _HTTP_SESSION.close()
            _HTTP_SESSION = None

    app.cleanup_ctx.append(_ctx)

    runner = web.AppRunner(app)
    await runner.setup()

    site = web.TCPSite(runner, '0.0.0.0', PORT)
    await site.start()

    print(f"🤖 Webhook server running on port {PORT}")
    print(f"📍 Webhook path: {WEBHOOK_PATH}")
    print(f"⏳ Waiting for incoming webhooks from Telegram...")
    webhook_url = f"{BASE_URL}{WEBHOOK_PATH}" if BASE_URL else f"<BASE_URL>{WEBHOOK_PATH}"
    print("⚠️  Remember to set webhook manually:")
    print("   curl -X POST 'https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook'")
    print("   -H 'Content-Type: application/json'")
    print(f"   -d '{{\"url\": \"{webhook_url}\"}}'")

    await asyncio.Event().wait()

if __name__ == '__main__':
    asyncio.run(main())