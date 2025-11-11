#!/bin/bash
# Скрипт для автоматичного оновлення SSL сертифікатів через Certbot з DNS challenge

set -e

# Завантажуємо конфігурацію з файлу
CONFIG_FILE="/app/config/config.json"
DUCKDNS_CREDENTIALS="/etc/letsencrypt/duckdns.ini"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Помилка: файл конфігурації не знайдено: $CONFIG_FILE"
    exit 1
fi

if [ ! -f "$DUCKDNS_CREDENTIALS" ]; then
    echo "Помилка: файл credentials DuckDNS не знайдено: $DUCKDNS_CREDENTIALS"
    exit 1
fi

# Отримуємо дані з конфігурації (простий парсинг JSON)
DUCKDNS_DOMAIN=$(grep -o '"duckdns_domain": "[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
CERTBOT_EMAIL=$(grep -o '"certbot_email": "[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)
AUTO_RENEW=$(grep -o '"auto_renew_certs": [^,}]*' "$CONFIG_FILE" | cut -d' ' -f2)

if [ -z "$DUCKDNS_DOMAIN" ] || [ -z "$CERTBOT_EMAIL" ]; then
    echo "Помилка: не вказано duckdns_domain або certbot_email в конфігурації"
    exit 1
fi

if [ "$AUTO_RENEW" != "true" ]; then
    echo "Автоматичне оновлення сертифікатів вимкнено"
    exit 0
fi

echo "Оновлення SSL сертифікатів для домену: $DUCKDNS_DOMAIN (DNS challenge)"

# Оновлюємо сертифікат через certbot з DNS challenge
certbot renew \
    --dns-duckdns \
    --dns-duckdns-credentials "$DUCKDNS_CREDENTIALS" \
    --quiet \
    --no-self-upgrade

echo "Оновлення сертифікатів завершено"

