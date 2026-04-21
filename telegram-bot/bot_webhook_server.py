"""
Telegram bot with webhook server (for Russia - bypasses API block)
Telegram calls us, we don't call Telegram API
"""
import os
import asyncio
from aiohttp import web
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes

BOT_TOKEN = os.environ.get('BOT_TOKEN')
MINI_APP_URL = os.environ.get('MINI_APP_URL')
WEBHOOK_PATH = os.environ.get('WEBHOOK_PATH', '/telegram-webhook')
PORT = int(os.environ.get('PORT', 8080))

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user

    keyboard = [
        [InlineKeyboardButton(
            text="🎓 Открыть Obshak",
            web_app=WebAppInfo(url=MINI_APP_URL)
        )],
        [InlineKeyboardButton(
            text="📱 Как добавить на главный экран?",
            callback_data="help_home_screen"
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    message = (
        f"👋 Привет, {user.first_name}!\n\n"
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

    await update.message.reply_text(
        message,
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

async def help_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

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

    await query.message.reply_text(
        help_text,
        parse_mode='Markdown'
    )

async def main():
    application = Application.builder().token(BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(help_callback, pattern="help_home_screen"))

    await application.initialize()

    async def webhook_handler(request):
        data = await request.json()
        update = Update.de_json(data, application.bot)
        await application.process_update(update)
        return web.Response(status=200)

    app = web.Application()
    app.router.add_post(WEBHOOK_PATH, webhook_handler)

    runner = web.AppRunner(app)
    await runner.setup()

    site = web.TCPSite(runner, '0.0.0.0', PORT)
    await site.start()

    print(f"🤖 Webhook server running on port {PORT}")
    print(f"📍 Webhook path: {WEBHOOK_PATH}")
    print(f"⏳ Waiting for incoming webhooks from Telegram...")

    await asyncio.Event().wait()

if __name__ == '__main__':
    asyncio.run(main())