# Приклади використання JavaScript Printing System в Oracle APEX

Цей документ містить детальні приклади інтеграції модуля `apex-print-service.js` в Oracle APEX додатки.

## Рекомендований підхід: Використання на сторінці 0 (Global Page)

**Найпростіший та найзручніший спосіб** - використання функції `sendFromApexItem()` на сторінці 0 додатку. Це дозволяє централізувати логіку друку та використовувати її з будь-якої сторінки додатку.

## Зміст

1. [Використання sendFromApexItem на сторінці 0](#використання-sendfromapexitem-на-сторінці-0) ⭐ **РЕКОМЕНДОВАНО**
2. [Виклик з Dynamic Action](#виклик-з-dynamic-action)
3. [Виклик з JavaScript на сторінці](#виклик-з-javascript-на-сторінці)
4. [Використання з APEX Items](#використання-з-apex-items)
5. [Інтеграція з PL/SQL кодом](#інтеграція-з-plsql-кодом)
6. [Обробка результатів та помилок](#обробка-результатів-та-помилок)
7. [Розширені приклади](#розширені-приклади)

---

## Використання sendFromApexItem на сторінці 0

### Налаштування в APEX

1. **Створіть Application Items на сторінці 0 (Global Page):**
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

### Приклад 1: Мінімальний код для Dynamic Action

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

### Приклад 2: Використання з PL/SQL на сторінці додатку

**На сторінці додатку (наприклад, сторінка 1):**

**PL/SQL Process - формування JSON:**
```sql
DECLARE
    l_labels_json CLOB;
    l_json_array JSON_ARRAY_T := JSON_ARRAY_T();
    l_json_obj JSON_OBJECT_T;
    l_zpl CLOB;
BEGIN
    -- Формуємо ZPL
    l_zpl := '^XA^FO50,50^ADN,36,20^FD' || :P1_LABEL_TEXT || '^FS^XZ';
    
    -- Створюємо JSON об'єкт
    l_json_obj := JSON_OBJECT_T();
    l_json_obj.put('ZPL', l_zpl);
    l_json_obj.put('IP', :P1_PRINTER_IP);
    l_json_obj.put('PORT', :P1_PRINTER_PORT);
    
    -- Додаємо в масив
    l_json_array.append(l_json_obj);
    
    -- Зберігаємо в Global Page Item
    :P0_PRINT_JS_ZPL := l_json_array.to_string;
    :P0_PRINT_SERVER_URL := 'https://roshkahome.duckdns.org/api/print';
END;
```

**JavaScript автоматично виконається** через Dynamic Action на сторінці 0 при зміні `P0_PRINT_JS_ZPL`.

### Приклад 3: Формати даних для P0_PRINT_JS_ZPL

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
- Функція `sendFromApexItem()` автоматично визначає формат даних
- Використовує URL з `P0_PRINT_SERVER_URL` як є (без додавання `/api/print`)
- Підтримує порційний друк з паузами між порціями
- Всі перевірки та валідація виконуються автоматично
- Підтримує як великі (`IP`, `PORT`, `ZPL`), так і малі літери (`ip`, `port`, `zpl`)

---

## Виклик з Dynamic Action

### Приклад 1: Друк при натисканні кнопки

**Налаштування Dynamic Action:**

1. Створіть кнопку на сторінці (наприклад, `P1_PRINT_BTN`)
2. Створіть Dynamic Action:
   - **Event**: Click
   - **Selection Type**: Button
   - **Button**: `P1_PRINT_BTN`
3. Додайте True Action типу **Execute JavaScript Code**:

```javascript
// Отримуємо JSON масив етикеток, сформований в PL/SQL
var labelsJson = apex.item('P1_LABELS_JSON').getValue();
var serverUrl = 'https://print-server.example.com/api/print';
var poolSize = parseInt(apex.item('P1_PRINT_LABEL_POOL').getValue()) || 10;
var sleepSeconds = parseInt(apex.item('P1_PRINT_LABEL_SLEEP').getValue()) || 1;

if (!labelsJson) {
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Немає етикеток для друку',
        unsafe: false
    }]);
    return;
}

try {
    // Парсимо JSON масив з PL/SQL
    var labels = JSON.parse(labelsJson);
    
    // Відправляємо на друк через sendLabelsInBatches
    sendLabelsInBatches({
        labels: labels,           // JSON масив з PL/SQL [{IP: "...", PORT: 9100, ZPL: "..."}, ...]
        serverUrl: serverUrl,     // URL проміжного сервера
        poolSize: poolSize,        // Розмір порції
        sleepSeconds: sleepSeconds, // Пауза між порціями
        onSuccess: function(summary) {
            apex.message.showSuccess('Етикетка успішно відправлена на друк');
            apex.item('P1_PRINT_STATUS').setValue('Відправлено');
        },
        onError: function(error) {
            apex.message.showErrors([{
                type: 'error',
                location: 'page',
                message: 'Помилка друку: ' + error.message,
                unsafe: false
            }]);
            apex.item('P1_PRINT_STATUS').setValue('Помилка');
        }
    });
} catch (e) {
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Помилка парсингу JSON: ' + e.message,
        unsafe: false
    }]);
}
```

### Приклад 2: Друк після завантаження сторінки

**Dynamic Action натискання кнопки з перевіркою:**

```javascript
// Отримуємо JSON масив етикеток з PL/SQL
var labelsJson = apex.item('P1_LABELS_JSON').getValue();

if (!labelsJson) {
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Немає етикеток для друку',
        unsafe: false
    }]);
    return false; // Зупиняємо виконання
}

try {
    var labels = JSON.parse(labelsJson);
    
    // Відправляємо на друк через sendLabelsInBatches
    sendLabelsInBatches({
        labels: labels,           // JSON масив з PL/SQL
        serverUrl: 'https://print-server.example.com/api/print',
        poolSize: parseInt(apex.item('P1_PRINT_LABEL_POOL').getValue()) || 10,
        sleepSeconds: parseInt(apex.item('P1_PRINT_LABEL_SLEEP').getValue()) || 1,
        onSuccess: function(summary) {
            apex.message.showSuccess('Друк успішний');
        },
        onError: function(error) {
            apex.message.showErrors([{
                type: 'error',
                location: 'page',
                message: error.message,
                unsafe: false
            }]);
        }
    });
} catch (e) {
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Помилка парсингу JSON: ' + e.message,
        unsafe: false
    }]);
}
```

---

## Виклик з JavaScript на сторінці

### Приклад 1: Функція-обгортка для зручності

Додайте в **Page Properties** → **Function and Global Variable Declaration**:

```javascript
// Функція-обгортка для друку з APEX
// Приймає JSON масив етикеток, сформований в PL/SQL
function printLabels(labelsJson, serverUrl, poolSize, sleepSeconds) {
    // Параметри за замовчуванням з Application Items
    serverUrl = serverUrl || apex.item('APP_PRINT_SERVER_URL').getValue() || 
                'https://print-server.example.com/api/print';
    poolSize = poolSize || parseInt(apex.item('APP_PRINT_LABEL_POOL').getValue()) || 10;
    sleepSeconds = sleepSeconds || parseInt(apex.item('APP_PRINT_LABEL_SLEEP').getValue()) || 1;
    
    if (!labelsJson) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: 'Немає етикеток для друку',
            unsafe: false
        }]);
        return Promise.reject(new Error('Немає етикеток для друку'));
    }
    
    try {
        var labels = JSON.parse(labelsJson);
        
        return sendLabelsInBatches({
            labels: labels,           // JSON масив з PL/SQL [{IP: "...", PORT: 9100, ZPL: "..."}, ...]
            serverUrl: serverUrl,     // URL проміжного сервера
            poolSize: poolSize,        // Розмір порції
            sleepSeconds: sleepSeconds, // Пауза між порціями
            onSuccess: function(summary) {
                apex.message.showSuccess('Етикетки відправлені на друк');
            },
            onError: function(error) {
                apex.message.showErrors([{
                    type: 'error',
                    location: 'page',
                    message: 'Помилка друку: ' + error.message,
                    unsafe: false
                }]);
            }
        });
    } catch (e) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: 'Помилка парсингу JSON: ' + e.message,
            unsafe: false
        }]);
        return Promise.reject(e);
    }
}
```

Тепер можна викликати з будь-якого місця:

```javascript
// Виклик з Dynamic Action або іншого JavaScript
// Отримуємо JSON масив з PL/SQL
var labelsJson = apex.item('P1_LABELS_JSON').getValue();
printLabels(labelsJson);
```

### Приклад 2: Використання з async/await

```javascript
async function printLabelsAsync(labelsJson, serverUrl, poolSize, sleepSeconds) {
    try {
        // Показуємо індикатор завантаження
        apex.util.showSpinner();
        
        // Параметри за замовчуванням
        serverUrl = serverUrl || 'https://print-server.example.com/api/print';
        poolSize = poolSize || 10;
        sleepSeconds = sleepSeconds || 1;
        
        if (!labelsJson) {
            throw new Error('Немає етикеток для друку');
        }
        
        var labels = JSON.parse(labelsJson);
        
        var summary = await sendLabelsInBatches({
            labels: labels,           // JSON масив з PL/SQL
            serverUrl: serverUrl,     // URL проміжного сервера
            poolSize: poolSize,        // Розмір порції
            sleepSeconds: sleepSeconds // Пауза між порціями
        });
        
        apex.message.showSuccess('Друк успішний');
        return summary;
    } catch (error) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: 'Помилка: ' + error.message,
            unsafe: false
        }]);
        throw error;
    } finally {
        // Приховуємо індикатор завантаження
        apex.util.hideSpinner();
    }
}

// Виклик
var labelsJson = apex.item('P1_LABELS_JSON').getValue();
printLabelsAsync(labelsJson);
```

---

## Використання з APEX Items

### Приклад 1: Друк з даними форми

```javascript
// Отримуємо JSON масив етикеток, сформований в PL/SQL
// PL/SQL вже сформував масив з полями IP, PORT, ZPL для кожної етикетки
var labelsJson = apex.item('P1_LABELS_JSON').getValue();
var serverUrl = 'https://print-server.example.com/api/print';
var poolSize = parseInt(apex.item('P1_PRINT_LABEL_POOL').getValue()) || 10;
var sleepSeconds = parseInt(apex.item('P1_PRINT_LABEL_SLEEP').getValue()) || 1;

if (!labelsJson) {
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Немає етикеток для друку',
        unsafe: false
    }]);
    return;
}

try {
    var labels = JSON.parse(labelsJson);
    
    // Відправляємо на друк через sendLabelsInBatches
    sendLabelsInBatches({
        labels: labels,           // JSON масив з PL/SQL [{IP: "...", PORT: 9100, ZPL: "..."}, ...]
        serverUrl: serverUrl,     // URL проміжного сервера
        poolSize: poolSize,        // Розмір порції
        sleepSeconds: sleepSeconds, // Пауза між порціями
        onSuccess: function(summary) {
            apex.message.showSuccess('Етикетка надрукована');
        },
        onError: function(error) {
            apex.message.showErrors([{
                type: 'error',
                location: 'page',
                message: error.message,
                unsafe: false
            }]);
        }
    });
} catch (e) {
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Помилка парсингу JSON: ' + e.message,
        unsafe: false
    }]);
}
```

### Приклад 2: Друк з Application Items (глобальні налаштування)

```javascript
// Отримуємо JSON масив етикеток з PL/SQL
// PL/SQL вже включив всі необхідні дані (IP, PORT, ZPL) в кожну етикетку
var labelsJson = apex.item('P1_LABELS_JSON').getValue();
var serverUrl = apex.item('APP_PRINT_SERVER_URL').getValue() || 
                'https://print-server.example.com/api/print';
var poolSize = parseInt(apex.item('APP_PRINT_LABEL_POOL').getValue()) || 10;
var sleepSeconds = parseInt(apex.item('APP_PRINT_LABEL_SLEEP').getValue()) || 1;

if (!labelsJson) {
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Немає етикеток для друку',
        unsafe: false
    }]);
    return;
}

try {
    var labels = JSON.parse(labelsJson);
    
    sendLabelsInBatches({
        labels: labels,           // JSON масив з PL/SQL [{IP: "...", PORT: 9100, ZPL: "..."}, ...]
        serverUrl: serverUrl,     // URL проміжного сервера
        poolSize: poolSize,        // Розмір порції
        sleepSeconds: sleepSeconds, // Пауза між порціями
        onSuccess: function(summary) {
            apex.message.showSuccess('Друк виконано');
        },
        onError: function(error) {
            apex.message.showErrors([{
                type: 'error',
                location: 'page',
                message: error.message,
                unsafe: false
            }]);
        }
    });
} catch (e) {
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Помилка парсингу JSON: ' + e.message,
        unsafe: false
    }]);
}
```

---

## Інтеграція з PL/SQL кодом

### Приклад 1: Заміна PL/SQL на JavaScript з збереженням логіки

**Старий PL/SQL код:**
```sql
DECLARE
    l_response CLOB;
BEGIN
    l_response := APEX_WEB_SERVICE.MAKE_REST_REQUEST(
        p_url         => 'https://print-server.example.com/api/print',
        p_http_method => 'POST',
        p_body        => json_object(
            'IP'   VALUE :P1_PRINTER_IP,
            'PORT' VALUE :P1_PRINTER_PORT,
            'ZPL'  VALUE :P1_ZPL_DATA
        )
    );
    
    APEX_JSON.PARSE(l_response);
    IF APEX_JSON.get_varchar2('status') = 'success' THEN
        apex_application.g_print_success_message := 'Друк успішний';
    END IF;
END;
```

**Новий підхід: PL/SQL формує JSON масив, JavaScript відправляє**

**PL/SQL Process - формування JSON масиву з полями IP, PORT, ZPL (великі літери):**
```sql
DECLARE
    l_labels_json CLOB;
    l_json_array JSON_ARRAY_T := JSON_ARRAY_T();
    l_json_obj JSON_OBJECT_T;
BEGIN
    -- Створюємо JSON об'єкт для етикетки з великими літерами (IP, PORT, ZPL)
    l_json_obj := JSON_OBJECT_T();
    l_json_obj.put('ZPL', :P1_ZPL_DATA);
    l_json_obj.put('IP', :P1_PRINTER_IP);
    l_json_obj.put('PORT', :P1_PRINTER_PORT);
    
    -- Додаємо об'єкт в масив
    l_json_array.append(l_json_obj);
    
    -- Конвертуємо JSON масив в CLOB
    l_labels_json := l_json_array.to_string;
    
    -- Зберігаємо в APEX Items
    :P1_LABELS_JSON := l_labels_json;
    :P1_PRINT_LABEL_POOL := :PRINT_LABEL_POOL;
    :P1_PRINT_LABEL_SLEEP := :PRINT_LABEL_SLEEP;
    :P1_EXECUTE_BATCH_PRINT := 'Y'; -- Флаг для запуску JavaScript
END;
```

**JavaScript Dynamic Action (після PL/SQL Process):**
```javascript
// Отримуємо JSON масив етикеток з PL/SQL
// PL/SQL вже сформував масив з полями IP, PORT, ZPL (великі літери)
var labelsJson = apex.item('P1_LABELS_JSON').getValue();
var serverUrl = 'https://print-server.example.com/api/print';
var poolSize = parseInt(apex.item('P1_PRINT_LABEL_POOL').getValue()) || 10;
var sleepSeconds = parseInt(apex.item('P1_PRINT_LABEL_SLEEP').getValue()) || 1;

if (!labelsJson) {
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Немає етикеток для друку',
        unsafe: false
    }]);
    return;
}

try {
    var labels = JSON.parse(labelsJson);
    
    // Відправляємо на друк - функція автоматично розділить на порції та зробить паузи
    sendLabelsInBatches({
        labels: labels,           // JSON масив [{IP: "...", PORT: 9100, ZPL: "..."}, ...]
        serverUrl: serverUrl,     // URL проміжного сервера
        poolSize: poolSize,        // Розмір порції
        sleepSeconds: sleepSeconds, // Пауза між порціями
        onSuccess: function(summary) {
            // Можна встановити значення в Hidden Item для подальшої обробки в PL/SQL
            apex.item('P1_PRINT_RESULT').setValue('SUCCESS');
            apex.message.showSuccess('Друк успішний');
        },
        onError: function(error) {
            apex.item('P1_PRINT_RESULT').setValue('ERROR');
            apex.item('P1_PRINT_ERROR').setValue(error.message);
            apex.message.showErrors([{
                type: 'error',
                location: 'page',
                message: 'Помилка друку: ' + error.message,
                unsafe: false
            }]);
        }
    });
} catch (e) {
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Помилка парсингу JSON: ' + e.message,
        unsafe: false
    }]);
}
```

### Приклад 2: Гібридний підхід (PL/SQL формує ZPL, JS відправляє)

**PL/SQL Process (перед JavaScript):**
```sql
-- Формуємо ZPL з шаблону та JSON масив
DECLARE
    l_zpl CLOB;
    l_labels_json CLOB;
    l_json_array JSON_ARRAY_T := JSON_ARRAY_T();
    l_json_obj JSON_OBJECT_T;
BEGIN
    -- Ваша логіка формування ZPL
    l_zpl := '^XA';
    l_zpl := l_zpl || '^FO50,50^ADN,36,20^FD' || :P1_LABEL_TEXT || '^FS';
    l_zpl := l_zpl || '^XZ';
    
    -- Формуємо JSON масив з однією етикеткою
    l_json_obj := JSON_OBJECT_T();
    l_json_obj.put('ZPL', l_zpl);
    l_json_obj.put('IP', :P1_PRINTER_IP);
    l_json_obj.put('PORT', :P1_PRINTER_PORT);
    l_json_array.append(l_json_obj);
    
    :P1_LABELS_JSON := l_json_array.to_string;
    :P1_PRINT_LABEL_POOL := :PRINT_LABEL_POOL;
    :P1_PRINT_LABEL_SLEEP := :PRINT_LABEL_SLEEP;
    :P1_EXECUTE_BATCH_PRINT := 'Y';
END;
```

**JavaScript Dynamic Action (після PL/SQL Process):**
```javascript
// Отримуємо JSON масив з PL/SQL
// PL/SQL вже сформував масив з полями IP, PORT, ZPL
var labelsJson = apex.item('P1_LABELS_JSON').getValue();
var labels = JSON.parse(labelsJson);

sendLabelsInBatches({
    labels: labels,           // JSON масив [{IP: "...", PORT: 9100, ZPL: "..."}, ...]
    serverUrl: 'https://print-server.example.com/api/print',
    poolSize: parseInt(apex.item('P1_PRINT_LABEL_POOL').getValue()) || 10,
    sleepSeconds: parseInt(apex.item('P1_PRINT_LABEL_SLEEP').getValue()) || 1,
    onSuccess: function(summary) {
        apex.message.showSuccess('Друк виконано');
    },
    onError: function(error) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: error.message,
            unsafe: false
        }]);
    }
});
```

---

## Порційний друк множини етикеток з PL/SQL

### Приклад 1: Повна інтеграція PL/SQL + JavaScript для порційного друку

Цей приклад показує, як формувати множину ZPL етикеток в PL/SQL та відправляти їх порціями через JavaScript з паузами між порціями. **Важливо:** Навіть якщо етикетка одна, вона все одно формується як масив з одного елемента.

**PL/SQL Process - формування всіх етикеток:**

```sql
DECLARE
    l_labels_json CLOB;
    l_zpl CLOB;
    l_json_array JSON_ARRAY_T := JSON_ARRAY_T();
    l_json_obj JSON_OBJECT_T;
    l_printer_ip VARCHAR2(50) := :P1_PRINTER_IP;
    l_printer_port NUMBER := :P1_PRINTER_PORT;
    l_pool_size NUMBER := :PRINT_LABEL_POOL;      -- Кількість етикеток в порції
    l_sleep_seconds NUMBER := :PRINT_LABEL_SLEEP;  -- Пауза в секундах між порціями
    
    -- Ваші дані для формування етикеток (наприклад, курсор)
    CURSOR c_labels IS
        SELECT 
            label_id,
            label_text,
            barcode_value,
            -- інші поля
        FROM your_labels_table
        WHERE condition = :P1_CONDITION;
BEGIN
    -- Формуємо ZPL для кожної етикетки і додаємо в JSON масив
    FOR rec IN c_labels LOOP
        -- Формуємо ZPL для поточної етикетки
        l_zpl := '^XA';
        l_zpl := l_zpl || '^FO50,50^ADN,36,20^FD' || rec.label_text || '^FS';
        l_zpl := l_zpl || '^FO50,100^BY2^BCN,100,Y,N,N^FD' || rec.barcode_value || '^FS';
        l_zpl := l_zpl || '^XZ';
        
        -- Створюємо JSON об'єкт для етикетки
        l_json_obj := JSON_OBJECT_T();
        l_json_obj.put('ZPL', l_zpl);
        l_json_obj.put('IP', l_printer_ip);
        l_json_obj.put('PORT', l_printer_port);
        -- Можна додати інші поля, якщо потрібно
        
        -- Додаємо об'єкт в масив
        l_json_array.append(l_json_obj);
    END LOOP;
    
    -- Конвертуємо JSON масив в CLOB
    l_labels_json := l_json_array.to_string;
    
    -- Зберігаємо в APEX Items
    :P1_LABELS_JSON := l_labels_json;
    :P1_PRINT_LABEL_POOL := l_pool_size;
    :P1_PRINT_LABEL_SLEEP := l_sleep_seconds;
    :P1_PRINTER_IP := l_printer_ip;
    :P1_PRINTER_PORT := l_printer_port;
    :P1_EXECUTE_BATCH_PRINT := 'Y'; -- Флаг для запуску JavaScript
END;
```

**Альтернативний варіант PL/SQL (якщо JSON_ARRAY_T недоступний):**

```sql
DECLARE
    l_labels_json CLOB := '[';
    l_zpl CLOB;
    l_first BOOLEAN := TRUE;
    l_printer_ip VARCHAR2(50) := :P1_PRINTER_IP;
    l_printer_port NUMBER := :P1_PRINTER_PORT;
    l_pool_size NUMBER := :PRINT_LABEL_POOL;
    l_sleep_seconds NUMBER := :PRINT_LABEL_SLEEP;
    
    CURSOR c_labels IS
        SELECT label_text, barcode_value
        FROM your_labels_table
        WHERE condition = :P1_CONDITION;
BEGIN
    FOR rec IN c_labels LOOP
        -- Формуємо ZPL
        l_zpl := '^XA';
        l_zpl := l_zpl || '^FO50,50^ADN,36,20^FD' || rec.label_text || '^FS';
        l_zpl := l_zpl || '^FO50,100^BY2^BCN,100,Y,N,N^FD' || rec.barcode_value || '^FS';
        l_zpl := l_zpl || '^XZ';
        
        -- Додаємо кому перед кожним елементом крім першого
        IF NOT l_first THEN
            l_labels_json := l_labels_json || ',';
        END IF;
        l_first := FALSE;
        
        -- Формуємо JSON об'єкт (екрануємо лапки в ZPL)
        l_labels_json := l_labels_json || '{';
        l_labels_json := l_labels_json || '"zpl":"' || REPLACE(l_zpl, '"', '\"') || '",';
        l_labels_json := l_labels_json || '"ip":"' || l_printer_ip || '",';
        l_labels_json := l_labels_json || '"port":' || l_printer_port;
        l_labels_json := l_labels_json || '}';
    END LOOP;
    
    l_labels_json := l_labels_json || ']';
    
    :P1_LABELS_JSON := l_labels_json;
    :P1_PRINT_LABEL_POOL := l_pool_size;
    :P1_PRINT_LABEL_SLEEP := l_sleep_seconds;
    :P1_EXECUTE_BATCH_PRINT := 'Y';
END;
```

**JavaScript Dynamic Action - порційний друк:**

Налаштування Dynamic Action:
- **Event**: After Refresh (або After Submit, якщо це форма)
- **Condition**: Item = Value → `P1_EXECUTE_BATCH_PRINT` = `Y`
- **True Action**: Execute JavaScript Code

```javascript
// Отримуємо дані з PL/SQL
var labelsJson = apex.item('P1_LABELS_JSON').getValue();
var poolSize = parseInt(apex.item('P1_PRINT_LABEL_POOL').getValue()) || 10;
var sleepSeconds = parseInt(apex.item('P1_PRINT_LABEL_SLEEP').getValue()) || 1;
var serverUrl = 'https://print-server.example.com/api/print';
var defaultIP = apex.item('P1_PRINTER_IP').getValue();
var defaultPort = parseInt(apex.item('P1_PRINTER_PORT').getValue()) || 9100;

if (!labelsJson) {
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Немає етикеток для друку',
        unsafe: false
    }]);
    return;
}

try {
    // Парсимо JSON
    var labels = JSON.parse(labelsJson);
    
    // Показуємо індикатор завантаження
    apex.util.showSpinner();
    
    // Запускаємо порційний друк
    sendLabelsInBatches({
        labels: labels,
        poolSize: poolSize,
        sleepSeconds: sleepSeconds,
        serverUrl: serverUrl,
        defaultIP: defaultIP,
        defaultPort: defaultPort,
        onProgress: function(current, total, currentPool, totalPools) {
            // Оновлюємо прогрес (якщо є елемент для відображення)
            var progressItem = apex.item('P1_PRINT_PROGRESS');
            if (progressItem) {
                var percent = Math.round((current / total) * 100);
                progressItem.setValue(percent + '% (' + current + '/' + total + ')');
            }
            console.log('Прогрес: ' + current + '/' + total + ' (порція ' + currentPool + '/' + totalPools + ')');
        },
        onPoolComplete: function(poolNumber, totalPools) {
            console.log('Порція ' + poolNumber + ' з ' + totalPools + ' завершена');
            // Можна показати повідомлення про завершення порції
            if (poolNumber < totalPools) {
                apex.message.showInfo('Порція ' + poolNumber + ' відправлена. Очікування перед наступною порцією...');
            }
        },
        onSuccess: function(summary) {
            apex.util.hideSpinner();
            apex.item('P1_EXECUTE_BATCH_PRINT').setValue('N');
            
            var message = 'Друк завершено: ' + summary.success + ' з ' + summary.total + ' етикеток';
            if (summary.errors > 0) {
                message += ' (помилок: ' + summary.errors + ')';
                apex.message.showInfo(message);
            } else {
                apex.message.showSuccess(message);
            }
            
            // Можна зберегти результат для подальшої обробки
            apex.item('P1_PRINT_RESULT').setValue('SUCCESS');
            apex.item('P1_PRINT_SUCCESS_COUNT').setValue(summary.success);
            apex.item('P1_PRINT_ERROR_COUNT').setValue(summary.errors);
        },
        onError: function(error) {
            apex.util.hideSpinner();
            apex.item('P1_EXECUTE_BATCH_PRINT').setValue('N');
            
            apex.message.showErrors([{
                type: 'error',
                location: 'page',
                message: 'Помилка при друку: ' + error.message,
                unsafe: false
            }]);
            
            apex.item('P1_PRINT_RESULT').setValue('ERROR');
        }
    });
} catch (e) {
    apex.util.hideSpinner();
    apex.item('P1_EXECUTE_BATCH_PRINT').setValue('N');
    
    apex.message.showErrors([{
        type: 'error',
        location: 'page',
        message: 'Помилка парсингу JSON: ' + e.message,
        unsafe: false
    }]);
}
```

### Приклад 2: Використання з різними принтерами

Якщо різні етикетки потрібно друкувати на різних принтерах:

```sql
-- PL/SQL формує етикетки з різними IP-адресами принтерів
DECLARE
    l_labels_json CLOB := '[';
    l_zpl CLOB;
    l_first BOOLEAN := TRUE;
    
    CURSOR c_labels IS
        SELECT 
            label_text,
            printer_ip,      -- Різні принтери для різних етикеток
            printer_port
        FROM your_labels_table
        WHERE condition = :P1_CONDITION;
BEGIN
    FOR rec IN c_labels LOOP
        l_zpl := '^XA^FO50,50^ADN,36,20^FD' || rec.label_text || '^FS^XZ';
        
        IF NOT l_first THEN
            l_labels_json := l_labels_json || ',';
        END IF;
        l_first := FALSE;
        
        l_labels_json := l_labels_json || '{';
        l_labels_json := l_labels_json || '"ZPL":"' || REPLACE(l_zpl, '"', '\"') || '",';
        l_labels_json := l_labels_json || '"IP":"' || rec.printer_ip || '",';
        l_labels_json := l_labels_json || '"PORT":' || rec.printer_port;
        l_labels_json := l_labels_json || '}';
    END LOOP;
    
    l_labels_json := l_labels_json || ']';
    :P1_LABELS_JSON := l_labels_json;
    :P1_EXECUTE_BATCH_PRINT := 'Y';
END;
```

JavaScript залишається таким самим - кожна етикетка в масиві може мати свій IP та порт.

### Приклад 3: Формування JSON масиву для однієї етикетки

Навіть для однієї етикетки використовуємо той самий підхід з JSON масивом:

```sql
-- PL/SQL Process для однієї етикетки
DECLARE
    l_labels_json CLOB;
    l_json_array JSON_ARRAY_T := JSON_ARRAY_T();
    l_json_obj JSON_OBJECT_T;
    l_zpl CLOB;
BEGIN
    -- Формуємо ZPL
    l_zpl := '^XA^FO50,50^ADN,36,20^FD' || :P1_LABEL_TEXT || '^FS^XZ';
    
    -- Створюємо JSON об'єкт
    l_json_obj := JSON_OBJECT_T();
    l_json_obj.put('ZPL', l_zpl);
    l_json_obj.put('IP', :P1_PRINTER_IP);
    l_json_obj.put('PORT', :P1_PRINTER_PORT);
    
    -- Додаємо в масив (навіть якщо етикетка одна)
    l_json_array.append(l_json_obj);
    
    :P1_LABELS_JSON := l_json_array.to_string;
    :P1_PRINT_LABEL_POOL := :PRINT_LABEL_POOL;
    :P1_PRINT_LABEL_SLEEP := :PRINT_LABEL_SLEEP;
    :P1_EXECUTE_BATCH_PRINT := 'Y';
END;
```

JavaScript код залишається таким самим - він працює з масивом незалежно від кількості етикеток.

---

## Обробка результатів та помилок

### Приклад 1: Детальна обробка помилок з sendLabelsInBatches

```javascript
// Отримуємо JSON масив етикеток, сформований в PL/SQL
var labelsJson = apex.item('P1_LABELS_JSON').getValue();
var labels = JSON.parse(labelsJson);

sendLabelsInBatches({
    labels: labels,           // JSON масив [{IP: "...", PORT: 9100, ZPL: "..."}, ...]
    poolSize: 10,
    sleepSeconds: 1,
    serverUrl: 'https://print-server.example.com/api/print',
    onSuccess: function(summary) {
        console.log('Відповідь від сервера:', summary);
        
        // Обробка результатів
        if (summary.success === summary.total) {
            apex.message.showSuccess('Всі етикетки успішно відправлені');
        } else if (summary.success > 0) {
            apex.message.showInfo('Відправлено: ' + summary.success + ' з ' + summary.total);
        }
        
        // Перевірка помилок
        if (summary.errors > 0) {
            console.warn('Помилки при друку:', summary.errors);
        }
    },
    onError: function(error) {
        console.error('Помилка друку:', error);
        
        // Різна обробка різних типів помилок
        var errorMessage = 'Помилка друку';
        
        if (error.status === 404) {
            errorMessage = 'Сервер друку не знайдено';
        } else if (error.status === 500) {
            errorMessage = 'Помилка на сервері друку';
        } else if (error.status === 0 || error.message.includes('fetch')) {
            errorMessage = 'Помилка підключення до сервера';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: errorMessage,
            unsafe: false
        }]);
        
        // Логування для дебагу
        if (error.details) {
            console.error('Деталі помилки:', error.details);
        }
    }
});
```

### Приклад 2: Обробка з Promise та retry логікою

```javascript
function printWithRetry(labelsJson, maxRetries, serverUrl, poolSize, sleepSeconds) {
    maxRetries = maxRetries || 3;
    var attempt = 0;
    
    function attemptPrint() {
        attempt++;
        
        // Отримуємо JSON масив з PL/SQL
        if (!labelsJson) {
            throw new Error('Немає етикеток для друку');
        }
        
        var labels = JSON.parse(labelsJson);
        
        return sendLabelsInBatches({
            labels: labels,
            poolSize: poolSize || 10,
            sleepSeconds: sleepSeconds || 1,
            serverUrl: serverUrl || 'https://print-server.example.com/api/print'
        })
        .catch(function(error) {
            if (attempt < maxRetries) {
                console.log('Спроба ' + attempt + ' не вдалася, повторюємо...');
                return new Promise(function(resolve) {
                    setTimeout(function() {
                        resolve(attemptPrint());
                    }, 1000 * attempt); // Експоненційна затримка
                });
            } else {
                throw error; // Викидаємо помилку після всіх спроб
            }
        });
    }
    
    return attemptPrint()
        .then(function(summary) {
            apex.message.showSuccess('Друк успішний (спроба ' + attempt + ')');
            return summary;
        })
        .catch(function(error) {
            apex.message.showErrors([{
                type: 'error',
                location: 'page',
                message: 'Друк не вдався після ' + maxRetries + ' спроб: ' + error.message,
                unsafe: false
            }]);
            throw error;
        });
}

// Використання
var labelsJson = apex.item('P1_LABELS_JSON').getValue();
printWithRetry(labelsJson, 3);
```

---

## Розширені приклади

### Приклад 1: Масовий друк кількох етикеток

**Примітка:** Завжди використовуємо `sendLabelsInBatches()` для друку, навіть якщо етикеток багато. Функція автоматично обробляє порції та паузи.

```javascript
function printMultipleLabels(labelsJson, serverUrl, poolSize, sleepSeconds) {
    // Отримуємо JSON масив етикеток з PL/SQL
    // PL/SQL вже сформував масив з полями IP, PORT, ZPL
    var labels = JSON.parse(labelsJson);
    
    return sendLabelsInBatches({
        labels: labels,           // JSON масив [{IP: "...", PORT: 9100, ZPL: "..."}, ...]
        poolSize: poolSize || 10,
        sleepSeconds: sleepSeconds || 1,
        serverUrl: serverUrl || 'https://print-server.example.com/api/print',
        onProgress: function(current, total, currentPool, totalPools) {
            console.log('Прогрес: ' + current + '/' + total);
        },
        onSuccess: function(summary) {
            if (summary.errors === 0) {
                apex.message.showSuccess('Всі ' + summary.total + ' етикеток відправлено');
            } else {
                apex.message.showInfo(
                    'Відправлено: ' + summary.success + ', помилок: ' + summary.errors
                );
            }
        },
        onError: function(error) {
            apex.message.showErrors([{
                type: 'error',
                location: 'page',
                message: 'Помилка: ' + error.message,
                unsafe: false
            }]);
        }
    });
}

// Використання
var labelsJson = apex.item('P1_LABELS_JSON').getValue();
printMultipleLabels(labelsJson);
```

### Приклад 2: Друк з перевіркою доступності принтера

```javascript
function printWithPrinterCheck(labelsJson, serverUrl, poolSize, sleepSeconds) {
    // Спочатку перевіряємо доступність принтера через сервер
    // (якщо ваш сервер підтримує такий endpoint)
    // Отримуємо IP та PORT з першої етикетки
    var labels = JSON.parse(labelsJson);
    if (!labels || labels.length === 0) {
        return Promise.reject(new Error('Немає етикеток для друку'));
    }
    
    var firstLabel = labels[0];
    var printerIP = firstLabel.IP || firstLabel.ip;
    var printerPort = firstLabel.PORT || firstLabel.port;
    
    return fetch('https://print-server.example.com/api/check-printer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ IP: printerIP, PORT: printerPort })
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('Принтер недоступний');
        }
        return response.json();
    })
    .then(function(checkResult) {
        if (!checkResult.available) {
            throw new Error('Принтер ' + printerIP + ' недоступний');
        }
        
        // Якщо принтер доступний - відправляємо на друк через sendLabelsInBatches
        return sendLabelsInBatches({
            labels: labels,           // JSON масив з PL/SQL
            poolSize: poolSize || 10,
            sleepSeconds: sleepSeconds || 1,
            serverUrl: serverUrl || 'https://print-server.example.com/api/print'
        });
    })
    .then(function(summary) {
        apex.message.showSuccess('Друк успішний');
        return summary;
    })
    .catch(function(error) {
        apex.message.showErrors([{
            type: 'error',
            location: 'page',
            message: error.message,
            unsafe: false
        }]);
        throw error;
    });
}
```

### Приклад 3: Друк з прогресс-баром для масового друку

```javascript
function printWithProgress(labelsJson, progressItemId, serverUrl, poolSize, sleepSeconds) {
    // Отримуємо JSON масив етикеток з PL/SQL
    var labels = JSON.parse(labelsJson);
    
    return sendLabelsInBatches({
        labels: labels,           // JSON масив [{IP: "...", PORT: 9100, ZPL: "..."}, ...]
        poolSize: poolSize || 10,
        sleepSeconds: sleepSeconds || 1,
        serverUrl: serverUrl || 'https://print-server.example.com/api/print',
        onProgress: function(current, total, currentPool, totalPools) {
            var percent = Math.round((current / total) * 100);
            if (progressItemId) {
                apex.item(progressItemId).setValue(percent + '% (' + current + '/' + total + ')');
            }
            console.log('Прогрес: ' + percent + '%');
        },
        onSuccess: function(summary) {
            apex.message.showInfo(
                'Завершено: ' + summary.success + ' з ' + summary.total + ' етикеток'
            );
            return summary;
        },
        onError: function(error) {
            apex.message.showErrors([{
                type: 'error',
                location: 'page',
                message: 'Помилка: ' + error.message,
                unsafe: false
            }]);
            throw error;
        }
    });
}
```

---

## Поради та найкращі практики

### Рекомендований підхід: Використання sendFromApexItem на сторінці 0

1. **Використовуйте `sendFromApexItem()` на сторінці 0** - це найпростіший та найзручніший спосіб інтеграції. Вся логіка перевірок та обробки виконується автоматично.

2. **Створіть Application Items на сторінці 0:**
   - `P0_PRINT_SERVER_URL` - URL сервера друку
   - `P0_PRINT_JS_ZPL` - JSON рядок з даними для друку

3. **Формат даних в P0_PRINT_JS_ZPL:**
   - Одна етикетка: `{"IP": "...", "PORT": 9100, "ZPL": "..."}`
   - Кілька етикеток: `[{...}, {...}]`
   - З параметрами: `{"labels": [...], "poolSize": 10, "sleepSeconds": 2}`
   - Підтримуються як великі (`IP`, `PORT`, `ZPL`), так і малі літери (`ip`, `port`, `zpl`)

4. **Функція автоматично:**
   - Визначає формат даних (одна етикетка, масив або об'єкт)
   - Використовує URL з `P0_PRINT_SERVER_URL` як є (без додавання `/api/print`)
   - Виконує всі перевірки та валідацію
   - Вибирає між `sendToPrintServer()` та `sendLabelsInBatches()` автоматично

### Альтернативний підхід: Прямий виклик функцій

Якщо потрібен більш гнучкий контроль:

1. **Завжди використовуйте `sendLabelsInBatches()`** - навіть для однієї етикетки формуйте масив з одного елемента. Це забезпечує уніфікований підхід та підтримку порційного друку.

2. **PL/SQL завжди формує JSON масив** - навіть для однієї етикетки зберігайте її як масив `[{IP: "...", PORT: 9100, ZPL: "..."}]`. Використовуйте великі літери для полів (IP, PORT, ZPL).

3. **JavaScript тільки передає параметри** - функція `sendLabelsInBatches()` приймає 4 основні параметри: JSON масив етикеток, Server URL, розмір порції та паузу між порціями. Всі дані про IP, PORT та ZPL вже містяться в JSON масиві з PL/SQL.

### Загальні рекомендації

4. **Зберігайте параметри пулу в Application Items** - `APP_PRINT_LABEL_POOL` та `APP_PRINT_LABEL_SLEEP` для глобальних налаштувань.

5. **Зберігайте URL сервера в Application Item** - це дозволить легко змінювати сервер для всього додатку.

6. **Використовуйте функції-обгортки** - це спростить код та зробить його більш читабельним.

7. **Завжди обробляйте помилки** - користувач повинен знати, що сталося. Дивіться приклади в `api-responses-example.md`.

8. **Логуйте помилки в консоль** - це допоможе при дебагу.

9. **Додавайте індикатори завантаження** - користувач повинен бачити, що процес виконується.

10. **Використовуйте callback `onProgress`** - для відображення прогресу обробки етикеток.

### Додаткова інформація

- **Приклади відповідей API:** Дивіться файл `api-responses-example.md` для детальних прикладів всіх можливих відповідей від сервера.
- **Формати даних:** Функція `sendFromApexItem()` підтримує різні формати JSON даних та автоматично їх нормалізує.

