# Режим технических работ

## Как включить заглушку

### Локально (для тестирования)

1. Открой файл `classmate-connect/.env`
2. Измени строку:
```env
VITE_MAINTENANCE_MODE="true"
```
3. Перезапусти dev сервер: `npm run dev`

### На продакшне (Cloudflare Pages)

1. Зайди в **Cloudflare Dashboard**
2. **Workers & Pages** → выбери проект **obshak**
3. **Settings** → **Environment variables**
4. Добавь переменную:
   - Name: `VITE_MAINTENANCE_MODE`
   - Value: `true`
5. **Redeploy** последний деплой или сделай новый коммит

## Как выключить заглушку

### Локально
Измени в `.env`:
```env
VITE_MAINTENANCE_MODE="false"
```

### На продакшне
1. Cloudflare Dashboard → Settings → Environment variables
2. Измени `VITE_MAINTENANCE_MODE` на `false`
3. Redeploy

## Важно

- Админы (role='admin') видят сайт даже при включенной заглушке
- Обычные пользователи видят только страницу "Технические работы"
- Никакие запросы к БД не выполняются (кроме админов)

## Быстрое включение для деплоя

Перед коммитом в `main`:
```bash
# В файле .env измени на true
VITE_MAINTENANCE_MODE="true"

# Закоммить и запушить
git add .
git commit -m "Enable maintenance mode"
git push origin main
```

Когда закончишь разработку:
```bash
# Измени обратно на false
VITE_MAINTENANCE_MODE="false"

# Закоммить и запушить
git add .
git commit -m "Disable maintenance mode"
git push origin main
```
