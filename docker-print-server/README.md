# Docker Print Server

Локальний веб-сервер для друку ZPL-етикеток через TCP/IP з Oracle APEX додатків.

## Опис

Docker Print Server - це локальний Docker-інстанс, який приймає JSON запити з Oracle APEX та відправляє ZPL-команди на принтери етикеток через TCP/IP в локальній мережі. Сервер має веб-інтерфейс для налаштувань та автоматичне управління SSL сертифікатами через Let'sEncrypt.

## Можливості

- ✅ Прийом JSON запитів з Oracle APEX через HTTPS
- ✅ Відправка ZPL-команд на принтери через TCP/IP
- ✅ Веб-інтерфейс для налаштувань
- ✅ Автоматичне управління SSL сертифікатами (Let'sEncrypt)
- ✅ Інтеграція з DuckDNS для динамічних DNS
- ✅ Автоматичне оновлення SSL сертифікатів
- ✅ Сканування локальної мережі на пошук принтерів
- ✅ Тестовий друк та доступ до налаштувань принтерів
- ✅ Перевипуск SSL сертифікатів через веб-інтерфейс

## Вимоги

- Docker 20.10+ та Docker Compose 2.0+
- Доступ до інтернету для отримання SSL сертифікатів
- DuckDNS акаунт (опціонально, для динамічного DNS)
- Git (для клонування репозиторію)

---

## 📋 Покрокова інструкція розгортання

### 🍎 macOS

#### Крок 1: Встановлення Docker Desktop

1. **Завантажте Docker Desktop для Mac:**
   - Відкрийте [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
   - Натисніть "Download for Mac"
   - Виберіть версію для вашого процесора:
     - **Apple Silicon (M1/M2/M3)**: завантажте версію для Apple Silicon
     - **Intel**: завантажте версію для Intel

2. **Встановіть Docker Desktop:**
   - Відкрийте завантажений файл `.dmg`
   - Перетягніть Docker іконку в папку Applications
   - Запустіть Docker Desktop з Applications
   - Дотримуйтесь інструкцій установки
   - Перезапустіть Mac, якщо потрібно

3. **Перевірте встановлення:**
   ```bash
   docker --version
   docker compose version
   ```
   Очікуваний результат: версії Docker та Docker Compose

#### Крок 2: Клонування проекту

1. **Відкрийте Terminal** (Command + Space, введіть "Terminal")

2. **Перейдіть у бажану директорію та клонуйте проект:**
   ```bash
   cd ~/Desktop  # або інша бажана директорія
   git clone <URL_ВАШОГО_РЕПОЗИТОРІЮ> docker-print-server
   cd docker-print-server
   ```
   
   Або якщо у вас немає Git, завантажте проект як ZIP архів та розпакуйте його.

#### Крок 3: Налаштування DuckDNS

1. **Створіть файл конфігурації DuckDNS:**
   ```bash
   cp certbot/duckdns.ini.example certbot/duckdns.ini
   ```

2. **Відредагуйте файл `certbot/duckdns.ini`:**
   ```bash
   nano certbot/duckdns.ini
   # або відкрийте в TextEdit:
   open -a TextEdit certbot/duckdns.ini
   ```
   
   Замініть `your-duckdns-api-token-here` на ваш реальний DuckDNS API token:
   ```
   dns_duckdns_token = ваш-token-тут
   ```

3. **Отримайте DuckDNS API token:**
   - Зареєструйтеся на [duckdns.org](https://www.duckdns.org/)
   - Створіть домен (наприклад: `myprinter.duckdns.org`)
   - Скопіюйте API token зі сторінки вашого домену

#### Крок 4: Запуск проекту

1. **Запустіть контейнери:**
   ```bash
   docker compose up -d
   ```

2. **Перевірте статус:**
   ```bash
   docker compose ps
   ```
   Всі контейнери (`app` та `certbot`) повинні бути в статусі "Up"

#### Крок 6: Отримання SSL сертифікату

1. **Отримайте SSL сертифікат через DNS challenge:**
   ```bash
   docker compose exec certbot certbot certonly \
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

2. **Оновіть змінні оточення в `docker-compose.yml`:**
   Відкрийте `docker-compose.yml` та замініть `roshkahome.duckdns.org` на ваш домен у рядках 16-17:
   ```yaml
   - SSL_CERT_PATH=/app/certbot/certs/live/ваш-домен.duckdns.org/fullchain.pem
   - SSL_KEY_PATH=/app/certbot/certs/live/ваш-домен.duckdns.org/privkey.pem
   ```

3. **Перезапустіть контейнери:**
   ```bash
   docker compose down
   docker compose up -d
   ```

#### Крок 6: Налаштування через веб-інтерфіейс

1. **Відкрийте браузер:**
   ```
   https://ваш-домен.duckdns.org
   ```

2. **Налаштуйте конфігурацію:**
   - Введіть ваш DuckDNS API Token
   - Введіть ваш DuckDNS Domain
   - Введіть Email для Certbot
   - Натисніть "Зберегти налаштування"

---

### 🪟 Windows 11

#### Крок 1: Встановлення Docker Desktop

1. **Завантажте Docker Desktop для Windows:**
   - Відкрийте [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
   - Натисніть "Download for Windows"
   - Завантажте файл `Docker Desktop Installer.exe`

2. **Встановіть Docker Desktop:**
   - Запустіть завантажений файл `Docker Desktop Installer.exe`
   - Дотримуйтесь інструкцій майстра встановлення
   - **Увімкніть WSL 2**, якщо система запропонує (рекомендовано)
   - Перезапустіть комп'ютер, якщо потрібно

3. **Запустіть Docker Desktop:**
   - Знайдіть Docker Desktop в меню Пуск
   - Запустіть його та дочекайтеся повного завантаження
   - Іконка Docker з'явиться в системному треї

4. **Перевірте встановлення:**
   - Відкрийте **PowerShell** або **Command Prompt**
   - Виконайте команди:
   ```powershell
   docker --version
   docker compose version
   ```
   Очікуваний результат: версії Docker та Docker Compose

#### Крок 2: Клонування проекту

1. **Відкрийте PowerShell або Command Prompt**

2. **Встановіть Git (якщо ще не встановлено):**
   - Завантажте з [https://git-scm.com/download/win](https://git-scm.com/download/win)
   - Встановіть з налаштуваннями за замовчуванням

3. **Клонуйте проект:**
   ```powershell
   cd C:\Users\%USERNAME%\Desktop
   git clone <URL_ВАШОГО_РЕПОЗИТОРІЮ> docker-print-server
   cd docker-print-server
   ```
   
   Або завантажте проект як ZIP архів та розпакуйте його.

#### Крок 3: Налаштування DuckDNS

1. **Створіть файл конфігурації DuckDNS:**
   ```powershell
   Copy-Item certbot\duckdns.ini.example certbot\duckdns.ini
   ```

2. **Відредагуйте файл `certbot\duckdns.ini`:**
   ```powershell
   notepad certbot\duckdns.ini
   ```
   
   Замініть `your-duckdns-api-token-here` на ваш реальний DuckDNS API token:
   ```
   dns_duckdns_token = ваш-token-тут
   ```

3. **Отримайте DuckDNS API token:**
   - Зареєструйтеся на [duckdns.org](https://www.duckdns.org/)
   - Створіть домен (наприклад: `myprinter.duckdns.org`)
   - Скопіюйте API token зі сторінки вашого домену

#### Крок 4: Запуск проекту

1. **Відкрийте PowerShell в директорії проекту:**
   ```powershell
   cd C:\Users\%USERNAME%\Desktop\docker-print-server
   ```

2. **Запустіть контейнери:**
   ```powershell
   docker compose up -d
   ```

3. **Перевірте статус:**
   ```powershell
   docker compose ps
   ```
   Всі контейнери (`app` та `certbot`) повинні бути в статусі "Up"

#### Крок 5: Отримання SSL сертифікату

1. **Отримайте SSL сертифікат через DNS challenge:**
   ```powershell
   docker compose exec certbot certbot certonly `
     --authenticator dns-duckdns `
     --dns-duckdns-credentials /etc/letsencrypt/duckdns.ini `
     -d ваш-домен.duckdns.org `
     --email ваш-email@example.com `
     --agree-tos `
     --non-interactive `
     --dns-duckdns-propagation-seconds 120
   ```
   
   **Замініть:**
   - `ваш-домен.duckdns.org` на ваш реальний домен
   - `ваш-email@example.com` на ваш email

2. **Оновіть змінні оточення в `docker-compose.yml`:**
   Відкрийте `docker-compose.yml` в Notepad або іншому редакторі та замініть `roshkahome.duckdns.org` на ваш домен у рядках 16-17:
   ```yaml
   - SSL_CERT_PATH=/app/certbot/certs/live/ваш-домен.duckdns.org/fullchain.pem
   - SSL_KEY_PATH=/app/certbot/certs/live/ваш-домен.duckdns.org/privkey.pem
   ```

3. **Перезапустіть контейнери:**
   ```powershell
   docker compose down
   docker compose up -d
   ```

#### Крок 6: Налаштування через веб-інтерфейс

1. **Відкрийте браузер:**
   ```
   https://ваш-домен.duckdns.org
   ```

2. **Налаштуйте конфігурацію:**
   - Введіть ваш DuckDNS API Token
   - Введіть ваш DuckDNS Domain
   - Введіть Email для Certbot
   - Натисніть "Зберегти налаштування"

---

### 🐧 Linux (Ubuntu)

#### Крок 1: Встановлення Docker та Docker Compose

1. **Оновіть систему:**
   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

2. **Встановіть необхідні пакети:**
   ```bash
   sudo apt install -y ca-certificates curl gnupg lsb-release
   ```

3. **Додайте офіційний GPG ключ Docker:**
   ```bash
   sudo mkdir -p /etc/apt/keyrings
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
   ```

4. **Додайте репозиторій Docker:**
   ```bash
   echo \
     "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
     $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   ```

5. **Встановіть Docker та Docker Compose:**
   ```bash
   sudo apt update
   sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```

6. **Додайте вашого користувача до групи docker (щоб не використовувати sudo):**
   ```bash
   sudo usermod -aG docker $USER
   ```
   **Важливо:** Вийдіть та увійдіть знову в систему, щоб зміни набули чинності.

7. **Перевірте встановлення:**
   ```bash
   docker --version
   docker compose version
   ```
   Очікуваний результат: версії Docker та Docker Compose

#### Крок 2: Клонування проекту

1. **Встановіть Git (якщо ще не встановлено):**
   ```bash
   sudo apt install -y git
   ```

2. **Клонуйте проект:**
   ```bash
   cd ~
   git clone <URL_ВАШОГО_РЕПОЗИТОРІЮ> docker-print-server
   cd docker-print-server
   ```
   
   Або завантажте проект як ZIP архів та розпакуйте його:
   ```bash
   unzip docker-print-server.zip
   cd docker-print-server
   ```

#### Крок 3: Налаштування DuckDNS

1. **Створіть файл конфігурації DuckDNS:**
   ```bash
   cp certbot/duckdns.ini.example certbot/duckdns.ini
   ```

2. **Відредагуйте файл `certbot/duckdns.ini`:**
   ```bash
   nano certbot/duckdns.ini
   # або використайте інший редактор:
   # gedit certbot/duckdns.ini
   # vim certbot/duckdns.ini
   ```
   
   Замініть `your-duckdns-api-token-here` на ваш реальний DuckDNS API token:
   ```
   dns_duckdns_token = ваш-token-тут
   ```
   
   Збережіть файл (в nano: Ctrl+O, Enter, Ctrl+X)

3. **Отримайте DuckDNS API token:**
   - Зареєструйтеся на [duckdns.org](https://www.duckdns.org/)
   - Створіть домен (наприклад: `myprinter.duckdns.org`)
   - Скопіюйте API token зі сторінки вашого домену

#### Крок 4: Запуск проекту

1. **Запустіть контейнери:**
   ```bash
   docker compose up -d
   ```

2. **Перевірте статус:**
   ```bash
   docker compose ps
   ```
   Всі контейнери (`app` та `certbot`) повинні бути в статусі "Up"

#### Крок 5: Отримання SSL сертифікату

1. **Отримайте SSL сертифікат через DNS challenge:**
   ```bash
   docker compose exec certbot certbot certonly \
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

2. **Оновіть змінні оточення в `docker-compose.yml`:**
   Відкрийте `docker-compose.yml` та замініть `roshkahome.duckdns.org` на ваш домен у рядках 16-17:
   ```yaml
   - SSL_CERT_PATH=/app/certbot/certs/live/ваш-домен.duckdns.org/fullchain.pem
   - SSL_KEY_PATH=/app/certbot/certs/live/ваш-домен.duckdns.org/privkey.pem
   ```
   
   Збережіть файл (Ctrl+O, Enter, Ctrl+X)

3. **Перезапустіть контейнери:**
   ```bash
   docker compose down
   docker compose up -d
   ```

#### Крок 6: Налаштування через веб-інтерфейс

1. **Відкрийте браузер:**
   ```
   https://ваш-домен.duckdns.org
   ```

2. **Налаштуйте конфігурацію:**
   - Введіть ваш DuckDNS API Token
   - Введіть ваш DuckDNS Domain
   - Введіть Email для Certbot
   - Натисніть "Зберегти налаштування"

---

## 🔧 Додаткові налаштування

### Налаштування файрволу

#### macOS:
```bash
# Перевірте статус файрволу
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Дозвольте Docker (якщо потрібно)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /Applications/Docker.app
```

#### Windows 11:
- Відкрийте "Брандмауэр Захисту Windows"
- Натисніть "Дозволити програму через брандмауэр"
- Переконайтеся, що Docker Desktop дозволено

#### Ubuntu:
```bash
# Перевірте статус UFW
sudo ufw status

# Дозвольте порт 443 (якщо потрібно)
sudo ufw allow 443/tcp
```

#### macOS:
Docker Desktop автоматично запускається при завантаженні, якщо увімкнено в налаштуваннях.

#### Windows 11:
Docker Desktop автоматично запускається при завантаженні, якщо увімкнено в налаштуваннях.

#### Ubuntu:
Створіть systemd service для автозапуску:

```bash
sudo nano /etc/systemd/system/docker-print-server.service
```

Вставте наступний вміст (замініть `/path/to/docker-print-server` на реальний шлях):
```ini
[Unit]
Description=Docker Print Server
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/path/to/docker-print-server
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
User=ваш-користувач

[Install]
WantedBy=multi-user.target
```

Активуйте сервіс:
```bash
sudo systemctl daemon-reload
sudo systemctl enable docker-print-server.service
sudo systemctl start docker-print-server.service
```

---

## ✅ Перевірка роботи

1. **Перевірте статус контейнерів:**
   ```bash
   docker compose ps
   ```

2. **Перевірте логи:**
   ```bash
   docker compose logs app
   docker compose logs certbot
   ```

3. **Перевірте веб-інтерфейс:**
   - Відкрийте `https://ваш-домен.duckdns.org`
   - Перевірте статус SSL сертифікату
   - Перевірте статус сервісу

4. **Перевірте API:**
   ```bash
   curl -k https://ваш-домен.duckdns.org/api/health
   ```

---

## 🚀 Швидкий старт (для всіх ОС)

Якщо ви вже маєте встановлений Docker та Docker Compose:

```bash
# 1. Клонуйте або завантажте проект
cd docker-print-server

# 2. Налаштуйте DuckDNS
cp certbot/duckdns.ini.example certbot/duckdns.ini
# Відредагуйте certbot/duckdns.ini та вставте ваш API token

# 3. Запустіть контейнери
docker compose up -d

# 4. Отримайте SSL сертифікат (замініть домен та email)
docker compose exec certbot certbot certonly \
  --authenticator dns-duckdns \
  --dns-duckdns-credentials /etc/letsencrypt/duckdns.ini \
  -d ваш-домен.duckdns.org \
  --email ваш-email@example.com \
  --agree-tos \
  --non-interactive \
  --dns-duckdns-propagation-seconds 120

# 5. Оновіть docker-compose.yml з вашим доменом
# 6. Перезапустіть контейнери
docker compose down && docker compose up -d

# 7. Відкрийте браузер
# https://ваш-домен.duckdns.org
```

---

## 📝 Примітки

- **Порт forwarding НЕ потрібен** - використовується DNS challenge через DuckDNS API
- Сертифікати автоматично оновлюються кожні 12 годин
- Всі дані зберігаються локально в директорії `config/`
- Для доступу до Docker socket контейнер app має доступ до `/var/run/docker.sock`

---

## Використання з Oracle APEX

### Рекомендований підхід: Використання на сторінці 0 (Global Page)

Найпростіший спосіб інтеграції - використання функції `sendFromApexItem()` на сторінці 0 (Global Page) додатку APEX.

#### Налаштування в APEX:

1. **Створіть Application Items на сторінці 0:**
   - `P0_PRINT_SERVER_URL` - Повний URL сервера друку (наприклад: `https://roshkahome.duckdns.org/api/print` або `https://print.scs-it.net/u01/ords/XEPDB1/printing/label/zpl/api/print`)
   - `P0_PRINT_JS_ZPL` - JSON рядок з даними для друку

2. **Додайте JavaScript файл в Application:**
   - Відкрийте **Shared Components** → **User Interface** → **JavaScript**
   - В розділі **File URLs** додайте: `#WORKSPACE_FILES#JS/apex-print-service#MIN#.js`

3. **Створіть Dynamic Action на сторінці 0:**
   - **Event**: Change
   - **Selection Type**: Item(s)
   - **Item(s)**: `P0_PRINT_JS_ZPL`
   - **True Action**: Execute JavaScript Code

4. **JavaScript код для Dynamic Action:**

```javascript
sendFromApexItem({
    zplData: apex.item('P0_PRINT_JS_ZPL').getValue(),
    serverUrl: apex.item('P0_PRINT_SERVER_URL').getValue(),
    onSuccess: function(summary) {
        var msg = 'Відправлено ' + summary.success + ' з ' + summary.total + ' етикеток';
        if (summary.errors > 0) {
            apex.message.showErrors([{type: 'warning', location: 'page', message: msg + ' (' + summary.errors + ' помилок)', unsafe: false}]);
        } else {
            apex.message.showPageSuccess(msg);
        }
    },
    onError: function(error) {
        apex.message.showErrors([{type: 'error', location: 'page', message: error.message || 'Помилка при відправці на друк', unsafe: false}]);
    }
});
```

#### Формат даних в P0_PRINT_JS_ZPL:

**Одна етикетка:**
```json
{
  "IP": "192.168.1.100",
  "PORT": 9100,
  "ZPL": "^XA^FO50,50^ADN,36,20^FDHello World^FS^XZ"
}
```

**Кілька етикеток (масив):**
```json
[
  {"IP": "192.168.1.100", "PORT": 9100, "ZPL": "^XA^FO50,50^ADN,36,20^FDLabel 1^FS^XZ"},
  {"IP": "192.168.1.100", "PORT": 9100, "ZPL": "^XA^FO50,50^ADN,36,20^FDLabel 2^FS^XZ"}
]
```

**З параметрами порційного друку:**
```json
{
  "labels": [
    {"IP": "192.168.1.100", "PORT": 9100, "ZPL": "^XA^FO50,50^ADN,36,20^FDLabel 1^FS^XZ"},
    {"IP": "192.168.1.100", "PORT": 9100, "ZPL": "^XA^FO50,50^ADN,36,20^FDLabel 2^FS^XZ"}
  ],
  "poolSize": 10,
  "sleepSeconds": 2
}
```

**Примітки:**
- Функція `sendFromApexItem()` автоматично визначає формат даних (одна етикетка, масив або об'єкт з `labels`)
- Використовує URL з `P0_PRINT_SERVER_URL` як є (без додавання `/api/print`)
- Підтримує порційний друк з паузами між порціями
- Всі перевірки та валідація виконуються автоматично

### Альтернативний підхід: Прямий виклик функцій

Якщо потрібен більш гнучкий контроль, можна використовувати функції `sendToPrintServer()` або `sendLabelsInBatches()` напряму:

```javascript
sendLabelsInBatches({
    labels: labels,
    serverUrl: 'https://roshkahome.duckdns.org/api/print',
    poolSize: 10,
    sleepSeconds: 2,
    onSuccess: function(summary) {
        console.log('Друк завершено');
    }
});
```

Детальні приклади дивіться в файлі `examples/apex-usage-example.md`.

## Структура проекту

```
docker-print-server/
├── app/
│   ├── __init__.py
│   ├── main.py              # Flask додаток
│   ├── printer.py           # Модуль відправки ZPL та сканування мережі
│   ├── config.py            # Робота з конфігурацією
│   ├── scan_data.py         # Робота з даними сканування принтерів
│   └── static/              # Веб-інтерфейс
│       ├── index.html
│       ├── settings.js
│       └── styles.css
├── config/
│   ├── config.json          # Конфігурація (створюється автоматично)
│   └── scan_data.json       # Дані сканування принтерів (створюється автоматично)
├── certbot/
│   ├── Dockerfile
│   ├── duckdns.ini          # Конфігурація DuckDNS (створюється з .example)
│   ├── duckdns.ini.example  # Приклад конфігурації
│   ├── certs/               # SSL сертифікати
│   └── logs/                # Логи Certbot
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── start.sh
├── certbot-renew.sh
└── README.md
```

## API Endpoints

### POST /api/print

Відправляє ZPL на принтер.

**Request:**
```json
{
  "IP": "192.168.1.100",
  "PORT": 9100,
  "ZPL": "^XA^FO50,50^ADN,36,20^FDHello World^FS^XZ"
}
```

**Response (success):**
```json
{
  "status": "success",
  "message": "ZPL sent to printer successfully"
}
```

**Response (error):**
```json
{
  "status": "error",
  "message": "Connection timeout"
}
```

### GET /api/config

Отримує поточну конфігурацію.

**Response:**
```json
{
  "status": "success",
  "config": {
    "duckdns_token": "...",
    "duckdns_domain": "...",
    "certbot_email": "...",
    "auto_renew_certs": true
  }
}
```

### POST /api/config

Оновлює конфігурацію.

**Request:**
```json
{
  "duckdns_token": "your-api-token",
  "duckdns_domain": "myprinter.duckdns.org",
  "certbot_email": "admin@example.com",
  "auto_renew_certs": true
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "docker-print-server"
}
```

### GET /api/ssl-status

Отримує статус SSL сертифікату, включаючи перевірку відповідності домену.

**Response:**
```json
{
  "status": "ok",
  "ssl": {
    "valid": true,
    "cert_path": "/app/certbot/certs/live/domain.duckdns.org/fullchain.pem",
    "expires": "2026-02-08T15:33:51",
    "days_left": 89,
    "issuer": "Let's Encrypt",
    "cert_domains": ["domain.duckdns.org"],
    "configured_domain": "domain.duckdns.org",
    "domain_mismatch": false,
    "domain_warning": null
  }
}
```

### POST /api/ssl-renew

Перевипускає SSL сертифікат для домену з конфігурації.

**Response (success):**
```json
{
  "status": "success",
  "message": "Сертифікат успішно перевипущено для домену domain.duckdns.org",
  "output": "..."
}
```

### POST /api/printers/scan

Сканує локальну мережу на пошук принтерів з відкритим портом.

**Request:**
```json
{
  "network": "192.168.1.0/24",  // Опціонально, якщо не вказано - визначається автоматично
  "port": 9100                   // За замовчуванням 9100
}
```

**Response:**
```json
{
  "status": "success",
  "printers": [
    {"ip": "192.168.1.100", "port": "9100"}
  ],
  "count": 1
}
```

### GET /api/printers/scan-data

Отримує збережені дані сканування (остання мережа, порт та список принтерів).

**Response:**
```json
{
  "status": "success",
  "scan_data": {
    "network": "192.168.1.0/24",
    "port": 9100,
    "printers": [
      {"ip": "192.168.1.100", "port": "9100"}
    ],
    "last_scan": "2025-11-10T18:33:04.039000"
  }
}
```

### POST /api/printers/test-print

Відправляє тестовий ZPL ("Hello World!") на вказаний принтер.

**Request:**
```json
{
  "IP": "192.168.1.100",
  "PORT": 9100
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Test print sent successfully"
}
```

## Управління сервісом

### Запуск

```bash
docker compose up -d
```

### Зупинка

```bash
docker compose down
```

### Перегляд логів

```bash
# Логи додатку
docker compose logs -f app

# Логи Certbot
docker compose logs -f certbot
```

### Оновлення SSL сертифікату вручну

```bash
docker compose exec certbot certbot renew
```

### Перевипуск SSL сертифікату через веб-інтерфейс

Використовуйте кнопку "Перевипустити сертифікат" в веб-інтерфейсі налаштувань. Система автоматично:
- Перевипустить сертифікат для домену з конфігурації
- Перезапустить app контейнер для завантаження нового сертифікату

### Перезапуск після зміни конфігурації

```bash
docker compose restart app
```

## Налаштування SSL

### Автоматичне оновлення

Certbot автоматично оновлює сертифікати кожні 12 годин. Це налаштовується в `docker-compose.yml`.

### Вимкнення автоматичного оновлення

Встановіть `auto_renew_certs: false` в конфігурації через веб-інтерфейс або в `config/config.json`.

## Розв'язання проблем

### Помилка підключення до принтера

1. Перевірте, що принтер доступний в локальній мережі
2. Перевірте IP адресу та порт принтера
3. Переконайтеся, що порт 9100 не заблокований файрволом

### Помилка SSL сертифікату

1. Перевірте, що домен правильно налаштований в DuckDNS
2. Перевірте, що DuckDNS API token правильний в `certbot/duckdns.ini`
3. Перевірте логи Certbot: `docker-compose logs certbot`
4. **Порт forwarding НЕ потрібен** - використовується DNS challenge

### Помилка підключення з Oracle APEX

1. Перевірте, що використовується HTTPS (не HTTP)
2. Перевірте URL сервера в JavaScript коді
3. Перевірте CORS налаштування (якщо потрібно)

## Безпека

- Сервер працює тільки через HTTPS
- SSL сертифікати автоматично оновлюються
- Конфігурація зберігається локально
- Рекомендується використовувати в локальній мережі

## Ліцензія

MIT License

## Підтримка

Для питань та проблем створюйте issues в репозиторії проекту.

