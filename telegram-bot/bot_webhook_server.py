"""
Telegram webhook server - receives updates, never calls Telegram API
Works in Russia where api.telegram.org is blocked
"""
import os
import asyncio
import json
from aiohttp import web

BOT_TOKEN = os.environ.get('BOT_TOKEN')
MINI_APP_URL = os.environ.get('MINI_APP_URL')
WEBHOOK_PATH = os.environ.get('WEBHOOK_PATH', '/telegram-webhook')
PORT = int(os.environ.get('PORT', 8080))

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

    return {
        "method": "sendMessage",
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown",
        "reply_markup": keyboard
    }

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

    return {
        "method": "sendMessage",
        "chat_id": chat_id,
        "text": help_text,
        "parse_mode": "Markdown"
    }

async def process_update(payload):
    """Process incoming update and return response"""
    # Check for callback query
    if 'callback_query' in payload:
        data = payload['callback_query'].get('data', '')
        if data == 'help_home_screen':
            return await handle_help_callback(payload)

    # Check for /start command
    if 'message' in payload:
        text = payload['message'].get('text', '')
        if text == '/start' or text.startswith('/start '):
            return await handle_start(payload)

    return None

async def webhook_handler(request):
    """Handle incoming webhook from Telegram"""
    try:
        payload = await request.json()
        print(f"📥 Received update: {json.dumps(payload, indent=2)[:500]}")

        response = await process_update(payload)

        if response:
            # Return response that Telegram will execute
            return web.json_response(response)
        else:
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
    print(f"⚠️  Remember to set webhook manually:")
    print(f"   curl -X POST 'https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook'")
    print(f"   -H 'Content-Type: application/json'")
    print(f"   -d '{{\"url\": \"https://obshak.space/telegram-webhook\"}}'")

    await asyncio.Event().wait()

if __name__ == '__main__':
    asyncio.run(main())