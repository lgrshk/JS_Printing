#!/bin/sh
set -e

APP_MODULE=${APP_MODULE:-app.main:app}
APP_PORT=${APP_PORT:-443}
WORKERS=${GUNICORN_WORKERS:-4}
TIMEOUT=${GUNICORN_TIMEOUT:-120}

if [ "${SSL_DISABLE}" = "1" ]; then
  echo "[start.sh] SSL_DISABLE=1, стартуємо без SSL на порту ${APP_PORT}" >&2
  exec gunicorn --bind "0.0.0.0:${APP_PORT}" \
    --workers "${WORKERS}" \
    --timeout "${TIMEOUT}" \
    "${APP_MODULE}"
fi

if [ -z "${SSL_CERT_PATH}" ] || [ -z "${SSL_KEY_PATH}" ]; then
  echo "[start.sh] Не встановлено SSL_CERT_PATH або SSL_KEY_PATH" >&2
  exit 1
fi

if [ ! -f "${SSL_CERT_PATH}" ]; then
  echo "[start.sh] Сертифікат не знайдено: ${SSL_CERT_PATH}" >&2
  exit 1
fi

if [ ! -f "${SSL_KEY_PATH}" ]; then
  echo "[start.sh] Приватний ключ не знайдено: ${SSL_KEY_PATH}" >&2
  exit 1
fi

echo "[start.sh] Запускаємо gunicorn на порту ${APP_PORT} з SSL"
exec gunicorn --bind "0.0.0.0:${APP_PORT}" \
  --workers "${WORKERS}" \
  --timeout "${TIMEOUT}" \
  --certfile "${SSL_CERT_PATH}" \
  --keyfile "${SSL_KEY_PATH}" \
  "${APP_MODULE}"

