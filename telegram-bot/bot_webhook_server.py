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

BOT_TOKEN = os.environ.get('BOT_TOKEN')
MINI_APP_URL = os.environ.get('MINI_APP_URL')
BASE_URL = os.environ.get('BASE_URL', '').rstrip('/')
WEBHOOK_PATH = os.environ.get('WEBHOOK_PATH', '/telegram-webhook')
PORT = int(os.environ.get('PORT', 8080))

TELEGRAM_API = 'https://api.telegram.org'
SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

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
        'payload': payload,
    }

    url = f'{SUPABASE_URL}/rest/v1/bot_events'
    headers = {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }
    try:
        async with aiohttp.ClientSession() as session:
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

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=body_for_rest) as resp:
                if resp.status >= 400:
                    print(f"⚠️ Failed to upsert bot_user_status: HTTP {resp.status}")
    except Exception as e:
        print(f"⚠️ Failed to upsert bot_user_status: {e}")

async def send_telegram_message(chat_id, text, keyboard=None, parse_mode='Markdown'):
    """Send message via Telegram Bot API"""
    url = f'{TELEGRAM_API}/bot{BOT_TOKEN}/sendMessage'
    
    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': parse_mode,
    }
    
    if keyboard:
        payload['reply_markup'] = keyboard

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as resp:
                result = await resp.json()
                print(f"✅ Message sent: {result}")
                if result.get('ok'):
                    await set_blocked_status(chat_id, False, '')
                elif result.get('error_code') == 403:
                    await set_blocked_status(chat_id, True, result.get('description', ''))
                return result
    except Exception as e:
        print(f"❌ Error sending message: {e}")
        return None

async def handle_start(payload):
    """Handle /start command"""
    chat_id = payload.get('message', {}).get('chat', {}).get('id')
    user = payload.get('message', {}).get('from', {})
    first_name = user.get('first_name', 'друг')

    keyboard = {
        "inline_keyboard": [
            [{"text": "🎓 Открыть Obshak", "web_app": {"url": MINI_APP_URL}}],
            [{"text": "📱 Как добавить на главный экран?", "callback_data": "help_home_screen"}]
        ]
    }

    message = (
        f"👋 Привет, {first_name}!\n\n"
        f"🎓 Добро пожаловать в Obshak — платформу для студентов КГАСУ!\n\n"
        f"⚠️ *Сейчас идет бета-тестирование*\n"
        f"Если приложение не загружается, попробуй включить VPN.\n"
        f"Скоро исправим! 🔧\n\n"
        f"Здесь ты можешь:\n"
        f"• 📆 Смотреть расписание своей группы\n"
        f"• 👥 Смотреть расписание друзей\n"
        f"• 👨‍🏫 Оценивать преподавателей\n"
        f"• 🛠️ Находить услуги от студентов\n\n"
        f"Нажми на кнопку ниже, чтобы начать! 👇"
    )

    await send_telegram_message(chat_id, message, keyboard)

async def handle_help_callback(payload):
    """Handle help callback"""
    chat_id = payload.get('callback_query', {}).get('message', {}).get('chat', {}).get('id')

    help_text = (
        "📱 *Как добавить Obshak на главный экран*\n\n"
        "*На Android:*\n"
        "1. Открой приложение через кнопку выше\n"
        "2. Нажми на три точки (⋮) в правом верхнем углу\n"
        "3. Выбери \"Добавить на главный экран\"\n"
        "4. Готово! Теперь можно открывать как обычное приложение 🎉\n\n"
        "*На iPhone:*\n"
        "1. Открой приложение через кнопку выше\n"
        "2. Нажми на \"Поделиться\" (квадрат со стрелкой)\n"
        "3. Выбери \"На экран Домой\"\n"
        "4. Готово! Иконка появится на главном экране 🎉\n\n"
        "💡 После добавления приложение будет открываться мгновенно!"
    )

    await send_telegram_message(chat_id, help_text)

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

    # Check for /start command
    if 'message' in payload:
        text = payload['message'].get('text', '')
        if text == '/start' or text.startswith('/start '):
            await log_bot_event('start_command', payload, telegram_id, chat_id)
            await handle_start(payload)
            return
        await log_bot_event('unrecognized_request', payload, telegram_id, chat_id)
        return

    await log_bot_event('unrecognized_request', payload, telegram_id, chat_id)

async def webhook_handler(request):
    """Handle incoming webhook from Telegram"""
    try:
        payload = await request.json()
        print(f"📥 Received update: {json.dumps(payload, indent=2)[:500]}")

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

async def main():
    app = web.Application()
    app.router.add_post(WEBHOOK_PATH, webhook_handler)

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