#!/usr/bin/env python3
"""
Register Telegram webhook after bot token rotation or server migration.

Run from project root (loads .env):
  python3 telegram-bot/set_webhook.py

Requires outbound HTTPS to api.telegram.org (VPN if blocked).
"""
import asyncio
import os
import sys

import aiohttp
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN') or os.environ.get('BOT_TOKEN')
BASE_URL = (os.environ.get('BASE_URL') or 'https://obshak.space').rstrip('/')
WEBHOOK_PATH = os.environ.get('WEBHOOK_PATH', '/telegram-webhook')
WEBHOOK_SECRET_TOKEN = os.environ.get('TELEGRAM_WEBHOOK_SECRET_TOKEN') or os.environ.get(
    'WEBHOOK_SECRET_TOKEN'
)


async def main() -> int:
    if not BOT_TOKEN:
        print('TELEGRAM_BOT_TOKEN is not set in .env')
        return 1

    webhook_url = f'{BASE_URL}{WEBHOOK_PATH}'
    print(f'Setting webhook: {webhook_url}')

    async with aiohttp.ClientSession() as client:
        async with client.post(
            f'https://api.telegram.org/bot{BOT_TOKEN}/setWebhook',
            json={
                'url': webhook_url,
                'drop_pending_updates': True,
                **({'secret_token': WEBHOOK_SECRET_TOKEN} if WEBHOOK_SECRET_TOKEN else {}),
            },
            timeout=aiohttp.ClientTimeout(total=30),
        ) as resp:
            data = await resp.json()
            if resp.status == 200 and data.get('ok'):
                print('Webhook set successfully.')
                async with client.get(
                    f'https://api.telegram.org/bot{BOT_TOKEN}/getWebhookInfo',
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as info_resp:
                    info = await info_resp.json()
                    print('Webhook info:', info.get('result'))
                return 0

            print('Failed:', data)
            return 1


if __name__ == '__main__':
    raise SystemExit(asyncio.run(main()))
