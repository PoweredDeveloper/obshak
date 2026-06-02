import os
from dotenv import load_dotenv
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, CallbackQueryHandler

from messages import get_bot_copy

# Загружаем переменные из .env
load_dotenv()

# Токен бота и URL Mini App
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN') or os.getenv('BOT_TOKEN')
MINI_APP_URL = os.getenv('MINI_APP_URL')

if not BOT_TOKEN or BOT_TOKEN == 'your_bot_token_here':
    print("❌ Ошибка: Не указан BOT_TOKEN в файле .env")
    print("📝 Получите токен у @BotFather и добавьте в .env файл")
    exit(1)

if not MINI_APP_URL or MINI_APP_URL == 'https://your-app-url.com':
    print("⚠️  Предупреждение: Не указан MINI_APP_URL в файле .env")
    print("📝 Укажите URL вашего Mini App в .env файле")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start"""
    user = update.effective_user
    copy = get_bot_copy(user.first_name if user else "")
    
    # Создаем inline кнопку с Web App (будет синяя)
    keyboard = [
        [InlineKeyboardButton(
            text=copy.open_button_text,
            web_app=WebAppInfo(url=MINI_APP_URL)
        )],
        [InlineKeyboardButton(
            text=copy.help_button_text,
            callback_data=copy.help_callback_data
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # Отправляем приветственное сообщение
    await update.message.reply_text(
        copy.start_message,
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

async def help_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик нажатия на кнопку помощи"""
    query = update.callback_query
    await query.answer()
    copy = get_bot_copy(query.from_user.first_name if query and query.from_user else "")
    
    # Отправляем фото с инструкцией
    try:
        with open('image.png', 'rb') as photo:
            await query.message.reply_photo(
                photo=photo,
                caption=copy.help_message,
                parse_mode='Markdown'
            )
    except FileNotFoundError:
        # Если фото не найдено, отправляем просто текст
        await query.message.reply_text(
            copy.help_message,
            parse_mode='Markdown'
        )

def main():
    """Запуск бота"""
    # Создаем приложение
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Регистрируем обработчики
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(help_callback, pattern="help_home_screen"))
    
    # Запускаем бота
    print("🤖 Бот запущен!")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == '__main__':
    main()
