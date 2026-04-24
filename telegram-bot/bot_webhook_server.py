"""
Telegram webhook server - receives updates and sends responses via Telegram API
Works in Russia where api.telegram.org is blocked by routing through proxy
"""
import os
import asyncio
import json
import aiohttp
from aiohttp import web

BOT_TOKEN = os.environ.get('BOT_TOKEN')
MINI_APP_URL = os.environ.get('MINI_APP_URL')
BASE_URL = os.environ.get('BASE_URL', '').rstrip('/')
WEBHOOK_PATH = os.environ.get('WEBHOOK_PATH', '/telegram-webhook')
PORT = int(os.environ.get('PORT', 8080))

TELEGRAM_API = 'https://api.telegram.org'

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
    callback_id = payload.get('callback_query', {}).get('id')
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
    # Check for callback query
    if 'callback_query' in payload:
        data = payload['callback_query'].get('data', '')
        if data == 'help_home_screen':
            await handle_help_callback(payload)

    # Check for /start command
    if 'message' in payload:
        text = payload['message'].get('text', '')
        if text == '/start' or text.startswith('/start '):
            await handle_start(payload)

async def webhook_handler(request):
    """Handle incoming webhook from Telegram"""
    try:
        payload = await request.json()
        print(f"📥 Received update: {json.dumps(payload, indent=2)[:500]}")

        await process_update(payload)
        
        return web.json_response({"ok": True})

    except Exception as e:
        print(f"❌ Error: {e}")
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