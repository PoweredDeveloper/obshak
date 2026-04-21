# Telegram Bot для расписания КГАСУ

Простой бот с кнопкой для открытия Mini App.

## Установка

1. Установите зависимости:
```bash
pip install -r requirements.txt
```

2. Создайте файл `.env` и добавьте токен бота:
```bash
cp .env.example .env
```

3. Получите токен бота у [@BotFather](https://t.me/BotFather)

4. Укажите токен и URL Mini App в `.env`:
```
BOT_TOKEN=your_bot_token_here
MINI_APP_URL=https://your-app-url.com
```

## Запуск

```bash
python bot.py
```

## Настройка Mini App в BotFather

1. Отправьте `/mybots` в [@BotFather](https://t.me/BotFather)
2. Выберите вашего бота
3. Нажмите "Bot Settings" → "Menu Button"
4. Выберите "Configure menu button"
5. Введите URL вашего Mini App
6. Введите текст кнопки (например: "Открыть расписание")

## Функционал

- `/start` - приветственное сообщение с кнопкой для открытия Mini App
- Синяя кнопка "📅 Открыть расписание" открывает Mini App
