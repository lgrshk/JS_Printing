FROM python:3.11-slim

# Встановлюємо робочу директорію
WORKDIR /app

# Встановлюємо системні залежності
RUN apt-get update && apt-get install -y \
    gcc \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Копіюємо requirements та встановлюємо Python залежності
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копіюємо код додатку
COPY app/ ./app/
COPY config/ ./config/
COPY start.sh ./start.sh

# Створюємо директорію для логів
RUN mkdir -p /app/logs && chmod +x /app/start.sh

# Встановлюємо змінні оточення
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.main:app

# Відкриваємо порт для Flask (в production буде через gunicorn на 443 з SSL)
EXPOSE 443

# Команда для запуску (gunicorn з SSL)
CMD ["./start.sh"]

