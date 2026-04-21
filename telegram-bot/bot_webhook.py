"""
Telegram бот для Cloudflare Workers (webhook версия)
"""
import json
import os
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes

# Переменные окружения
BOT_TOKEN = os.environ.get('BOT_TOKEN')
MINI_APP_URL = os.environ.get('MINI_APP_URL')
WEBHOOK_URL = os.environ.get('WEBHOOK_URL')  # URL вашего Cloudflare Worker

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start"""
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
    """Обработчик нажатия на кнопку помощи"""
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

# Создаем приложение
application = Application.builder().token(BOT_TOKEN).build()
application.add_handler(CommandHandler("start", start))
application.add_handler(CallbackQueryHandler(help_callback, pattern="help_home_screen"))

async def webhook_handler(request):
    """Обработчик webhook запросов от Telegram"""
    try:
        # Получаем данные от Telegram
        body = await request.json()
        
        # Создаем Update объект
        update = Update.de_json(body, application.bot)
        
        # Обрабатываем update
        await application.process_update(update)
        
        return {
            'statusCode': 200,
            'body': json.dumps({'ok': True})
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

async def set_webhook():
    """Устанавливает webhook URL"""
    webhook_url = f"{WEBHOOK_URL}/webhook"
    await application.bot.set_webhook(webhook_url)
    print(f"✅ Webhook установлен: {webhook_url}")
