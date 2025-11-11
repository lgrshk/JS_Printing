/**
 * Oracle APEX Print Service
 * JavaScript модуль для відправки ZPL-команд на принтери через проміжний веб-сервер
 * 
 * @version 1.1.0
 * @author JS_Printing System
 */

(function(window) {
    'use strict';

    /**
     * Парсить ZPL код для визначення розмірів етикетки
     * 
     * @param {string} zpl - ZPL код для аналізу
     * @returns {Object} Об'єкт з розмірами {width, height, dpmm} в дюймах
     */
    function parseZPLDimensions(zpl) {
        var defaultDpmm = 8;
        var defaultWidth = 4; // дюйми
        var defaultHeight = 6; // дюйми
        
        if (!zpl || typeof zpl !== 'string') {
            return {
                width: defaultWidth,
                height: defaultHeight,
                dpmm: defaultDpmm
            };
        }
        
        var width = null;
        var height = null;
        var dpmm = defaultDpmm;
        
        // Шукаємо ^PW (Print Width) - ширина етикетки в точках
        var pwMatch = zpl.match(/\^PW(\d+)/i);
        if (pwMatch && pwMatch[1]) {
            var widthPoints = parseInt(pwMatch[1], 10);
            if (!isNaN(widthPoints) && widthPoints > 0) {
                // Конвертуємо точки в дюйми: точки / dpmm / 25.4, округлюємо вгору
                width = Math.ceil(widthPoints / dpmm / 25.4);
            }
        }
        
        // Шукаємо ^LL (Label Length) - довжина етикетки в точках
        var llMatch = zpl.match(/\^LL(\d+)/i);
        if (llMatch && llMatch[1]) {
            var heightPoints = parseInt(llMatch[1], 10);
            if (!isNaN(heightPoints) && heightPoints > 0) {
                // Конвертуємо точки в дюйми: точки / dpmm / 25.4, округлюємо вгору
                height = Math.ceil(heightPoints / dpmm / 25.4);
            }
        }
        
        // Якщо розміри не знайдено, аналізуємо координати елементів як fallback
        if (width === null || height === null) {
            var maxX = 0;
            var maxY = 0;
            
            // Шукаємо координати в командах ^FO (Field Origin) та ^FT (Field Typeset)
            var coordMatches = zpl.match(/\^(?:FO|FT)(\d+),(\d+)/gi);
            if (coordMatches) {
                for (var i = 0; i < coordMatches.length; i++) {
                    var coordMatch = coordMatches[i].match(/(\d+),(\d+)/);
                    if (coordMatch) {
                        var x = parseInt(coordMatch[1], 10);
                        var y = parseInt(coordMatch[2], 10);
                        if (!isNaN(x) && x > maxX) maxX = x;
                        if (!isNaN(y) && y > maxY) maxY = y;
                    }
                }
                
                // Додаємо відступи для тексту/елементів (приблизно 200 точок)
                if (maxX > 0) {
                    maxX += 200;
                    if (width === null) {
                        width = Math.ceil(maxX / dpmm / 25.4);
                    }
                }
                if (maxY > 0) {
                    maxY += 200;
                    if (height === null) {
                        height = Math.ceil(maxY / dpmm / 25.4);
                    }
                }
            }
        }
        
        // Використовуємо дефолтні значення якщо не знайдено
        if (width === null || width < 1) {
            width = defaultWidth;
        }
        if (height === null || height < 1) {
            height = defaultHeight;
        }
        
        return {
            width: width,
            height: height,
            dpmm: dpmm
        };
    }

    /**
     * Генерує PDF з ZPL коду через Labelary API
     * 
     * @param {string} zpl - ZPL код для конвертації
     * @param {Function} [onSuccess] - Callback при успішній генерації PDF
     * @param {Function} [onError] - Callback при помилці
     * @returns {Promise} Promise з PDF blob
     */
    function generatePDFFromZPL(zpl, onSuccess, onError) {
        return new Promise(function(resolve, reject) {
            if (!zpl || typeof zpl !== 'string' || zpl.trim() === '') {
                var error = new Error('ZPL код не вказаний або порожній');
                if (typeof onError === 'function') {
                    onError(error);
                }
                reject(error);
                return;
            }
            
            // Визначаємо розміри етикетки
            var dimensions = parseZPLDimensions(zpl);
            var dpmm = dimensions.dpmm;
            var width = dimensions.width;
            var height = dimensions.height;
            
            // Формуємо URL для Labelary API (використовуємо HTTPS для сумісності з HTTPS сторінками)
            var labelaryUrl = 'https://api.labelary.com/v1/printers/' + dpmm + 'dpmm/labels/' + width + 'x' + height + '/0/';
            
            // Відправляємо POST запит
            fetch(labelaryUrl, {
                method: 'POST',
                headers: {
                    'Accept': 'application/pdf',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: zpl
            })
            .then(function(response) {
                if (!response.ok) {
                    var error = new Error('Помилка Labelary API: HTTP ' + response.status + ' ' + response.statusText);
                    error.status = response.status;
                    error.statusText = response.statusText;
                    
                    // Спробувати отримати деталі помилки
                    return response.text().then(function(text) {
                        try {
                            error.details = JSON.parse(text);
                        } catch (e) {
                            error.details = text;
                        }
                        throw error;
                    });
                }
                
                // Отримуємо PDF як blob
                return response.blob();
            })
            .then(function(pdfBlob) {
                // Створюємо blob URL
                var pdfUrl = URL.createObjectURL(pdfBlob);
                
                // Відкриваємо PDF в новій вкладці
                var pdfWindow = window.open(pdfUrl, '_blank');
                
                if (!pdfWindow) {
                    // Якщо popup заблоковано, спробуємо інший спосіб
                    var error = new Error('Не вдалося відкрити PDF. Можливо, popup заблоковано браузером.');
                    if (typeof onError === 'function') {
                        onError(error);
                    }
                    reject(error);
                    return;
                }
                
                // Результат успішної генерації
                var result = {
                    success: true,
                    pdfUrl: pdfUrl,
                    pdfBlob: pdfBlob,
                    dimensions: dimensions,
                    message: 'PDF успішно згенеровано та відкрито'
                };
                
                if (typeof onSuccess === 'function') {
                    onSuccess(result);
                }
                resolve(result);
            })
            .catch(function(error) {
                var errorMessage = 'Помилка при генерації PDF';
                
                if (error instanceof TypeError && error.message.includes('fetch')) {
                    errorMessage = 'Помилка мережевого з\'єднання з Labelary API. Перевірте підключення до інтернету.';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                var pdfError = {
                    message: errorMessage,
                    originalError: error,
                    status: error.status,
                    statusText: error.statusText,
                    details: error.details
                };
                
                if (typeof onError === 'function') {
                    onError(pdfError);
                }
                reject(pdfError);
            });
        });
    }

    /**
     * Відправляє ZPL-команди на принтер через проміжний веб-сервер
     * 
     * @param {Object} options - Параметри для відправки на друк
     * @param {string} options.ip - IP-адреса принтера
     * @param {number} options.port - Порт принтера (зазвичай 9100)
     * @param {string} options.zpl - ZPL команди для друку
     * @param {string} options.serverUrl - URL проміжного сервера (з HTTPS)
     * @param {Function} [options.onSuccess] - Callback функція при успішному друку
     * @param {Function} [options.onError] - Callback функція при помилці
     * @returns {Promise} Promise, який резолвиться при успішному відправленні або реджектиться при помилці
     * 
     * @example
     * sendToPrintServer({
     *   ip: '192.168.1.100',
     *   port: 9100,
     *   zpl: '^XA^FO50,50^ADN,36,20^FDHello World^FS^XZ',
     *   serverUrl: 'https://print-server.example.com/api/print',
     *   onSuccess: function(response) {
     *     console.log('Друк успішний:', response);
     *   },
     *   onError: function(error) {
     *     console.error('Помилка друку:', error);
     *   }
     * });
     */
    function sendToPrintServer(options) {
        return new Promise(function(resolve, reject) {
            // Валідація параметрів
            if (!options) {
                var error = new Error('Параметри не передані');
                if (options && typeof options.onError === 'function') {
                    options.onError(error);
                }
                reject(error);
                return;
            }

            var ip = options.ip;
            var port = options.port;
            var zpl = options.zpl;
            var serverUrl = options.serverUrl;
            var onSuccess = options.onSuccess;
            var onError = options.onError;

            // Перевірка обов'язкових параметрів
            if (!ip || typeof ip !== 'string' || ip.trim() === '') {
                var error = new Error('IP-адреса принтера не вказана або невалідна');
                if (typeof onError === 'function') {
                    onError(error);
                }
                reject(error);
                return;
            }

            // Перевірка чи це PDF режим
            if (ip.toUpperCase().trim() === 'PDF') {
                // Генеруємо PDF через Labelary API
                return generatePDFFromZPL(zpl, onSuccess, onError)
                    .then(function(result) {
                        resolve(result);
                    })
                    .catch(function(error) {
                        reject(error);
                    });
            }

            if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
                var error = new Error('Порт принтера не вказаний або невалідний (має бути від 1 до 65535)');
                if (typeof onError === 'function') {
                    onError(error);
                }
                reject(error);
                return;
            }

            if (!zpl || typeof zpl !== 'string' || zpl.trim() === '') {
                var error = new Error('ZPL команди не вказані або порожні');
                if (typeof onError === 'function') {
                    onError(error);
                }
                reject(error);
                return;
            }

            if (!serverUrl || typeof serverUrl !== 'string' || serverUrl.trim() === '') {
                var error = new Error('URL проміжного сервера не вказаний або невалідний');
                if (typeof onError === 'function') {
                    onError(error);
                }
                reject(error);
                return;
            }

            // Перевірка, що serverUrl починається з https://
            if (!serverUrl.toLowerCase().startsWith('https://')) {
                var error = new Error('URL проміжного сервера повинен використовувати HTTPS протокол');
                if (typeof onError === 'function') {
                    onError(error);
                }
                reject(error);
                return;
            }

            // Формування JSON об'єкта
            var printData = {
                IP: ip.trim(),
                PORT: port,
                ZPL: zpl
            };

            // Відправка запиту на проміжний сервер
            fetch(serverUrl.trim(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(printData)
            })
            .then(function(response) {
                // Перевірка HTTP статусу
                if (!response.ok) {
                    var error = new Error('Помилка від сервера: HTTP ' + response.status + ' ' + response.statusText);
                    error.status = response.status;
                    error.statusText = response.statusText;
                    
                    // Спробувати отримати деталі помилки з відповіді
                    return response.text().then(function(text) {
                        try {
                            var errorData = JSON.parse(text);
                            error.details = errorData;
                        } catch (e) {
                            error.details = text;
                        }
                        throw error;
                    });
                }

                // Спроба парсити JSON відповідь
                return response.json().catch(function() {
                    // Якщо відповідь не JSON, повертаємо текст
                    return response.text().then(function(text) {
                        return { message: text, success: true };
                    });
                }).then(function(data) {
                    // Зберігаємо HTTP статус для подальшого використання
                    data._httpStatus = response.status;
                    data._httpStatusText = response.statusText;
                    return data;
                });
            })
            .then(function(data) {
                // Перевірка статусу в тілі відповіді (навіть якщо HTTP 200)
                if (data && data.status === 'error') {
                    var error = new Error(data.message || 'Помилка від сервера');
                    error.status = data._httpStatus;
                    error.statusText = data._httpStatusText;
                    error.details = data;
                    throw error;
                }
                
                // Успішна відправка
                if (typeof onSuccess === 'function') {
                    onSuccess(data);
                }
                resolve(data);
            })
            .catch(function(error) {
                // Обробка помилок
                var errorMessage = 'Помилка при відправці на друк';
                
                if (error instanceof TypeError && error.message.includes('fetch')) {
                    errorMessage = 'Помилка мережевого з\'єднання. Перевірте підключення до інтернету та доступність сервера.';
                } else if (error.message) {
                    errorMessage = error.message;
                }

                var printError = {
                    message: errorMessage,
                    originalError: error,
                    status: error.status,
                    statusText: error.statusText,
                    details: error.details
                };

                if (typeof onError === 'function') {
                    onError(printError);
                }
                reject(printError);
            });
        });
    }

    /**
     * Відправляє множину ZPL-етикеток порціями з паузами між порціями
     * 
     * @param {Object} options - Параметри для порційного друку
     * @param {Array} options.labels - Масив об'єктів з етикетками з PL/SQL [{IP: "...", PORT: 9100, ZPL: "..."}, ...]
     * @param {number} options.poolSize - Кількість етикеток в одній порції (PRINT_LABEL_POOL)
     * @param {number} options.sleepSeconds - Пауза в секундах між порціями (PRINT_LABEL_SLEEP)
     * @param {string} options.serverUrl - URL проміжного сервера (з HTTPS)
     * @param {Function} [options.onProgress] - Callback при обробці кожної етикетки (current, total, currentPool, totalPools)
     * @param {Function} [options.onPoolComplete] - Callback при завершенні порції (poolNumber, totalPools)
     * @param {Function} [options.onSuccess] - Callback при успішному завершенні всіх етикеток
     * @param {Function} [options.onError] - Callback при помилці
     * @returns {Promise} Promise, який резолвиться при завершенні всіх етикеток
     * 
     * @example
     * sendLabelsInBatches({
     *   labels: [
     *     {IP: '192.168.1.100', PORT: 9100, ZPL: '^XA^FO50,50^ADN,36,20^FDLabel 1^FS^XZ'},
     *     {IP: '192.168.1.100', PORT: 9100, ZPL: '^XA^FO50,50^ADN,36,20^FDLabel 2^FS^XZ'}
     *   ],
     *   poolSize: 10,
     *   sleepSeconds: 2,
     *   serverUrl: 'https://print-server.example.com/api/print',
     *   onProgress: function(current, total, currentPool, totalPools) {
     *     console.log('Прогрес: ' + current + '/' + total);
     *   },
     *   onSuccess: function(summary) {
     *     console.log('Відправлено: ' + summary.success + ' з ' + summary.total);
     *   }
     * });
     */
    function sendLabelsInBatches(options) {
        return new Promise(function(resolve, reject) {
            // Валідація параметрів
            if (!options || !options.labels || !Array.isArray(options.labels) || options.labels.length === 0) {
                var error = new Error('Масив етикеток не вказаний або порожній');
                if (options && typeof options.onError === 'function') {
                    options.onError(error);
                }
                reject(error);
                return;
            }

            var labels = options.labels;
            var poolSize = options.poolSize || 10;
            var sleepSeconds = options.sleepSeconds || 1;
            var serverUrl = options.serverUrl;
            var onProgress = options.onProgress;
            var onPoolComplete = options.onPoolComplete;
            var onSuccess = options.onSuccess;
            var onError = options.onError;

            if (!serverUrl || typeof serverUrl !== 'string' || serverUrl.trim() === '') {
                var error = new Error('URL проміжного сервера не вказаний');
                if (typeof onError === 'function') {
                    onError(error);
                }
                reject(error);
                return;
            }

            // Перевірка, що serverUrl починається з https://
            if (!serverUrl.toLowerCase().startsWith('https://')) {
                var error = new Error('URL проміжного сервера повинен використовувати HTTPS протокол');
                if (typeof onError === 'function') {
                    onError(error);
                }
                reject(error);
                return;
            }

            var totalLabels = labels.length;
            var totalPools = Math.ceil(totalLabels / poolSize);
            var results = [];
            var errors = [];

            // Перевірка чи перша етикетка має IP="PDF"
            var firstLabel = labels[0];
            var firstIp = (firstLabel.IP || firstLabel.ip || '').toString().toUpperCase().trim();
            if (firstIp === 'PDF') {
                // Обробляємо тільки першу етикетку для PDF
                var firstZpl = firstLabel.ZPL || firstLabel.zpl;
                if (!firstZpl) {
                    var error = new Error('Перша етикетка: ZPL команди не вказані');
                    if (typeof onError === 'function') {
                        onError(error);
                    }
                    reject(error);
                    return;
                }
                
                generatePDFFromZPL(firstZpl, function(result) {
                    var summary = {
                        total: totalLabels,
                        success: 1,
                        errors: 0,
                        results: [{ index: 0, success: true, response: result }],
                        errors: [],
                        message: 'Оброблено тільки перша етикетка (PDF режим). Інші етикетки ігноровано.'
                    };
                    
                    if (typeof onSuccess === 'function') {
                        onSuccess(summary);
                    }
                    resolve(summary);
                }, function(error) {
                    var summary = {
                        total: totalLabels,
                        success: 0,
                        errors: 1,
                        results: [{ index: 0, success: false, error: error }],
                        errors: [{ index: 0, success: false, error: error }]
                    };
                    
                    if (typeof onError === 'function') {
                        onError(error);
                    }
                    reject(error);
                });
                return;
            }

            // Функція для відправки однієї етикетки
            function sendSingleLabel(label, index) {
                // Підтримка як великих літер (з PL/SQL), так і малих (для сумісності)
                var ip = label.IP || label.ip;
                var port = label.PORT || label.port;
                var zpl = label.ZPL || label.zpl;

                if (!ip || !zpl) {
                    var error = new Error('Етикетка ' + (index + 1) + ': не вказано IP або ZPL');
                    var errorResult = { index: index, success: false, error: error };
                    errors.push(errorResult);
                    return Promise.resolve(errorResult);
                }

                // Перевірка порту
                if (!port || (typeof port !== 'number' && typeof port !== 'string')) {
                    var error = new Error('Етикетка ' + (index + 1) + ': не вказано PORT');
                    var errorResult = { index: index, success: false, error: error };
                    errors.push(errorResult);
                    return Promise.resolve(errorResult);
                }

                // Конвертуємо порт в число якщо потрібно
                port = parseInt(port);
                if (isNaN(port) || port < 1 || port > 65535) {
                    var error = new Error('Етикетка ' + (index + 1) + ': невалідний PORT (має бути від 1 до 65535)');
                    var errorResult = { index: index, success: false, error: error };
                    errors.push(errorResult);
                    return Promise.resolve(errorResult);
                }

                return sendToPrintServer({
                    ip: ip,
                    port: port,
                    zpl: zpl,
                    serverUrl: serverUrl
                })
                .then(function(response) {
                    // Перевірка статусу в тілі відповіді
                    if (response && response.status === 'error') {
                        // Це помилка, не успіх
                        var error = new Error(response.message || 'Помилка від сервера');
                        error.details = response;
                        var result = { index: index, success: false, error: error };
                        errors.push(result);
                        results.push(result);
                        
                        if (typeof onProgress === 'function') {
                            onProgress(index + 1, totalLabels, Math.floor(index / poolSize) + 1, totalPools);
                        }
                        
                        // Прокидаємо помилку для зупинки обробки
                        throw error;
                    }
                    
                    var result = { index: index, success: true, response: response };
                    results.push(result);
                    
                    if (typeof onProgress === 'function') {
                        onProgress(index + 1, totalLabels, Math.floor(index / poolSize) + 1, totalPools);
                    }
                    
                    return result;
                })
                .catch(function(error) {
                    var result = { index: index, success: false, error: error };
                    errors.push(result);
                    results.push(result);
                    
                    if (typeof onProgress === 'function') {
                        onProgress(index + 1, totalLabels, Math.floor(index / poolSize) + 1, totalPools);
                    }
                    
                    // Прокидаємо помилку далі для зупинки обробки
                    throw error;
                });
            }

            // Функція для паузи
            function sleep(seconds) {
                return new Promise(function(resolve) {
                    setTimeout(resolve, seconds * 1000);
                });
            }

            // Функція для обробки порції
            function processPool(poolNumber) {
                var poolStart = (poolNumber - 1) * poolSize;
                var poolEnd = Math.min(poolStart + poolSize, totalLabels);
                var poolLabels = labels.slice(poolStart, poolEnd);
                
                // Відправляємо всі етикетки в порції послідовно
                // Використовуємо послідовну обробку для можливості зупинки при першій помилці
                var processSequentially = function(index) {
                    if (index >= poolLabels.length) {
                        // Всі етикетки в порції оброблені
                        // Перевіряємо чи є помилки в порції
                        var poolErrors = results.slice(poolStart, poolEnd)
                            .filter(function(r) { return !r.success; });
                        
                        // Якщо є помилки - зупиняємо обробку
                        if (poolErrors.length > 0) {
                            var firstError = poolErrors[0];
                            var errorMessage = 'Помилка при відправці етикетки ' + (firstError.index + 1);
                            if (firstError.error && firstError.error.message) {
                                errorMessage = firstError.error.message;
                            } else if (firstError.error && firstError.error.details && firstError.error.details.message) {
                                errorMessage = firstError.error.details.message;
                            }
                            
                            var error = new Error(errorMessage);
                            error.firstError = firstError;
                            error.errors = poolErrors;
                            error.results = results;
                            error.total = totalLabels;
                            error.processed = results.length;
                            
                            if (typeof onError === 'function') {
                                onError(error);
                            }
                            reject(error);
                            return Promise.reject(error);
                        }
                        
                        // Викликаємо callback завершення порції
                        if (typeof onPoolComplete === 'function') {
                            onPoolComplete(poolNumber, totalPools);
                        }

                        // Якщо це не остання порція - робимо паузу
                        if (poolNumber < totalPools) {
                            return sleep(sleepSeconds).then(function() {
                                return processPool(poolNumber + 1);
                            });
                        } else {
                            // Всі порції оброблені
                            var summary = {
                                total: totalLabels,
                                success: results.filter(function(r) { return r.success; }).length,
                                errors: errors.length,
                                results: results,
                                errors: errors
                            };

                            if (typeof onSuccess === 'function') {
                                onSuccess(summary);
                            }
                            resolve(summary);
                            return Promise.resolve(summary);
                        }
                    }
                    
                    var globalIndex = poolStart + index;
                    return sendSingleLabel(poolLabels[index], globalIndex)
                        .then(function() {
                            // Продовжуємо з наступною етикеткою
                            return processSequentially(index + 1);
                        })
                        .catch(function(error) {
                            // Помилка вже оброблена в sendSingleLabel і додана в results
                            // Зупиняємо обробку
                            var poolErrors = results.slice(poolStart, poolEnd)
                                .filter(function(r) { return !r.success; });
                            
                            if (poolErrors.length > 0) {
                                var firstError = poolErrors[0];
                                var errorMessage = 'Помилка при відправці етикетки ' + (firstError.index + 1);
                                if (firstError.error && firstError.error.message) {
                                    errorMessage = firstError.error.message;
                                } else if (firstError.error && firstError.error.details && firstError.error.details.message) {
                                    errorMessage = firstError.error.details.message;
                                }
                                
                                var finalError = new Error(errorMessage);
                                finalError.firstError = firstError;
                                finalError.errors = poolErrors;
                                finalError.results = results;
                                finalError.total = totalLabels;
                                finalError.processed = results.length;
                                
                                if (typeof onError === 'function') {
                                    onError(finalError);
                                }
                                reject(finalError);
                                return Promise.reject(finalError);
                            }
                            
                            // Якщо помилка не оброблена - прокидаємо далі
                            throw error;
                        });
                };
                
                return processSequentially(0);
            }

            // Починаємо обробку з першої порції
            processPool(1);
        });
    }

    /**
     * Функція-обгортка для використання з APEX Dynamic Action
     * Автоматично обробляє одну етикетку або масив етикеток з порційним друком
     * 
     * @param {Object} options - Параметри для відправки
     * @param {string} options.zplData - JSON рядок з P0_PRINT_JS_ZPL (може містити одну етикетку, масив або об'єкт з labels)
     * @param {string} options.serverUrl - URL проміжного сервера з P0_PRINT_SERVER_URL
     * @param {Function} [options.onSuccess] - Callback при успішному завершенні
     * @param {Function} [options.onError] - Callback при помилці
     * @returns {Promise} Promise, який резолвиться при завершенні
     * 
     * @example
     * sendFromApexItem({
     *   zplData: apex.item('P0_PRINT_JS_ZPL').getValue(),
     *   serverUrl: apex.item('P0_PRINT_SERVER_URL').getValue()
     * });
     */
    function sendFromApexItem(options) {
        return new Promise(function(resolve, reject) {
            // Валідація параметрів
            if (!options) {
                var error = new Error('Параметри не передані');
                if (options && typeof options.onError === 'function') {
                    options.onError(error);
                }
                reject(error);
                return;
            }

            var zplData = options.zplData;
            var serverUrl = options.serverUrl;
            var onSuccess = options.onSuccess;
            var onError = options.onError;

            // Перевірка обов'язкових полів
            if (!zplData || typeof zplData !== 'string' || zplData.trim() === '') {
                var error = new Error('ZPL дані не вказані');
                if (typeof onError === 'function') {
                    onError(error);
                }
                reject(error);
                return;
            }

            if (!serverUrl || typeof serverUrl !== 'string' || serverUrl.trim() === '') {
                var error = new Error('URL сервера не вказаний');
                if (typeof onError === 'function') {
                    onError(error);
                }
                reject(error);
                return;
            }

            // Парсимо JSON
            var printData;
            try {
                printData = JSON.parse(zplData);
            } catch (e) {
                var error = new Error('Помилка парсингу JSON: ' + e.message);
                if (typeof onError === 'function') {
                    onError(error);
                }
                reject(error);
                return;
            }

            // Використовуємо URL як є (без додавання /api/print)
            // Користувач сам вказує повний URL в P0_PRINT_SERVER_URL
            var apiUrl = serverUrl.trim();

            // Визначаємо масив етикеток
            var labels = [];
            if (Array.isArray(printData)) {
                labels = printData;
            } else if (printData.labels && Array.isArray(printData.labels)) {
                labels = printData.labels;
            } else {
                labels = [printData];
            }

            // Перевірка що є хоча б одна етикетка
            if (labels.length === 0) {
                var error = new Error('Не знайдено етикеток для друку');
                if (typeof onError === 'function') {
                    onError(error);
                }
                reject(error);
                return;
            }

            // Перевірка чи перша етикетка має IP="PDF" - якщо так, обробляємо тільки її
            var firstLabel = labels[0];
            var firstIp = (firstLabel.IP || firstLabel.ip || '').toString().toUpperCase().trim();
            if (firstIp === 'PDF') {
                // Обробляємо тільки першу етикетку для PDF
                var firstZpl = firstLabel.ZPL || firstLabel.zpl;
                if (!firstZpl) {
                    var error = new Error('Перша етикетка: ZPL команди не вказані');
                    if (typeof onError === 'function') {
                        onError(error);
                    }
                    reject(error);
                    return;
                }
                
                // Генеруємо PDF тільки для першої етикетки
                generatePDFFromZPL(firstZpl, function(result) {
                    var summary = {
                        total: labels.length,
                        success: 1,
                        errors: 0,
                        response: result,
                        message: 'Оброблено тільки перша етикетка (PDF режим). Інші етикетки ігноровано.'
                    };
                    
                    if (typeof onSuccess === 'function') {
                        onSuccess(summary);
                    }
                    resolve(summary);
                }, function(error) {
                    if (typeof onError === 'function') {
                        onError(error);
                    }
                    reject(error);
                });
                return;
            }

            // Валідація та нормалізація етикеток
            for (var i = 0; i < labels.length; i++) {
                var label = labels[i];
                var ip = label.IP || label.ip;
                var port = label.PORT || label.port;
                var zpl = label.ZPL || label.zpl;

                if (!ip) {
                    var error = new Error('Етикетка ' + (i + 1) + ': IP адреса не вказана');
                    if (typeof onError === 'function') {
                        onError(error);
                    }
                    reject(error);
                    return;
                }

                if (!port) {
                    var error = new Error('Етикетка ' + (i + 1) + ': PORT не вказаний');
                    if (typeof onError === 'function') {
                        onError(error);
                    }
                    reject(error);
                    return;
                }

                if (!zpl) {
                    var error = new Error('Етикетка ' + (i + 1) + ': ZPL команди не вказані');
                    if (typeof onError === 'function') {
                        onError(error);
                    }
                    reject(error);
                    return;
                }

                // Конвертуємо порт в число
                port = parseInt(port);
                if (isNaN(port) || port < 1 || port > 65535) {
                    var error = new Error('Етикетка ' + (i + 1) + ': невалідний PORT (має бути від 1 до 65535)');
                    if (typeof onError === 'function') {
                        onError(error);
                    }
                    reject(error);
                    return;
                }

                // Нормалізуємо формат (використовуємо великі літери для сумісності)
                labels[i] = {
                    IP: ip,
                    PORT: port,
                    ZPL: zpl
                };
            }

            // Отримуємо параметри порційного друку
            var poolSize = printData.poolSize || printData.PRINT_LABEL_POOL || 10;
            var sleepSeconds = printData.sleepSeconds || printData.PRINT_LABEL_SLEEP || 1;
            poolSize = parseInt(poolSize) || 10;
            sleepSeconds = parseInt(sleepSeconds) || 1;

            // Якщо одна етикетка - використовуємо sendToPrintServer
            if (labels.length === 1) {
                var label = labels[0];
                sendToPrintServer({
                    ip: label.IP,
                    port: label.PORT,
                    zpl: label.ZPL,
                    serverUrl: apiUrl,
                    onSuccess: function(response) {
                        if (typeof onSuccess === 'function') {
                            onSuccess({ total: 1, success: 1, errors: 0, response: response });
                        }
                        resolve({ total: 1, success: 1, errors: 0, response: response });
                    },
                    onError: function(error) {
                        if (typeof onError === 'function') {
                            onError(error);
                        }
                        reject(error);
                    }
                });
            } else {
                // Якщо багато етикеток - використовуємо sendLabelsInBatches
                sendLabelsInBatches({
                    labels: labels,
                    poolSize: poolSize,
                    sleepSeconds: sleepSeconds,
                    serverUrl: apiUrl,
                    onProgress: function(current, total, currentPool, totalPools) {
                        // Можна додати callback для прогресу якщо потрібно
                    },
                    onPoolComplete: function(poolNumber, totalPools) {
                        // Можна додати callback для завершення порції якщо потрібно
                    },
                    onSuccess: function(summary) {
                        if (typeof onSuccess === 'function') {
                            onSuccess(summary);
                        }
                        resolve(summary);
                    },
                    onError: function(error) {
                        if (typeof onError === 'function') {
                            onError(error);
                        }
                        reject(error);
                    }
                });
            }
        });
    }

    // Експорт функцій для глобального використання в APEX
    window.sendToPrintServer = sendToPrintServer;
    window.sendLabelsInBatches = sendLabelsInBatches;
    window.sendFromApexItem = sendFromApexItem;

    // Підтримка CommonJS (якщо потрібно)
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = {
            sendToPrintServer: sendToPrintServer,
            sendLabelsInBatches: sendLabelsInBatches,
            sendFromApexItem: sendFromApexItem
        };
    }

})(window || global);

