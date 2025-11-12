# Розгортання Print Server на Linux без Docker

Покрокова інструкція з розгортання Print Server безпосередньо на Linux сервері без використання Docker.

## Опис

Ця інструкція описує процес встановлення та налаштування Print Server безпосередньо на Linux сервері. Це альтернатива Docker розгортанню для тих, хто віддає перевагу нативному встановленню.

## Можливості

- ✅ Прийом JSON запитів з Oracle APEX через HTTPS
- ✅ Відправка ZPL-команд на принтери через TCP/IP
- ✅ Веб-інтерфейс для налаштувань
- ✅ Автоматичне управління SSL сертифікатами (Let'sEncrypt)
- ✅ Інтеграція з DuckDNS для динамічних DNS
- ✅ Автоматичне оновлення SSL сертифікатів через cron
- ✅ Сканування локальної мережі на пошук принтерів
- ✅ Тестовий друк та доступ до налаштувань принтерів

## Вимоги

- Linux сервер (Ubuntu 20.04+ або Debian 11+)
- Python 3.11 або новіша версія
- Root або sudo доступ
- Доступ до інтернету для отримання SSL сертифікатів
- DuckDNS акаунт (опціонально, для динамічного DNS)
- Git (для клонування репозиторію)

---

## 📋 Покрокова інструкція розгортання

### Крок 1: Підготовка системи

#### 1.1. Оновлення системи

```bash
sudo apt update
sudo apt upgrade -y
```

#### 1.2. Встановлення необхідних системних пакетів

```bash
sudo apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    git \
    gcc \
    openssl \
    certbot \
    python3-certbot-dns-duckdns \
    nginx \
    curl
```

#### 1.3. Перевірка версії Python

```bash
python3 --version
```

Очікуваний результат: Python 3.11 або новіша версія

Якщо версія Python застаріла, встановіть новішу версію:

```bash
# Для Ubuntu 22.04+
sudo apt install -y python3.11 python3.11-venv python3.11-dev

# Або для Ubuntu 20.04
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev
```

---

### Крок 2: Створення користувача для додатку

#### 2.1. Створення системного користувача

```bash
sudo useradd -r -s /bin/bash -m -d /opt/print-server printserver
```

#### 2.2. Створення директорій

```bash
sudo mkdir -p /opt/print-server/{app,config,certs,logs,static}
sudo chown -R printserver:printserver /opt/print-server
```

---

### Крок 3: Клонування та встановлення проекту

#### 3.1. Клонування репозиторію

```bash
cd /opt/print-server
sudo -u printserver git clone <URL_ВАШОГО_РЕПОЗИТОРІЮ> .
```

Або якщо у вас вже є локальна копія проекту:

```bash
# Якщо проект знаходиться в JS_Printing/docker-print-server/
sudo cp -r /шлях/до/JS_Printing/docker-print-server/app/* /opt/print-server/app/
sudo cp -r /шлях/до/JS_Printing/docker-print-server/config/* /opt/print-server/config/ 2>/dev/null || true
sudo chown -R printserver:printserver /opt/print-server
```

#### 3.2. Створення віртуального середовища Python

```bash
cd /opt/print-server
sudo -u printserver python3 -m venv venv
sudo -u printserver ./venv/bin/pip install --upgrade pip
```

#### 3.3. Встановлення Python залежностей

**Важливо:** Видаліть пакет `docker` з requirements.txt, оскільки він не потрібен для нативного розгортання.

```bash
cd /opt/print-server
sudo -u printserver ./venv/bin/pip install \
    Flask==3.0.0 \
    Werkzeug==3.0.1 \
    python-dotenv==1.0.0 \
    flask-cors==4.0.0 \
    gunicorn==21.2.0 \
    cryptography==42.0.5
```

Або створіть модифікований requirements.txt без docker:

```bash
cd /opt/print-server
cat > requirements-native.txt << EOF
Flask==3.0.0
Werkzeug==3.0.1
python-dotenv==1.0.0
flask-cors==4.0.0
gunicorn==21.2.0
cryptography==42.0.5
EOF

sudo -u printserver ./venv/bin/pip install -r requirements-native.txt
```

#### 3.4. Перевірка структури проекту

Після клонування переконайтеся, що структура правильна:

```bash
cd /opt/print-server
ls -la

# Має бути:
# - app/ (директорія з кодом додатку)
# - config/ (директорія для конфігурації)
# - requirements.txt (або requirements-native.txt)
```

Якщо структура відрізняється (наприклад, файли знаходяться в піддиректорії `docker-print-server/`):

```bash
cd /opt/print-server
# Перемістіть файли з піддиректорії
sudo -u printserver mv docker-print-server/app/* app/ 2>/dev/null || true
sudo -u printserver mv docker-print-server/config/* config/ 2>/dev/null || true
sudo -u printserver mv docker-print-server/requirements.txt . 2>/dev/null || true
```

#### 3.5. Видалення залежності від Docker

**Важливо:** У файлі `app/main.py` є імпорт модуля `docker`, який використовується для виконання команд в Docker контейнері certbot. Для нативного розгортання цей імпорт потрібно видалити або замінити.

Відредагуйте файл:

```bash
sudo -u printserver nano /opt/print-server/app/main.py
```

Знайдіть рядок:
```python
import docker
```

І закоментуйте або видаліть його:
```python
# import docker  # Не потрібен для нативного розгортання
```

Також знайдіть функцію `ssl_renew()` та закоментуйте код, який використовує Docker API. Або замініть його на прямий виклик certbot через subprocess:

```python
# Замість docker_client.containers.get('docker-print-server-certbot')
# Використовуйте:
subprocess.run(['certbot', 'certonly', ...], check=True)
```

Детальні інструкції дивіться в розділі "Розв'язання проблем".

---

### Крок 4: Налаштування DuckDNS

#### 4.1. Створення файлу конфігурації DuckDNS

```bash
sudo mkdir -p /etc/letsencrypt
sudo nano /etc/letsencrypt/duckdns.ini
```

Вставте наступний вміст (замініть `your-duckdns-api-token-here` на ваш реальний токен):

```ini
dns_duckdns_token = ваш-token-тут
```

Збережіть файл (Ctrl+O, Enter, Ctrl+X)

#### 4.2. Встановлення прав доступу

```bash
sudo chmod 600 /etc/letsencrypt/duckdns.ini
```

#### 4.3. Отримання DuckDNS API token

1. Зареєструйтеся на [duckdns.org](https://www.duckdns.org/)
2. Створіть домен (наприклад: `myprinter.duckdns.org`)
3. Скопіюйте API token зі сторінки вашого домену
4. Вставте токен в файл `/etc/letsencrypt/duckdns.ini`

---

### Крок 5: Отримання SSL сертифікату

#### 5.1. Отримання SSL сертифікату через DNS challenge

```bash
sudo certbot certonly \
    --authenticator dns-duckdns \
    --dns-duckdns-credentials /etc/letsencrypt/duckdns.ini \
    -d ваш-домен.duckdns.org \
    --email ваш-email@example.com \
    --agree-tos \
    --non-interactive \
    --dns-duckdns-propagation-seconds 120
```

**Замініть:**
- `ваш-домен.duckdns.org` на ваш реальний домен
- `ваш-email@example.com` на ваш email

#### 5.2. Перевірка сертифікату

```bash
sudo ls -la /etc/letsencrypt/live/ваш-домен.duckdns.org/
```

Ви повинні побачити файли:
- `fullchain.pem` - повний ланцюжок сертифікатів
- `privkey.pem` - приватний ключ

#### 5.3. Встановлення прав доступу

```bash
sudo chmod 644 /etc/letsencrypt/live/ваш-домен.duckdns.org/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/ваш-домен.duckdns.org/privkey.pem
sudo chown -R printserver:printserver /etc/letsencrypt/live/ваш-домен.duckdns.org/
```

---

### Крок 6: Налаштування конфігурації додатку

#### 6.1. Створення файлу конфігурації

```bash
sudo -u printserver nano /opt/print-server/config/config.json
```

Вставте наступний вміст:

```json
{
  "duckdns_token": "ваш-token-тут",
  "duckdns_domain": "ваш-домен.duckdns.org",
  "certbot_email": "ваш-email@example.com",
  "auto_renew_certs": true
}
```

Збережіть файл (Ctrl+O, Enter, Ctrl+X)

#### 6.2. Створення змінних оточення

```bash
sudo -u printserver nano /opt/print-server/.env
```

Вставте наступний вміст:

```bash
CONFIG_PATH=/opt/print-server/config/config.json
FLASK_ENV=production
APP_PORT=443
SSL_CERT_PATH=/etc/letsencrypt/live/ваш-домен.duckdns.org/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/ваш-домен.duckdns.org/privkey.pem
PYTHONUNBUFFERED=1
FLASK_APP=app.main:app
```

Замініть `ваш-домен.duckdns.org` на ваш реальний домен.

---

### Крок 7: Створення systemd service

#### 7.1. Створення файлу сервісу

```bash
sudo nano /etc/systemd/system/print-server.service
```

Вставте наступний вміст (замініть `ваш-домен.duckdns.org` на ваш домен):

```ini
[Unit]
Description=Print Server
After=network.target

[Service]
Type=notify
User=printserver
Group=printserver
WorkingDirectory=/opt/print-server
Environment="PATH=/opt/print-server/venv/bin:/usr/local/bin:/usr/bin:/bin"
EnvironmentFile=/opt/print-server/.env
ExecStart=/opt/print-server/venv/bin/gunicorn \
    --bind 0.0.0.0:443 \
    --workers 4 \
    --timeout 120 \
    --certfile /etc/letsencrypt/live/ваш-домен.duckdns.org/fullchain.pem \
    --keyfile /etc/letsencrypt/live/ваш-домен.duckdns.org/privkey.pem \
    app.main:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Збережіть файл (Ctrl+O, Enter, Ctrl+X)

#### 7.2. Перезавантаження systemd та запуск сервісу

```bash
sudo systemctl daemon-reload
sudo systemctl enable print-server.service
sudo systemctl start print-server.service
```

#### 7.3. Перевірка статусу

```bash
sudo systemctl status print-server.service
```

Очікуваний результат: `active (running)`

#### 7.4. Перегляд логів

```bash
# Логи сервісу
sudo journalctl -u print-server.service -f

# Або останні 100 рядків
sudo journalctl -u print-server.service -n 100
```

---

### Крок 8: Налаштування автоматичного оновлення SSL сертифікатів

#### 8.1. Створення скрипту оновлення

```bash
sudo nano /opt/print-server/certbot-renew.sh
```

Вставте наступний вміст:

```bash
#!/bin/bash
# Скрипт для автоматичного оновлення SSL сертифікатів через Certbot з DNS challenge

set -e

# Завантажуємо конфігурацію з файлу
CONFIG_FILE="/opt/print-server/config/config.json"
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

# Перезапускаємо сервіс після оновлення сертифікату
if [ $? -eq 0 ]; then
    echo "Перезапуск сервісу print-server..."
    systemctl restart print-server.service
fi

echo "Оновлення сертифікатів завершено"
```

Збережіть файл (Ctrl+O, Enter, Ctrl+X)

#### 8.2. Встановлення прав виконання

```bash
sudo chmod +x /opt/print-server/certbot-renew.sh
sudo chown printserver:printserver /opt/print-server/certbot-renew.sh
```

#### 8.3. Налаштування cron для автоматичного оновлення

```bash
sudo crontab -e
```

Додайте наступний рядок (оновлення кожні 12 годин):

```cron
0 */12 * * * /opt/print-server/certbot-renew.sh >> /opt/print-server/logs/certbot-renew.log 2>&1
```

Або для щоденного оновлення о 3:00 ранку:

```cron
0 3 * * * /opt/print-server/certbot-renew.sh >> /opt/print-server/logs/certbot-renew.log 2>&1
```

---

### Крок 9: Налаштування файрволу

#### 9.1. Перевірка статусу UFW

```bash
sudo ufw status
```

#### 9.2. Дозвіл порту 443 (HTTPS)

```bash
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp  # Для Let's Encrypt challenge (якщо потрібно)
sudo ufw reload
```

#### 9.3. Перевірка правил

```bash
sudo ufw status verbose
```

---

### Крок 10: Налаштування через веб-інтерфейс

#### 10.1. Відкрийте браузер

```
https://ваш-домен.duckdns.org
```

#### 10.2. Налаштуйте конфігурацію

- Введіть ваш DuckDNS API Token
- Введіть ваш DuckDNS Domain
- Введіть Email для Certbot
- Натисніть "Зберегти налаштування"

---

## ✅ Перевірка роботи

### 1. Перевірка статусу сервісу

```bash
sudo systemctl status print-server.service
```

### 2. Перевірка логів

```bash
sudo journalctl -u print-server.service -n 50
```

### 3. Перевірка веб-інтерфейсу

- Відкрийте `https://ваш-домен.duckdns.org`
- Перевірте статус SSL сертифікату
- Перевірте статус сервісу

### 4. Перевірка API

```bash
curl -k https://ваш-домен.duckdns.org/api/health
```

Очікуваний результат:
```json
{
  "status": "ok",
  "service": "docker-print-server"
}
```

---

## 🔧 Управління сервісом

### Запуск

```bash
sudo systemctl start print-server.service
```

### Зупинка

```bash
sudo systemctl stop print-server.service
```

### Перезапуск

```bash
sudo systemctl restart print-server.service
```

### Перегляд логів

```bash
# В реальному часі
sudo journalctl -u print-server.service -f

# Останні 100 рядків
sudo journalctl -u print-server.service -n 100

# З певного часу
sudo journalctl -u print-server.service --since "1 hour ago"
```

### Перевірка статусу

```bash
sudo systemctl status print-server.service
```

---

## 🔄 Оновлення SSL сертифікату вручну

### Оновлення через certbot

```bash
sudo certbot renew \
    --dns-duckdns \
    --dns-duckdns-credentials /etc/letsencrypt/duckdns.ini \
    --quiet \
    --no-self-upgrade
```

### Перезапуск сервісу після оновлення

```bash
sudo systemctl restart print-server.service
```

### Або використання скрипту

```bash
sudo /opt/print-server/certbot-renew.sh
```

---

## 📝 Використання з Oracle APEX

Інструкції по інтеграції з Oracle APEX ідентичні до Docker версії. Дивіться розділ "Використання з Oracle APEX" в основному README.md.

Основні моменти:

1. **Створіть Application Items на сторінці 0:**
   - `P0_PRINT_SERVER_URL` - Повний URL сервера друку (наприклад: `https://ваш-домен.duckdns.org/api/print`)
   - `P0_PRINT_JS_ZPL` - JSON рядок з даними для друку

2. **Додайте JavaScript файл в Application:**
   - Shared Components → User Interface → JavaScript
   - File URLs: `#WORKSPACE_FILES#JS/apex-print-service#MIN#.js`

3. **Створіть Dynamic Action на сторінці 0**

Детальні інструкції дивіться в `README.md` та `examples/apex-usage-example.md`.

---

## 🛠️ Розв'язання проблем

### Помилка підключення до принтера

1. Перевірте, що принтер доступний в локальній мережі
2. Перевірте IP адресу та порт принтера
3. Переконайтеся, що порт 9100 не заблокований файрволом
4. Перевірте логи: `sudo journalctl -u print-server.service -n 50`

### Помилка SSL сертифікату

1. Перевірте, що домен правильно налаштований в DuckDNS
2. Перевірте, що DuckDNS API token правильний в `/etc/letsencrypt/duckdns.ini`
3. Перевірте права доступу до сертифікатів:
   ```bash
   sudo ls -la /etc/letsencrypt/live/ваш-домен.duckdns.org/
   ```
4. Перевірте логи certbot: `sudo tail -f /var/log/letsencrypt/letsencrypt.log`

### Помилка підключення з Oracle APEX

1. Перевірте, що використовується HTTPS (не HTTP)
2. Перевірте URL сервера в JavaScript коді
3. Перевірте CORS налаштування в `app/main.py`
4. Перевірте логи сервісу: `sudo journalctl -u print-server.service -n 50`

### Сервіс не запускається

1. Перевірте статус: `sudo systemctl status print-server.service`
2. Перевірте логи: `sudo journalctl -u print-server.service -n 100`
3. Перевірте права доступу до файлів:
   ```bash
   sudo ls -la /opt/print-server/
   sudo ls -la /etc/letsencrypt/live/ваш-домен.duckdns.org/
   ```
4. Перевірте, що Python віртуальне середовище правильно налаштоване:
   ```bash
   sudo -u printserver /opt/print-server/venv/bin/python --version
   ```

### Помилка з правами доступу

Якщо виникають проблеми з правами доступу:

```bash
# Встановіть правильні права
sudo chown -R printserver:printserver /opt/print-server
sudo chmod 644 /etc/letsencrypt/live/ваш-домен.duckdns.org/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/ваш-домен.duckdns.org/privkey.pem
sudo chown printserver:printserver /etc/letsencrypt/live/ваш-домен.duckdns.org/privkey.pem
```

### Модифікація функції ssl_renew для нативного розгортання

Якщо ви хочете використовувати функцію `/api/ssl-renew` через веб-інтерфейс, потрібно модифікувати функцію `ssl_renew()` в `app/main.py`.

Відредагуйте файл:

```bash
sudo -u printserver nano /opt/print-server/app/main.py
```

Знайдіть функцію `ssl_renew()` та замініть код, який використовує Docker API, на прямий виклик certbot:

```python
@app.route('/api/ssl-renew', methods=['POST'])
def ssl_renew():
    """Перевипуск SSL сертифікату для вказаного домену"""
    try:
        # Завантажуємо конфігурацію
        config = load_config()
        domain = config.get('duckdns_domain', '')
        email = config.get('certbot_email', '')
        token = config.get('duckdns_token', '')
        
        if not domain:
            return jsonify({
                "status": "error",
                "message": "Доменне ім'я не вказано в конфігурації"
            }), 400
        
        if not email:
            return jsonify({
                "status": "error",
                "message": "Email адреса не вказана в конфігурації"
            }), 400
        
        logger.info(f"Початок перевипуску SSL сертифікату для домену: {domain}")
        
        # Виконуємо команду certbot напряму
        certbot_cmd = [
            'certbot', 'certonly',
            '--authenticator', 'dns-duckdns',
            '--dns-duckdns-credentials', '/etc/letsencrypt/duckdns.ini',
            '-d', domain,
            '--email', email,
            '--agree-tos',
            '--non-interactive',
            '--force-renewal',
            '--dns-duckdns-propagation-seconds', '120'
        ]
        
        result = subprocess.run(
            certbot_cmd,
            capture_output=True,
            text=True,
            check=False
        )
        
        if result.returncode == 0:
            logger.info(f"Сертифікат успішно перевипущено для домену: {domain}")
            
            # Перезапускаємо сервіс для завантаження нового сертифікату
            try:
                subprocess.run(['systemctl', 'restart', 'print-server.service'], check=True)
                logger.info("Сервіс print-server перезапущено")
            except Exception as restart_error:
                logger.warning(f"Не вдалося перезапустити сервіс: {str(restart_error)}")
            
            return jsonify({
                "status": "success",
                "message": f"Сертифікат успішно перевипущено для домену {domain}",
                "output": result.stdout
            }), 200
        else:
            error_msg = result.stderr or result.stdout or "Невідома помилка"
            logger.error(f"Помилка перевипуску сертифікату: {error_msg}")
            return jsonify({
                "status": "error",
                "message": f"Помилка перевипуску сертифікату: {error_msg}",
                "output": result.stdout,
                "error": result.stderr
            }), 500
            
    except subprocess.CalledProcessError as e:
        logger.error(f"Помилка виконання команди certbot: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Помилка виконання команди: {str(e)}"
        }), 500
    except Exception as e:
        logger.error(f"Помилка перевипуску SSL сертифікату: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500
```

**Важливо:** Переконайтеся, що користувач `printserver` має права на виконання команд `certbot` та `systemctl`. Можливо, знадобиться налаштувати sudo без пароля для цих команд або додати користувача до відповідних груп.

---

## 🔒 Безпека

### Рекомендації

- ✅ Сервер працює тільки через HTTPS
- ✅ SSL сертифікати автоматично оновлюються
- ✅ Конфігурація зберігається локально
- ✅ Використовується системний користувач без root прав
- ✅ Файрвол налаштований для дозволу тільки необхідних портів

### Додаткові заходи безпеки

1. **Регулярні оновлення системи:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Налаштування fail2ban** (опціонально):
   ```bash
   sudo apt install -y fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

3. **Регулярні резервні копії конфігурації:**
   ```bash
   sudo tar -czf /backup/print-server-config-$(date +%Y%m%d).tar.gz \
       /opt/print-server/config/ \
       /etc/letsencrypt/duckdns.ini
   ```

---

## 📊 Структура директорій

Після встановлення структура буде такою:

```
/opt/print-server/
├── app/                    # Код додатку
│   ├── __init__.py
│   ├── main.py
│   ├── printer.py
│   ├── config.py
│   ├── scan_data.py
│   └── static/             # Статичні файли веб-інтерфейсу
├── config/                 # Конфігурація
│   ├── config.json
│   └── scan_data.json
├── certs/                 # SSL сертифікати (символічні посилання)
├── logs/                  # Логи додатку
├── venv/                  # Python віртуальне середовище
├── certbot-renew.sh       # Скрипт оновлення сертифікатів
└── .env                   # Змінні оточення

/etc/letsencrypt/
├── live/
│   └── ваш-домен.duckdns.org/
│       ├── fullchain.pem
│       └── privkey.pem
└── duckdns.ini            # Credentials для DuckDNS
```

---

## 🔄 Оновлення додатку

### Оновлення коду

```bash
cd /opt/print-server
sudo -u printserver git pull

# Оновлення Python залежностей (якщо змінилися)
sudo -u printserver ./venv/bin/pip install -r requirements-native.txt

# Перезапуск сервісу
sudo systemctl restart print-server.service
```

---

## 📝 Примітки

- **Порт forwarding НЕ потрібен** - використовується DNS challenge через DuckDNS API
- Сертифікати автоматично оновлюються через cron (кожні 12 годин або щодня)
- Всі дані зберігаються локально в директорії `/opt/print-server/config/`
- Сервіс автоматично запускається при завантаженні системи
- Логи зберігаються в systemd journal та можуть бути переглянуті через `journalctl`

---

## Порівняння з Docker версією

| Аспект | Docker версія | Нативна Linux версія |
|--------|---------------|----------------------|
| **Складність встановлення** | ⭐⭐ Простіше | ⭐⭐⭐ Складніше |
| **Ізоляція** | ✅ Повна | ⚠️ Залежить від системи |
| **Переносимість** | ✅ Висока | ⚠️ Залежить від ОС |
| **Продуктивність** | ⭐⭐⭐ Добре | ⭐⭐⭐⭐ Краще |
| **Керування залежностями** | ✅ Автоматичне | ⚠️ Вручну |
| **Оновлення** | ✅ Простіше | ⚠️ Складніше |
| **Рекомендація** | Для більшості користувачів | Для досвідчених адміністраторів |

---

## Підтримка

Для питань та проблем створюйте issues в репозиторії проекту.

---

## Ліцензія

MIT License

