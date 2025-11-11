import logging
import os
import subprocess
from pathlib import Path
from flask import Flask, request, jsonify
import docker
from app.printer import send_zpl_to_printer, scan_printers
from app.config import load_config, save_config, validate_config
from app.scan_data import load_scan_data, update_scan_data

# Налаштування логування
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Визначаємо абсолютний шлях до статичних файлів
# Використовуємо шлях відносно розташування поточного файлу, але дозволяємо overriding через змінну оточення
DEFAULT_STATIC_DIR = Path(__file__).resolve().parent / 'static'
STATIC_DIR = Path(os.getenv('STATIC_DIR', str(DEFAULT_STATIC_DIR))).resolve()

# Переконуємося, що директорія статичних файлів існує, щоб уникнути помилок у Flask
if not STATIC_DIR.exists():
    logger.warning("Каталог статичних файлів не існує: %s", STATIC_DIR)

# Використовуємо Flask вбудований статичний маршрут з явно заданими шляхами
app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path='/static')

# Налаштування CORS з конкретними дозволеними доменами
from flask_cors import CORS

# Список дозволених доменів для CORS
ALLOWED_ORIGINS = [
    "https://cloud.scs-it.net",
    "https://g425a9589d80a0c-loscsdev23ai.adb.eu-frankfurt-1.oraclecloudapps.com",
    "https://my2.logistoffice.ua"
]

CORS(app, 
     origins=ALLOWED_ORIGINS,
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
     expose_headers=["Content-Type"],
     supports_credentials=False,
     max_age=3600)


@app.route('/')
def index():
    """Віддає веб-інтерфейс налаштувань"""
    # Використовуємо вбудований механізм Flask для подання статичних файлів
    return app.send_static_file('index.html')


@app.route('/api/print', methods=['POST'])
def print_endpoint():
    """
    Endpoint для відправки ZPL на принтер
    
    Очікує JSON:
    {
        "IP": "192.168.1.100",
        "PORT": 9100,
        "ZPL": "^XA^FO50,50^ADN,36,20^FDHello World^FS^XZ"
    }
    """
    try:
        # Перевірка Content-Type
        if not request.is_json:
            return jsonify({
                "status": "error",
                "message": "Content-Type повинен бути application/json"
            }), 400
        
        data = request.get_json()
        
        # Валідація JSON структури
        if not data:
            return jsonify({
                "status": "error",
                "message": "JSON дані не надані"
            }), 400
        
        # Підтримка як великих, так і малих літер
        ip = data.get('IP') or data.get('ip')
        port = data.get('PORT') or data.get('port')
        zpl = data.get('ZPL') or data.get('zpl')
        
        # Перевірка обов'язкових полів
        if not ip:
            return jsonify({
                "status": "error",
                "message": "IP адреса не вказана"
            }), 400
        
        if port is None:
            return jsonify({
                "status": "error",
                "message": "PORT не вказаний"
            }), 400
        
        if not zpl:
            return jsonify({
                "status": "error",
                "message": "ZPL команди не вказані"
            }), 400
        
        # Перевірка типу порту
        try:
            port = int(port)
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": f"PORT повинен бути числом, отримано: {port}"
            }), 400
        
        # Перевірка діапазону порту
        if port < 1 or port > 65535:
            return jsonify({
                "status": "error",
                "message": f"PORT повинен бути від 1 до 65535, отримано: {port}"
            }), 400
        
        # Відправка на принтер
        logger.info(f"Отримано запит на друк: {ip}:{port}")
        success, error_msg = send_zpl_to_printer(ip, port, zpl)
        
        if success:
            return jsonify({
                "status": "success",
                "message": "ZPL sent to printer successfully"
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": error_msg or "Unknown error occurred"
            }), 500
            
    except Exception as e:
        logger.error(f"Помилка в /api/print: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500


@app.route('/api/config', methods=['GET'])
def get_config():
    """Отримати поточну конфігурацію"""
    try:
        config = load_config()
        return jsonify({
            "status": "success",
            "config": config
        }), 200
    except Exception as e:
        logger.error(f"Помилка отримання конфігурації: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Failed to load config: {str(e)}"
        }), 500


@app.route('/api/config', methods=['POST'])
def update_config():
    """Оновити конфігурацію"""
    try:
        if not request.is_json:
            return jsonify({
                "status": "error",
                "message": "Content-Type повинен бути application/json"
            }), 400
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                "status": "error",
                "message": "JSON дані не надані"
            }), 400
        
        # Валідація конфігурації
        is_valid, error_msg = validate_config(data)
        if not is_valid:
            return jsonify({
                "status": "error",
                "message": error_msg or "Invalid configuration"
            }), 400
        
        # Збереження конфігурації
        success, error_msg = save_config(data)
        if success:
            return jsonify({
                "status": "success",
                "message": "Configuration saved successfully"
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": error_msg or "Failed to save configuration"
            }), 500
            
    except Exception as e:
        logger.error(f"Помилка оновлення конфігурації: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500


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
        
        if not token:
            return jsonify({
                "status": "error",
                "message": "DuckDNS API token не вказано в конфігурації"
            }), 400
        
        logger.info(f"Початок перевипуску SSL сертифікату для домену: {domain}")
        
        # Підключаємося до Docker API
        try:
            docker_client = docker.from_env()
        except Exception as e:
            logger.error(f"Помилка підключення до Docker API: {str(e)}")
            return jsonify({
                "status": "error",
                "message": f"Помилка підключення до Docker: {str(e)}"
            }), 500
        
        # Виконуємо команду certbot в контейнері certbot
        try:
            certbot_container = docker_client.containers.get('docker-print-server-certbot')
            
            # Формуємо команду certbot
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
            
            # Виконуємо команду
            exec_result = certbot_container.exec_run(
                certbot_cmd,
                stdout=True,
                stderr=True,
                demux=True
            )
            
            if exec_result.exit_code == 0:
                logger.info(f"Сертифікат успішно перевипущено для домену: {domain}")
                
                # Перезапускаємо app контейнер для завантаження нового сертифікату
                try:
                    app_container = docker_client.containers.get('docker-print-server-app')
                    app_container.restart(timeout=30)
                    logger.info("Контейнер app перезапущено")
                except Exception as restart_error:
                    logger.warning(f"Не вдалося перезапустити контейнер app: {str(restart_error)}")
                
                output = exec_result.output[0].decode('utf-8') if exec_result.output[0] else ''
                return jsonify({
                    "status": "success",
                    "message": f"Сертифікат успішно перевипущено для домену {domain}",
                    "output": output
                }), 200
            else:
                error_output = exec_result.output[1].decode('utf-8') if exec_result.output[1] else ''
                stdout_output = exec_result.output[0].decode('utf-8') if exec_result.output[0] else ''
                error_msg = error_output or stdout_output or "Невідома помилка"
                logger.error(f"Помилка перевипуску сертифікату: {error_msg}")
                return jsonify({
                    "status": "error",
                    "message": f"Помилка перевипуску сертифікату: {error_msg}",
                    "output": stdout_output,
                    "error": error_output
                }), 500
                
        except docker.errors.NotFound:
            logger.error("Контейнер docker-print-server-certbot не знайдено")
            return jsonify({
                "status": "error",
                "message": "Контейнер certbot не знайдено"
            }), 500
        except Exception as e:
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


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "service": "docker-print-server"
    }), 200


@app.route('/api/ssl-status', methods=['GET'])
def ssl_status():
    """Перевірка статусу SSL сертифікату"""
    try:
        import os
        from datetime import datetime, timezone

        # Завантажуємо конфігурацію для отримання доменного імені
        config = load_config()
        configured_domain = config.get('duckdns_domain', '')

        # Формуємо список можливих шляхів до сертифікату
        env_cert_path = os.getenv('SSL_CERT_PATH')
        
        # Якщо є домен в конфігурації, використовуємо його для шляху
        cert_paths = []
        if env_cert_path:
            cert_paths.append(env_cert_path)
        
        if configured_domain:
            cert_paths.extend([
                f'/app/certbot/certs/live/{configured_domain}/fullchain.pem',
                f'/etc/letsencrypt/live/{configured_domain}/fullchain.pem',
                f'/app/certbot/certs/live/{configured_domain}/cert.pem'
            ])
        
        # Fallback на старий шлях для сумісності
        cert_paths.extend([
            '/app/certbot/certs/live/roshkahome.duckdns.org/fullchain.pem',
            '/etc/letsencrypt/live/roshkahome.duckdns.org/fullchain.pem',
            '/app/certbot/certs/live/roshkahome.duckdns.org/cert.pem'
        ])
        
        cert_paths = [path for path in cert_paths if path]

        cert_path = next((path for path in cert_paths if os.path.exists(path)), None)

        if not cert_path:
            is_https = request.scheme == 'https'
            return jsonify({
                "status": "ok",
                "ssl": {
                    "valid": False,
                    "message": "Сертифікат не знайдено локально",
                    "https_active": is_https,
                    "domain_mismatch": False if not configured_domain else None
                }
            }), 200

        from cryptography import x509
        from cryptography.hazmat.backends import default_backend

        with open(cert_path, 'rb') as f:
            cert_data = f.read()
            cert = x509.load_pem_x509_certificate(cert_data, default_backend())

        expiry_date = cert.not_valid_after
        now = datetime.now(timezone.utc) if expiry_date.tzinfo else datetime.now()
        expiry_aware = expiry_date if expiry_date.tzinfo else expiry_date.replace(tzinfo=None)
        days_left = (expiry_aware - now).days

        issuer = cert.issuer.rfc4514_string()
        issuer_name = "Let's Encrypt" if "Let's Encrypt" in issuer or "E7" in issuer else issuer

        # Перевіряємо домени в сертифікаті
        cert_domains = []
        
        # Отримуємо Subject Alternative Names (SAN)
        try:
            san_ext = cert.extensions.get_extension_for_oid(x509.oid.ExtensionOID.SUBJECT_ALTERNATIVE_NAME)
            cert_domains = [name.value for name in san_ext.value]
        except x509.ExtensionNotFound:
            pass
        
        # Якщо немає SAN, використовуємо Common Name з Subject
        if not cert_domains:
            try:
                subject = cert.subject
                for attr in subject:
                    if attr.oid == x509.oid.NameOID.COMMON_NAME:
                        cert_domains.append(attr.value)
                        break
            except Exception:
                pass

        # Перевіряємо відповідність доменного імені
        domain_mismatch = False
        domain_warning = None
        
        if configured_domain:
            # Нормалізуємо домени для порівняння (прибираємо www. та приводимо до нижнього регістру)
            normalized_configured = configured_domain.lower().replace('www.', '')
            normalized_cert_domains = [d.lower().replace('www.', '') for d in cert_domains]
            
            if normalized_configured not in normalized_cert_domains:
                domain_mismatch = True
                domain_warning = f"Сертифікат видано для доменів: {', '.join(cert_domains)}, але в конфігурації вказано: {configured_domain}. Потрібно перевипустити сертифікат на нове доменне ім'я."

        return jsonify({
            "status": "ok",
            "ssl": {
                "valid": True,
                "cert_path": cert_path,
                "expires": expiry_date.isoformat(),
                "days_left": days_left,
                "issuer": issuer_name,
                "cert_domains": cert_domains,
                "configured_domain": configured_domain,
                "domain_mismatch": domain_mismatch,
                "domain_warning": domain_warning
            }
        }), 200

    except Exception as e:
        logger.error(f"Помилка перевірки SSL статусу: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Failed to check SSL status: {str(e)}"
        }), 500


@app.route('/api/printers/scan', methods=['POST'])
def scan_printers_endpoint():
    """Сканування локальної мережі на пошук принтерів"""
    try:
        data = request.get_json() or {}
        network = data.get('network') or data.get('network_cidr')
        port = data.get('port', 9100)
        
        # Валідація порту
        try:
            port = int(port)
            if port < 1 or port > 65535:
                return jsonify({
                    "status": "error",
                    "message": "PORT повинен бути від 1 до 65535"
                }), 400
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": "PORT повинен бути числом"
            }), 400
        
        logger.info(f"Початок сканування мережі на пошук принтерів (порт {port})")
        printers = scan_printers(network=network, port=port)
        
        # Зберігаємо дані сканування
        success, error_msg = update_scan_data(network=network, port=port, printers=printers)
        if not success:
            logger.warning(f"Не вдалося зберегти дані сканування: {error_msg}")
        
        return jsonify({
            "status": "success",
            "printers": printers,
            "count": len(printers)
        }), 200
        
    except Exception as e:
        logger.error(f"Помилка сканування принтерів: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Failed to scan printers: {str(e)}"
        }), 500


@app.route('/api/printers/scan-data', methods=['GET'])
def get_scan_data_endpoint():
    """Отримати збережені дані сканування"""
    try:
        scan_data = load_scan_data()
        return jsonify({
            "status": "success",
            "scan_data": scan_data
        }), 200
    except Exception as e:
        logger.error(f"Помилка отримання даних сканування: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Failed to load scan data: {str(e)}"
        }), 500


@app.route('/api/printers/test-print', methods=['POST'])
def test_print_endpoint():
    """Тестовий друк на принтері"""
    try:
        if not request.is_json:
            return jsonify({
                "status": "error",
                "message": "Content-Type повинен бути application/json"
            }), 400
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                "status": "error",
                "message": "JSON дані не надані"
            }), 400
        
        # Підтримка як великих, так і малих літер
        ip = data.get('IP') or data.get('ip')
        port = data.get('PORT') or data.get('port', 9100)
        
        # Перевірка обов'язкових полів
        if not ip:
            return jsonify({
                "status": "error",
                "message": "IP адреса не вказана"
            }), 400
        
        # Перевірка типу порту
        try:
            port = int(port)
            if port < 1 or port > 65535:
                return jsonify({
                    "status": "error",
                    "message": f"PORT повинен бути від 1 до 65535, отримано: {port}"
                }), 400
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": f"PORT повинен бути числом, отримано: {port}"
            }), 400
        
        # Тестовий ZPL для друку "Hello World!" на касовій стрічці
        # Розраховуємо довжину етикетки на основі розміру тексту
        # Шрифт ADN,36,20 означає висоту 36 точок, ширину 20 точок на символ
        # "Hello World!" = 12 символів + пробіли
        text = "Hello World!"
        # Приблизна ширина тексту: кількість символів * ширина шрифту + відступи
        # FO50 означає відступ зліва 50 точок
        # Додаємо відступ справа 50 точок для симетрії
        # Висота тексту: 36 точок + відступ зверху 50 + відступ знизу 50
        text_width = len(text) * 20  # приблизна ширина тексту
        label_length = 50 + text_width + 50  # відступ зліва + текст + відступ справа
        label_height = 50 + 36 + 50  # відступ зверху + висота тексту + відступ знизу
        
        # ZPL для касової стрічки без розривів:
        # ^XA - початок формату
        # ^LL - Label Length (довжина етикетки) - обмежує довжину стрічки
        # ^LH - Label Home (початок етикетки)
        # ^FO - Field Origin (позиція тексту)
        # ^ADN - Font A, D (default), N (normal), розмір шрифту
        # ^FD - Field Data (текст)
        # ^FS - Field Separator
        # ^XZ - кінець формату
        test_zpl = f"^XA^LL{label_length}^LH0,0^FO50,50^ADN,36,20^FD{text}^FS^XZ"
        
        # Відправка на принтер
        logger.info(f"Тестовий друк на принтер: {ip}:{port}")
        success, error_msg = send_zpl_to_printer(ip, port, test_zpl)
        
        if success:
            return jsonify({
                "status": "success",
                "message": "Test print sent successfully"
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": error_msg or "Unknown error occurred"
            }), 500
            
    except Exception as e:
        logger.error(f"Помилка тестового друку: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Internal server error: {str(e)}"
        }), 500


if __name__ == '__main__':
    # Для розробки
    app.run(host='0.0.0.0', port=5000, debug=True)
else:
    # Для production (gunicorn)
    logger.info("Flask app initialized")

