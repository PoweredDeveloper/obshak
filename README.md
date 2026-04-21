# Obshak

Платформа для студентов КГАСУ: расписание, преподаватели, услуги, общение.

On your VDS:

# 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

# 2. Clone or upload your project

```bash
git clone https://github.com/Damirbaytik/obshak.git obshak
cd obshak
```

# 3. Create .env from example

```bash
cp .env.example .env
nano .env # fill in your values
```

# 4. Make sure domain DNS points to your VDS

A record: obshak.online -> your VDS IP

# 5. Start everything

docker compose up -d --build

Required .env values:

- VITE*SUPABASE*\* - your Supabase config
- TELEGRAM_BOT_TOKEN - from @BotFather
- VITE_TELEGRAM_BOT_USERNAME - your bot username
- MINI_APP_URL="https://obshak.online" (already set in example)

Caddy will automatically:

- Obtain SSL certificate from Let's Encrypt
- Redirect HTTP → HTTPS
- Route traffic to your app

Note: Make sure port 80 and 443 are open on your VDS firewall, and DNS is configured before starting (Caddy needs to verify domain ownership).
