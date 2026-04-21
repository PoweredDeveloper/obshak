import os
from dotenv import load_dotenv
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, CallbackQueryHandler

# Загружаем переменные из .env
load_dotenv()

# Токен бота и URL Mini App
BOT_TOKEN = os.getenv('BOT_TOKEN')
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
    
    # Создаем inline кнопку с Web App (будет синяя)
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
    
    # Отправляем приветственное сообщение
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
    
    # Отправляем фото с инструкцией
    try:
        with open('image.png', 'rb') as photo:
            await query.message.reply_photo(
                photo=photo,
                caption=help_text,
                parse_mode='Markdown'
            )
    except FileNotFoundError:
        # Если фото не найдено, отправляем просто текст
        await query.message.reply_text(
            help_text,
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
