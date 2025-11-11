/**
 * JavaScript для веб-інтерфейсу налаштувань
 */

// Завантаження конфігурації при завантаженні сторінки
document.addEventListener('DOMContentLoaded', function() {
    loadConfig();
    checkServiceStatus();
    loadScanData();
});

/**
 * Завантаження збережених даних сканування
 */
async function loadScanData() {
    try {
        const response = await fetch('/api/printers/scan-data');
        const data = await response.json();
        
        if (data.status === 'success' && data.scan_data) {
            const scanData = data.scan_data;
            
            // Заповнюємо поля мережі та порту
            const networkCidrInput = document.getElementById('networkCidr');
            const scanPortInput = document.getElementById('scanPort');
            
            if (networkCidrInput && scanData.network) {
                networkCidrInput.value = scanData.network;
            }
            
            if (scanPortInput && scanData.port) {
                scanPortInput.value = scanData.port;
            }
            
            // Відображаємо збережений список принтерів, якщо він є
            if (scanData.printers && scanData.printers.length > 0) {
                displayPrinters(scanData.printers);
            }
        }
    } catch (error) {
        console.error('Помилка завантаження даних сканування:', error);
        // Не показуємо помилку користувачу, оскільки це не критично
    }
}

/**
 * Відображення списку принтерів
 */
function displayPrinters(printers) {
    const printersList = document.getElementById('printersList');
    
    if (!printersList) {
        return;
    }
    
    if (printers.length === 0) {
        printersList.innerHTML = '<p class="empty-message">Принтери не знайдено</p>';
        return;
    }
    
    // Створюємо список принтерів
    printersList.innerHTML = '';
    printers.forEach(printer => {
        const printerItem = document.createElement('div');
        printerItem.className = 'printer-item';
        printerItem.innerHTML = `
            <div class="printer-info">
                <div class="printer-ip">${printer.ip}</div>
                <div class="printer-port">Порт: ${printer.port}</div>
            </div>
            <div class="printer-actions">
                <button class="btn-test-print" onclick="testPrint('${printer.ip}', ${printer.port}, this)">
                    Тестовий друк
                </button>
                <button class="btn-settings" onclick="window.open('http://${printer.ip}', '_blank')">
                    Налаштування
                </button>
            </div>
        `;
        printersList.appendChild(printerItem);
    });
}

/**
 * Перемикання між вкладками
 */
function switchTab(tabName) {
    // Приховуємо всі вкладки
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Прибираємо активний стан з усіх кнопок
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Показуємо вибрану вкладку
    const selectedContent = document.getElementById(`tab-content-${tabName}`);
    const selectedButton = document.getElementById(`tab-${tabName}`);
    
    if (selectedContent && selectedButton) {
        selectedContent.classList.add('active');
        selectedButton.classList.add('active');
    }
}

/**
 * Сканування мережі на пошук принтерів
 */
async function scanPrinters() {
    const scanBtn = document.getElementById('scanBtn');
    const scanStatus = document.getElementById('scanStatus');
    const printersList = document.getElementById('printersList');
    const networkCidrInput = document.getElementById('networkCidr');
    const scanPortInput = document.getElementById('scanPort');
    
    // Отримуємо значення з полів вводу
    const networkCidr = networkCidrInput.value.trim();
    let port = parseInt(scanPortInput.value);
    
    // Валідація порту
    if (isNaN(port) || port < 1 || port > 65535) {
        showStatus('Порт повинен бути числом від 1 до 65535', 'error');
        return;
    }
    
    // Валідація CIDR (якщо вказано)
    if (networkCidr && !/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(networkCidr)) {
        showStatus('Невірний формат мережі. Використовуйте формат: 192.168.1.0/24', 'error');
        return;
    }
    
    // Блокуємо кнопку під час сканування
    scanBtn.disabled = true;
    scanBtn.textContent = 'Сканування...';
    scanStatus.textContent = networkCidr ? `Сканування мережі ${networkCidr}...` : 'Сканування мережі...';
    scanStatus.className = 'scan-status scanning';
    printersList.innerHTML = '<p class="empty-message">Сканування...</p>';
    
    try {
        // Формуємо запит з параметрами
        const requestBody = {
            port: port
        };
        
        // Додаємо мережу, якщо вказано
        if (networkCidr) {
            requestBody.network = networkCidr;
        }
        
        const response = await fetch('/api/printers/scan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            const printers = data.printers || [];
            
            if (printers.length === 0) {
                printersList.innerHTML = '<p class="empty-message">Принтери не знайдено</p>';
                scanStatus.textContent = 'Принтери не знайдено';
                scanStatus.className = 'scan-status';
            } else {
                scanStatus.textContent = `Знайдено ${printers.length} принтерів`;
                scanStatus.className = 'scan-status success';
                
                // Відображаємо список принтерів
                displayPrinters(printers);
            }
        } else {
            scanStatus.textContent = 'Помилка: ' + (data.message || 'Невідома помилка');
            scanStatus.className = 'scan-status error';
            printersList.innerHTML = '<p class="empty-message">Помилка сканування</p>';
        }
    } catch (error) {
        console.error('Помилка сканування принтерів:', error);
        scanStatus.textContent = 'Помилка підключення до сервера';
        scanStatus.className = 'scan-status error';
        printersList.innerHTML = '<p class="empty-message">Помилка підключення</p>';
    } finally {
        scanBtn.disabled = false;
        scanBtn.textContent = 'Сканувати мережу';
    }
}

/**
 * Тестовий друк на принтері
 */
async function testPrint(ip, port, buttonElement) {
    const originalText = buttonElement.textContent;
    
    // Блокуємо кнопку під час друку
    buttonElement.disabled = true;
    buttonElement.textContent = 'Друк...';
    
    try {
        const response = await fetch('/api/printers/test-print', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                IP: ip,
                PORT: port
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showStatus(`Тестовий друк відправлено на ${ip}:${port}`, 'success');
            buttonElement.textContent = 'Відправлено!';
            setTimeout(() => {
                buttonElement.textContent = originalText;
            }, 2000);
        } else {
            showStatus('Помилка друку: ' + (data.message || 'Невідома помилка'), 'error');
            buttonElement.textContent = 'Помилка';
            setTimeout(() => {
                buttonElement.textContent = originalText;
            }, 2000);
        }
    } catch (error) {
        console.error('Помилка тестового друку:', error);
        showStatus('Помилка підключення до сервера', 'error');
        buttonElement.textContent = 'Помилка';
        setTimeout(() => {
            buttonElement.textContent = originalText;
        }, 2000);
    } finally {
        buttonElement.disabled = false;
    }
}

/**
 * Перевипуск SSL сертифікату
 */
async function renewCertificate() {
    const renewBtn = document.getElementById('renewCertBtn');
    const originalText = renewBtn.textContent;
    
    // Підтвердження дії
    if (!confirm('Ви впевнені, що хочете перевипустити SSL сертифікат? Це може зайняти кілька хвилин.')) {
        return;
    }
    
    // Блокуємо кнопку
    renewBtn.disabled = true;
    renewBtn.textContent = 'Перевипуск...';
    
    try {
        const response = await fetch('/api/ssl-renew', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showStatus('Сертифікат успішно перевипущено! Контейнер перезапускається...', 'success');
            renewBtn.textContent = 'Успішно!';
            
            // Оновлюємо статус через кілька секунд
            setTimeout(() => {
                checkServiceStatus();
                renewBtn.textContent = originalText;
                renewBtn.disabled = false;
            }, 10000);
        } else {
            showStatus('Помилка перевипуску: ' + (data.message || 'Невідома помилка'), 'error');
            renewBtn.textContent = originalText;
            renewBtn.disabled = false;
            
            // Показуємо детальну інформацію про помилку, якщо є
            if (data.error) {
                console.error('Деталі помилки:', data.error);
            }
        }
    } catch (error) {
        console.error('Помилка перевипуску сертифікату:', error);
        showStatus('Помилка підключення до сервера', 'error');
        renewBtn.textContent = originalText;
        renewBtn.disabled = false;
    }
}

/**
 * Завантажує конфігурацію з сервера
 */
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const data = await response.json();
        
        if (data.status === 'success' && data.config) {
            const config = data.config;
            
            // Заповнюємо форми
            document.getElementById('duckdnsToken').value = config.duckdns_token || '';
            document.getElementById('duckdnsDomain').value = config.duckdns_domain || '';
            document.getElementById('certbotEmail').value = config.certbot_email || '';
            document.getElementById('autoRenewCerts').checked = config.auto_renew_certs !== false;
            
            showStatus('Конфігурацію завантажено', 'success');
        } else {
            showStatus('Помилка завантаження конфігурації: ' + (data.message || 'Невідома помилка'), 'error');
        }
    } catch (error) {
        console.error('Помилка завантаження конфігурації:', error);
        showStatus('Помилка підключення до сервера', 'error');
    }
}

/**
 * Зберігає конфігурацію на сервер
 */
async function saveConfig() {
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.textContent;
    
    // Блокуємо кнопку під час збереження
    saveBtn.disabled = true;
    saveBtn.textContent = 'Збереження...';
    
    try {
        // Збираємо дані з форм
        const config = {
            duckdns_token: document.getElementById('duckdnsToken').value.trim(),
            duckdns_domain: document.getElementById('duckdnsDomain').value.trim(),
            certbot_email: document.getElementById('certbotEmail').value.trim(),
            auto_renew_certs: document.getElementById('autoRenewCerts').checked
        };
        
        // Валідація
        if (!config.duckdns_token) {
            showStatus('Введіть DuckDNS API token', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            return;
        }
        
        if (!config.duckdns_domain) {
            showStatus('Введіть DuckDNS доменне ім\'я', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            return;
        }
        
        if (!config.certbot_email || !config.certbot_email.includes('@')) {
            showStatus('Введіть валідну email адресу', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
            return;
        }
        
        // Відправляємо на сервер
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            showStatus('Налаштування збережено успішно!', 'success');
            // Оновлюємо статус сервісу
            setTimeout(checkServiceStatus, 1000);
        } else {
            showStatus('Помилка збереження: ' + (data.message || 'Невідома помилка'), 'error');
        }
    } catch (error) {
        console.error('Помилка збереження конфігурації:', error);
        showStatus('Помилка підключення до сервера', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

/**
 * Перевіряє статус сервісу
 */
async function checkServiceStatus() {
    try {
        // Перевірка health endpoint
        const healthResponse = await fetch('/api/health');
        const healthData = await healthResponse.json();
        
        if (healthData.status === 'ok') {
            document.getElementById('serviceStatus').textContent = 'Працює';
            document.getElementById('serviceStatus').className = 'status-value ok';
        } else {
            document.getElementById('serviceStatus').textContent = 'Помилка';
            document.getElementById('serviceStatus').className = 'status-value error';
        }
        
        // Перевірка SSL сертифікату
        try {
            const sslResponse = await fetch('/api/ssl-status');
            const sslData = await sslResponse.json();
            
            if (sslData.status === 'ok' && sslData.ssl) {
                const sslStatusEl = document.getElementById('sslStatus');
                
                if (sslData.ssl.valid) {
                    const daysLeft = sslData.ssl.days_left || 0;
                    const expiryDate = sslData.ssl.expires ? new Date(sslData.ssl.expires).toLocaleDateString('uk-UA') : 'Невідомо';
                    
                    // Перевіряємо невідповідність доменів
                    if (sslData.ssl.domain_mismatch && sslData.ssl.domain_warning) {
                        sslStatusEl.textContent = `⚠️ Не відповідає домену (${daysLeft} днів)`;
                        sslStatusEl.className = 'status-value warning';
                        sslStatusEl.title = `${sslData.ssl.domain_warning}\nТермін дії: ${expiryDate}`;
                        
                        // Показуємо попередження
                        showStatus(sslData.ssl.domain_warning, 'warning');
                    } else {
                        sslStatusEl.textContent = `Активний (залишилось ${daysLeft} днів)`;
                        sslStatusEl.className = 'status-value ok';
                        sslStatusEl.title = `Термін дії: ${expiryDate}`;
                    }
                } else {
                    sslStatusEl.textContent = 'Не налаштовано';
                    sslStatusEl.className = 'status-value error';
                    
                    // Якщо є попередження про невідповідність доменів
                    if (sslData.ssl.domain_mismatch && sslData.ssl.domain_warning) {
                        sslStatusEl.title = sslData.ssl.domain_warning;
                        showStatus(sslData.ssl.domain_warning, 'warning');
                    }
                }
            } else {
                document.getElementById('sslStatus').textContent = 'Активний';
                document.getElementById('sslStatus').className = 'status-value ok';
            }
        } catch (sslError) {
            console.error('Помилка перевірки SSL:', sslError);
            // Fallback до простої перевірки HTTPS
            if (window.location.protocol === 'https:') {
                document.getElementById('sslStatus').textContent = 'Активний';
                document.getElementById('sslStatus').className = 'status-value ok';
            } else {
                document.getElementById('sslStatus').textContent = 'Не налаштовано';
                document.getElementById('sslStatus').className = 'status-value error';
            }
        }
    } catch (error) {
        console.error('Помилка перевірки статусу:', error);
        document.getElementById('serviceStatus').textContent = 'Помилка перевірки';
        document.getElementById('serviceStatus').className = 'status-value error';
    }
}

/**
 * Показує повідомлення про статус
 */
function showStatus(message, type) {
    const statusBar = document.getElementById('statusBar');
    const statusMessage = document.getElementById('statusMessage');
    
    if (!statusBar || !statusMessage) return;
    
    statusMessage.textContent = message;
    statusBar.className = 'status-bar ' + (type || 'success');
    statusBar.style.display = 'block';
    
    // Автоматично ховаємо через 5 секунд для success, 10 секунд для warning, 15 секунд для error
    const timeout = type === 'success' ? 5000 : (type === 'warning' ? 10000 : 15000);
    setTimeout(function() {
        statusBar.style.display = 'none';
    }, timeout);
}

