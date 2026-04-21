#!/usr/bin/env python3
"""
Set Telegram webhook - run this ONCE from outside Russia (or with VPN)
"""
import os
import sys
import httpx
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
BASE_URL = os.environ.get('BASE_URL', 'https://obshak.online')
WEBHOOK_PATH = '/telegram-webhook'

if not BOT_TOKEN:
    print("❌ TELEGRAM_BOT_TOKEN not set in .env")
    sys.exit(1)

webhook_url = f"{BASE_URL}{WEBHOOK_PATH}"

async def main():
    async with httpx.AsyncClient() as client:
        # Set webhook
        response = await client.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/setWebhook",
            json={"url": webhook_url},
            timeout=30.0
        )

        if response.status_code == 200:
            result = response.json()
            if result.get('ok'):
                print(f"✅ Webhook set successfully!")
                print(f"📍 URL: {webhook_url}")
            else:
                print(f"❌ Failed: {result}")
        else:
            print(f"❌ HTTP error: {response.status_code}")
            print(response.text)

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())