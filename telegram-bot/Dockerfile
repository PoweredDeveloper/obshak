FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY bot_webhook_server.py .
COPY messages.py .

ENV TELEGRAM_BOT_TOKEN=""
ENV MINI_APP_URL=""
ENV WEBHOOK_PATH="/telegram-webhook"
ENV PORT=8080
ENV TELEGRAM_WEBHOOK_SECRET_TOKEN=""

CMD ["python", "bot_webhook_server.py"]