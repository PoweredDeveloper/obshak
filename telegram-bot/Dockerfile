FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy bot files
COPY bot.py image.png* ./

# Environment variables
ENV BOT_TOKEN=""
ENV MINI_APP_URL=""

CMD ["python", "bot.py"]