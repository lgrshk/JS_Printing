# Приклади відповідей API Print Server

Цей документ містить приклади всіх можливих відповідей від API Print Server після надсилання етикетки на друк.

## Зміст

1. [Успішні відповіді](#успішні-відповіді)
2. [Помилки валідації (400)](#помилки-валідації-400)
3. [Помилки сервера (500)](#помилки-сервера-500)
4. [Мережеві помилки](#мережеві-помилки)
5. [Обробка відповідей в JavaScript](#обробка-відповідей-в-javascript)

---

## Успішні відповіді

### Успішна відправка однієї етикетки

**HTTP Status:** `200 OK`

**Response Body:**
```json
{
  "status": "success",
  "message": "ZPL sent to printer successfully"
}
```

**Приклад обробки в `sendFromApexItem`:**
```javascript
onSuccess: function(summary) {
    // summary для однієї етикетки:
    // {
    //   total: 1,
    //   success: 1,
    //   errors: 0,
    //   response: {
    //     status: "success",
    //     message: "ZPL sent to printer successfully"
    //   }
    // }
    apex.message.showPageSuccess('Етикетка успішно відправлена');
}
```

### Успішна відправка кількох етикеток

**HTTP Status:** `200 OK` (для кожної етикетки)

**Response Body (для кожної етикетки):**
```json
{
  "status": "success",
  "message": "ZPL sent to printer successfully"
}
```

**Приклад обробки в `sendLabelsInBatches`:**
```javascript
onSuccess: function(summary) {
    // summary для кількох етикеток:
    // {
    //   total: 5,
    //   success: 5,
    //   errors: 0,
    //   results: [
    //     { index: 0, success: true, response: {...} },
    //     { index: 1, success: true, response: {...} },
    //     ...
    //   ],
    //   errors: []
    // }
    
    var msg = 'Відправлено ' + summary.success + ' з ' + summary.total + ' етикеток';
    if (summary.errors > 0) {
        apex.message.showErrors([{
            type: 'warning',
            location: 'page',
            message: msg + ' (' + summary.errors + ' помилок)',
            unsafe: false
        }]);
    } else {
        apex.message.showPageSuccess(msg);
    }
}
```

### Частковий успіх (деякі етикетки не відправлені)

**Приклад summary при частковому успіху:**
```javascript
{
  total: 5,
  success: 3,
  errors: 2,
  results: [
    { index: 0, success: true, response: {...} },
    { index: 1, success: true, response: {...} },
    { index: 2, success: false, error: {...} },
    { index: 3, success: true, response: {...} },
    { index: 4, success: false, error: {...} }
  ],
  errors: [
    { index: 2, success: false, error: {...} },
    { index: 4, success: false, error: {...} }
  ]
}
```

---

## Помилки валідації (400)

### Помилка: Content-Type не application/json

**HTTP Status:** `400 Bad Request`

**Response Body:**
```json
{
  "status": "error",
  "message": "Content-Type повинен бути application/json"
}
```

**Приклад обробки:**
```javascript
onError: function(error) {
    // error.message = "Помилка від сервера: HTTP 400 Bad Request"
    // error.status = 400
    // error.statusText = "Bad Request"
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Невірний формат запиту',
        unsafe: false
    }]);
}
```

### Помилка: JSON дані не надані

**HTTP Status:** `400 Bad Request`

**Response Body:**
```json
{
  "status": "error",
  "message": "JSON дані не надані"
}
```

### Помилка: IP адреса не вказана

**HTTP Status:** `400 Bad Request`

**Response Body:**
```json
{
  "status": "error",
  "message": "IP адреса не вказана"
}
```

**Приклад обробки:**
```javascript
onError: function(error) {
    if (error.message.includes('IP адреса не вказана')) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: 'Не вказано IP адресу принтера',
            unsafe: false
        }]);
    }
}
```

### Помилка: PORT не вказаний

**HTTP Status:** `400 Bad Request`

**Response Body:**
```json
{
  "status": "error",
  "message": "PORT не вказаний"
}
```

### Помилка: PORT невалідний

**HTTP Status:** `400 Bad Request`

**Response Body:**
```json
{
  "status": "error",
  "message": "PORT повинен бути від 1 до 65535, отримано: 99999"
}
```

### Помилка: ZPL команди не вказані

**HTTP Status:** `400 Bad Request`

**Response Body:**
```json
{
  "status": "error",
  "message": "ZPL команди не вказані"
}
```

---

## Помилки сервера (500)

### Помилка: Таймаут підключення до принтера

**HTTP Status:** `500 Internal Server Error`

**Response Body:**
```json
{
  "status": "error",
  "message": "Таймаут підключення до принтера 192.168.1.100:9100"
}
```

**Приклад обробки:**
```javascript
onError: function(error) {
    if (error.message.includes('Таймаут')) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: 'Принтер не відповідає. Перевірте підключення.',
            unsafe: false
        }]);
    }
}
```

### Помилка: Помилка DNS для адреси

**HTTP Status:** `500 Internal Server Error`

**Response Body:**
```json
{
  "status": "error",
  "message": "Помилка DNS для адреси 192.168.1.999: [Errno -2] Name or service not known"
}
```

**Приклад обробки:**
```javascript
onError: function(error) {
    if (error.message.includes('DNS')) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: 'Невірна IP адреса принтера',
            unsafe: false
        }]);
    }
}
```

### Помилка: Помилка підключення до принтера

**HTTP Status:** `500 Internal Server Error`

**Response Body:**
```json
{
  "status": "error",
  "message": "Помилка підключення до принтера 192.168.1.100:9100: Connection refused"
}
```

**Приклад обробки:**
```javascript
onError: function(error) {
    if (error.message.includes('Connection refused')) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: 'Принтер недоступний. Перевірте, що принтер увімкнений та доступний в мережі.',
            unsafe: false
        }]);
    }
}
```

### Помилка: Internal server error

**HTTP Status:** `500 Internal Server Error`

**Response Body:**
```json
{
  "status": "error",
  "message": "Internal server error: [деталі помилки]"
}
```

---

## Мережеві помилки

### Помилка: Мережеве з'єднання

**Тип помилки:** `TypeError: Failed to fetch`

**Приклад обробки:**
```javascript
onError: function(error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: 'Помилка мережевого з\'єднання. Перевірте підключення до інтернету та доступність сервера.',
            unsafe: false
        }]);
    }
}
```

**Об'єкт помилки:**
```javascript
{
  message: "Помилка мережевого з'єднання. Перевірте підключення до інтернету та доступність сервера.",
  originalError: TypeError,
  status: undefined,
  statusText: undefined,
  details: undefined
}
```

### Помилка: CORS

**Тип помилки:** `TypeError: Failed to fetch`

**Приклад обробки:**
```javascript
onError: function(error) {
    if (error.message.includes('CORS') || error.message.includes('fetch')) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: 'Помилка CORS. Перевірте налаштування сервера.',
            unsafe: false
        }]);
    }
}
```

---

## Обробка відповідей в JavaScript

### Повна обробка з деталізацією

```javascript
sendFromApexItem({
    zplData: apex.item('P0_PRINT_JS_ZPL').getValue(),
    serverUrl: apex.item('P0_PRINT_SERVER_URL').getValue(),
    onSuccess: function(summary) {
        console.log('Успішна відповідь:', summary);
        
        // Обробка успішного друку
        if (summary.total === 1) {
            // Одна етикетка
            apex.message.showPageSuccess('Етикетка успішно відправлена');
        } else {
            // Кілька етикеток
            var msg = 'Відправлено ' + summary.success + ' з ' + summary.total + ' етикеток';
            if (summary.errors > 0) {
                apex.message.showErrors([{
                    type: 'warning',
                    location: 'page',
                    message: msg + ' (' + summary.errors + ' помилок)',
                    unsafe: false
                }]);
                
                // Логування помилок
                console.warn('Помилки при друку:', summary.errors);
                summary.errors.forEach(function(err) {
                    console.error('Етикетка ' + (err.index + 1) + ':', err.error);
                });
            } else {
                apex.message.showPageSuccess(msg);
            }
        }
    },
    onError: function(error) {
        console.error('Помилка друку:', error);
        
        // Визначення типу помилки
        var errorMessage = 'Помилка при відправці на друк';
        
        // HTTP помилки
        if (error.status === 400) {
            errorMessage = 'Невірний формат запиту: ' + (error.message || 'невідома помилка');
        } else if (error.status === 404) {
            errorMessage = 'Сервер друку не знайдено';
        } else if (error.status === 500) {
            if (error.message.includes('Таймаут')) {
                errorMessage = 'Принтер не відповідає. Перевірте підключення.';
            } else if (error.message.includes('DNS')) {
                errorMessage = 'Невірна IP адреса принтера';
            } else if (error.message.includes('Connection refused')) {
                errorMessage = 'Принтер недоступний. Перевірте, що принтер увімкнений.';
            } else {
                errorMessage = 'Помилка на сервері друку: ' + (error.message || 'невідома помилка');
            }
        } else if (error.status === 0 || (error.message && error.message.includes('fetch'))) {
            // Мережеві помилки
            errorMessage = 'Помилка мережевого з\'єднання. Перевірте підключення до інтернету та доступність сервера.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        // Відображення помилки
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: errorMessage,
            unsafe: false
        }]);
        
        // Логування деталей для дебагу
        if (error.details) {
            console.error('Деталі помилки:', error.details);
        }
        if (error.originalError) {
            console.error('Оригінальна помилка:', error.originalError);
        }
    }
});
```

### Обробка з Promise

```javascript
sendFromApexItem({
    zplData: apex.item('P0_PRINT_JS_ZPL').getValue(),
    serverUrl: apex.item('P0_PRINT_SERVER_URL').getValue()
})
.then(function(summary) {
    // Успішна обробка
    apex.message.showPageSuccess('Друк успішний');
})
.catch(function(error) {
    // Обробка помилок
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: error.message || 'Помилка при відправці на друк',
        unsafe: false
    }]);
});
```

### Обробка з async/await

```javascript
async function printLabel() {
    try {
        apex.util.showSpinner();
        
        var summary = await sendFromApexItem({
            zplData: apex.item('P0_PRINT_JS_ZPL').getValue(),
            serverUrl: apex.item('P0_PRINT_SERVER_URL').getValue()
        });
        
        apex.message.showPageSuccess('Відправлено ' + summary.success + ' з ' + summary.total);
    } catch (error) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: error.message || 'Помилка при відправці на друк',
            unsafe: false
        }]);
    } finally {
        apex.util.hideSpinner();
    }
}

// Виклик
printLabel();
```

---

## Структура об'єкта summary

### Для однієї етикетки (sendFromApexItem з одним елементом)

```javascript
{
  total: 1,
  success: 1,
  errors: 0,
  response: {
    status: "success",
    message: "ZPL sent to printer successfully"
  }
}
```

### Для кількох етикеток (sendLabelsInBatches)

```javascript
{
  total: 5,
  success: 4,
  errors: 1,
  results: [
    {
      index: 0,
      success: true,
      response: {
        status: "success",
        message: "ZPL sent to printer successfully"
      }
    },
    {
      index: 1,
      success: true,
      response: {
        status: "success",
        message: "ZPL sent to printer successfully"
      }
    },
    {
      index: 2,
      success: false,
      error: {
        message: "Помилка підключення до принтера 192.168.1.100:9100: Connection refused",
        status: 500,
        statusText: "Internal Server Error",
        details: {
          status: "error",
          message: "Помилка підключення до принтера 192.168.1.100:9100: Connection refused"
        }
      }
    },
    {
      index: 3,
      success: true,
      response: {
        status: "success",
        message: "ZPL sent to printer successfully"
      }
    },
    {
      index: 4,
      success: true,
      response: {
        status: "success",
        message: "ZPL sent to printer successfully"
      }
    }
  ],
  errors: [
    {
      index: 2,
      success: false,
      error: {
        message: "Помилка підключення до принтера 192.168.1.100:9100: Connection refused",
        status: 500,
        statusText: "Internal Server Error",
        details: {
          status: "error",
          message: "Помилка підключення до принтера 192.168.1.100:9100: Connection refused"
        }
      }
    }
  ]
}
```

---

## Структура об'єкта error

### Помилка валідації (400)

```javascript
{
  message: "Помилка від сервера: HTTP 400 Bad Request",
  originalError: Error,
  status: 400,
  statusText: "Bad Request",
  details: {
    status: "error",
    message: "IP адреса не вказана"
  }
}
```

### Помилка сервера (500)

```javascript
{
  message: "Помилка від сервера: HTTP 500 Internal Server Error",
  originalError: Error,
  status: 500,
  statusText: "Internal Server Error",
  details: {
    status: "error",
    message: "Таймаут підключення до принтера 192.168.1.100:9100"
  }
}
```

### Мережева помилка

```javascript
{
  message: "Помилка мережевого з'єднання. Перевірте підключення до інтернету та доступність сервера.",
  originalError: TypeError,
  status: undefined,
  statusText: undefined,
  details: undefined
}
```

---

## Поради по обробці помилок

1. **Завжди перевіряйте `summary.errors`** - навіть якщо `onSuccess` викликано, можуть бути помилки з окремих етикеток
2. **Логуйте помилки в консоль** - це допоможе при дебагу
3. **Показуйте зрозумілі повідомлення користувачу** - не показуйте технічні деталі
4. **Обробляйте різні типи помилок окремо** - мережеві, валідація, серверні
5. **Використовуйте `error.details`** - там може бути додаткова інформація від сервера

