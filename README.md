# JavaScript Printing System для Oracle APEX

Система друку на принтерах етикеток через JavaScript для Oracle APEX додатків.

## Опис

Цей модуль дозволяє відправляти ZPL-команди на принтери етикеток через проміжний веб-сервер безпосередньо з браузера, замінюючи використання `APEX_WEB_SERVICE.MAKE_REST_REQUEST` в PL/SQL коді.

## Переваги

- ✅ **Незалежність від серверної інфраструктури** - запит йде безпосередньо з браузера
- ✅ **SSL підтримка** - браузер автоматично перевіряє валідність сертифікатів
- ✅ **Гнучкість** - можна легко переключитися на локальний Docker-інстанс в майбутньому
- ✅ **Зручність** - один JavaScript файл для використання в будь-якому місці APEX
- ✅ **Не потрібна статична IP-адреса** - робота через HTTPS з валідними сертифікатами
- ✅ **Генерація PDF** - підтримка генерації PDF з ZPL коду через Labelary API (IP="PDF")

## Встановлення

### 1. Завантаження файлу

Скопіюйте файл `js/apex-print-service.js` в ваш Oracle APEX додаток.

### 2. Підключення до APEX

#### Варіант 1: Підключення через Static Application Files

1. Відкрийте ваш APEX додаток
2. Перейдіть в **Shared Components** → **Static Application Files**
3. Завантажте файл `apex-print-service.js`
4. Запишіть шлях до файлу (наприклад: `#APP_IMAGES#apex-print-service.js`)

#### Варіант 2: Підключення через Page Template

1. Відкрийте **Shared Components** → **Templates** → **Page Template**
2. В розділі **JavaScript File URLs** додайте:
   ```
   #APP_IMAGES#apex-print-service.js
   ```
   або абсолютний URL до файлу

#### Варіант 3: Підключення на конкретній сторінці

1. Відкрийте потрібну сторінку в APEX
2. Перейдіть в **Page Properties** → **JavaScript**
3. В розділі **File URLs** додайте шлях до файлу

## Використання

### Базовий приклад

```javascript
sendToPrintServer({
    ip: '192.168.1.100',
    port: 9100,
    zpl: '^XA^FO50,50^ADN,36,20^FDHello World^FS^XZ',
    serverUrl: 'https://print-server.example.com/api/print',
    onSuccess: function(response) {
        apex.message.showSuccess('Етикетка успішно відправлена на друк');
    },
    onError: function(error) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: 'Помилка друку: ' + error.message
        }]);
    }
});
```

### Використання з Promise (async/await)

```javascript
try {
    const response = await sendToPrintServer({
        ip: '192.168.1.100',
        port: 9100,
        zpl: '^XA^FO50,50^ADN,36,20^FDHello World^FS^XZ',
        serverUrl: 'https://print-server.example.com/api/print'
    });
    apex.message.showSuccess('Друк успішний');
} catch (error) {
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Помилка: ' + error.message
    }]);
}
```

### Використання з Promise (.then/.catch)

```javascript
sendToPrintServer({
    ip: '192.168.1.100',
    port: 9100,
    zpl: '^XA^FO50,50^ADN,36,20^FDHello World^FS^XZ',
    serverUrl: 'https://print-server.example.com/api/print'
})
.then(function(response) {
    apex.message.showSuccess('Друк успішний');
})
.catch(function(error) {
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Помилка: ' + error.message
    }]);
});
```

### Генерація PDF з ZPL коду

Для генерації PDF з ZPL коду замість відправки на принтер, встановіть IP="PDF":

```javascript
sendToPrintServer({
    ip: 'PDF',  // Спеціальне значення для генерації PDF
    port: 9100, // Порт не використовується для PDF
    zpl: '^XA^FO50,50^ADN,36,20^FDHello World^FS^XZ',
    serverUrl: 'https://print-server.example.com/api/print', // Не використовується для PDF
    onSuccess: function(result) {
        // PDF автоматично відкриється в новій вкладці
        console.log('PDF згенеровано:', result.pdfUrl);
    },
    onError: function(error) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: 'Помилка генерації PDF: ' + error.message
        }]);
    }
});
```

**Особливості PDF режиму:**
- Розміри етикетки визначаються автоматично з ZPL коду (команди `^PW` та `^LL`)
- PDF генерується через Labelary API (https://api.labelary.com)
- PDF автоматично відкривається в новій вкладці браузера
- Для масивів етикеток обробляється тільки перша етикетка (інші ігноруються)

### Порційний друк множини етикеток

Для друку великої кількості етикеток з паузами між порціями. **PL/SQL формує повний JSON масив з усіма етикетками, JavaScript тільки розділяє його на порції та відправляє.**

```javascript
// Отримуємо JSON масив етикеток, сформований в PL/SQL
var labelsJson = apex.item('P1_LABELS_JSON').getValue();
var labels = JSON.parse(labelsJson);

sendLabelsInBatches({
    labels: labels,           // JSON масив [{IP: "...", PORT: 9100, ZPL: "..."}, ...]
    serverUrl: 'https://print-server.example.com/api/print',
    poolSize: 10,              // Кількість етикеток в порції (PRINT_LABEL_POOL)
    sleepSeconds: 2,           // Пауза в секундах між порціями (PRINT_LABEL_SLEEP)
    onProgress: function(current, total, currentPool, totalPools) {
        console.log('Прогрес: ' + current + '/' + total + ' (порція ' + currentPool + '/' + totalPools + ')');
    },
    onSuccess: function(summary) {
        apex.message.showSuccess('Відправлено: ' + summary.success + ' з ' + summary.total + ' етикеток');
    },
    onError: function(error) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: 'Помилка: ' + error.message
        }]);
    }
});
```

## API Документація

### `sendToPrintServer(options)`

Відправляє ZPL-команди на принтер через проміжний веб-сервер.

#### Параметри

| Параметр | Тип | Обов'язковий | Опис |
|----------|-----|--------------|------|
| `ip` | string | Так | IP-адреса принтера (наприклад: '192.168.1.100') або 'PDF' для генерації PDF |
| `port` | number | Так | Порт принтера (зазвичай 9100, діапазон: 1-65535). Не використовується для PDF режиму |
| `zpl` | string | Так | ZPL команди для друку |
| `serverUrl` | string | Так | URL проміжного сервера (обов'язково HTTPS, наприклад: 'https://print-server.example.com/api/print'). Не використовується для PDF режиму |
| `onSuccess` | function | Ні | Callback функція, яка викликається при успішному відправленні. Отримує об'єкт відповіді від сервера |
| `onError` | function | Ні | Callback функція, яка викликається при помилці. Отримує об'єкт помилки |

#### Повертає

Promise, який:
- **Resolve** - при успішному відправленні (з даними відповіді від сервера)
- **Reject** - при помилці (з об'єктом помилки)

#### Структура JSON запиту

Модуль автоматично формує наступний JSON для відправки на сервер:

```json
{
    "IP": "192.168.1.100",
    "PORT": 9100,
    "ZPL": "^XA^FO50,50^ADN,36,20^FDHello World^FS^XZ"
}
```

#### Об'єкт помилки

При виникненні помилки, об'єкт помилки містить:

```javascript
{
    message: string,        // Текст помилки
    originalError: Error,    // Оригінальна помилка
    status: number,         // HTTP статус код (якщо є)
    statusText: string,     // HTTP статус текст (якщо є)
    details: object|string  // Деталі помилки від сервера (якщо є)
}
```

### `sendLabelsInBatches(options)`

Відправляє множину ZPL-етикеток порціями з паузами між порціями. JSON масив етикеток формується в PL/SQL, JavaScript тільки розділяє його на порції та відправляє на проміжний сервер.

#### Параметри

| Параметр | Тип | Обов'язковий | Опис |
|----------|-----|--------------|------|
| `labels` | Array | Так | JSON масив етикеток з PL/SQL. Кожен об'єкт: `{IP: "...", PORT: 9100, ZPL: "..."}` |
| `poolSize` | number | Так | Кількість етикеток в одній порції (PRINT_LABEL_POOL). За замовчуванням: 10 |
| `sleepSeconds` | number | Так | Пауза в секундах між порціями (PRINT_LABEL_SLEEP). За замовчуванням: 1 |
| `serverUrl` | string | Так | URL проміжного сервера (обов'язково HTTPS) |
| `onProgress` | function | Ні | Callback при обробці кожної етикетки. Параметри: `(current, total, currentPool, totalPools)` |
| `onPoolComplete` | function | Ні | Callback при завершенні порції. Параметри: `(poolNumber, totalPools)` |
| `onSuccess` | function | Ні | Callback при успішному завершенні всіх етикеток. Отримує об'єкт summary |
| `onError` | function | Ні | Callback при помилці. Отримує об'єкт помилки |

#### Повертає

Promise, який резолвиться з об'єктом summary:

```javascript
{
    total: number,        // Загальна кількість етикеток
    success: number,      // Кількість успішно відправлених етикеток
    errors: number,       // Кількість помилок
    results: Array,       // Масив результатів для кожної етикетки
    errors: Array         // Масив помилок
}
```

#### Структура об'єкта етикетки в масиві labels

JSON масив формується в PL/SQL з наступною структурою (великі літери):

```javascript
[
    {
        IP: string,      // IP-адреса принтера (обов'язково)
        PORT: number,    // Порт принтера (обов'язково, зазвичай 9100)
        ZPL: string      // ZPL команди для друку (обов'язково)
    },
    // ... більше етикеток
]
```

**Примітка:** Функція підтримує як великі літери (IP, PORT, ZPL) з PL/SQL, так і малі (ip, port, zpl) для сумісності.

#### Приклад використання

```javascript
// JSON масив сформований в PL/SQL і збережений в P1_LABELS_JSON
var labelsJson = apex.item('P1_LABELS_JSON').getValue();
var labels = JSON.parse(labelsJson);

sendLabelsInBatches({
    labels: labels,           // JSON масив [{IP: "...", PORT: 9100, ZPL: "..."}, ...]
    serverUrl: 'https://print-server.example.com/api/print',
    poolSize: 10,              // Розмір порції
    sleepSeconds: 2,            // Пауза між порціями
    onProgress: function(current, total, currentPool, totalPools) {
        console.log('Оброблено: ' + current + '/' + total);
    },
    onSuccess: function(summary) {
        console.log('Успішно: ' + summary.success + ', помилок: ' + summary.errors);
    }
});
```

## Валідація параметрів

Модуль автоматично перевіряє:

**Для `sendToPrintServer`:**
- ✅ Наявність всіх обов'язкових параметрів
- ✅ Валідність IP-адреси (не порожня)
- ✅ Валідність порту (число від 1 до 65535)
- ✅ Наявність ZPL команд (не порожні)
- ✅ Валідність URL сервера (не порожній)
- ✅ Використання HTTPS протоколу для serverUrl

**Для `sendLabelsInBatches`:**
- ✅ Наявність та валідність масиву labels
- ✅ Валідність poolSize та sleepSeconds
- ✅ Валідність URL сервера та HTTPS протоколу
- ✅ Перевірка наявності IP, PORT та ZPL для кожної етикетки в масиві
- ✅ Валідність PORT (число від 1 до 65535)

## Обробка помилок

Модуль обробляє наступні типи помилок:

1. **Валідаційні помилки** - некоректні параметри
2. **Мережеві помилки** - проблеми з підключенням
3. **HTTP помилки** - помилки від сервера (4xx, 5xx)
4. **Помилки парсингу** - проблеми з форматом відповіді

## Приклади використання в APEX

Детальні приклади інтеграції з Oracle APEX дивіться в файлі [examples/apex-usage-example.md](examples/apex-usage-example.md).

## Вимоги

- Oracle APEX 18.1 або новіша версія
- Сучасний браузер з підтримкою Fetch API (Chrome 42+, Firefox 39+, Safari 10.1+, Edge 14+)
- Проміжний веб-сервер з валідним SSL сертифікатом

## Підтримка

Для питань та проблем створюйте issues в репозиторії проекту.

## Ліцензія

MIT License

