# Деплой бота на Cloudflare Workers

## Шаг 1: Установка Wrangler CLI

```bash
npm install -g wrangler
```

## Шаг 2: Авторизация в Cloudflare

```bash
wrangler login
```

## Шаг 3: Добавление переменных окружения

```bash
wrangler secret put BOT_TOKEN
# Введите: 8678954624:AAGQPz2feu3hVA9J3tFJfX5hKSG5SjCrubE

wrangler secret put MINI_APP_URL
# Введите: https://obshak.sahabutdinovdamir4.workers.dev
```

## Шаг 4: Деплой

```bash
cd telegram-bot
wrangler deploy
```

## Шаг 5: Установка webhook

После деплоя откройте в браузере:
```
https://obshak-bot.ваш-username.workers.dev/set-webhook
```

Вы должны увидеть:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

## Готово!

Теперь бот работает на Cloudflare Workers и будет отвечать на сообщения.

## Проверка

Напишите боту `/start` в Telegram - он должен ответить приветственным сообщением.

## Преимущества

- ✅ Бесплатно (100,000 запросов в день)
- ✅ Работает 24/7
- ✅ Быстрый отклик
- ✅ Не нужен VPS

## Отладка

Смотрите логи:
```bash
wrangler tail
```
