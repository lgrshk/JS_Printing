"""
Модуль для відправки ZPL-команд на принтери через TCP/IP
"""
import socket
import logging
import ipaddress
import concurrent.futures
from typing import Tuple, Optional, List, Dict

logger = logging.getLogger(__name__)

# Таймаут для підключення та відправки (в секундах)
CONNECTION_TIMEOUT = 10
SEND_TIMEOUT = 30
# Таймаут для сканування порту (в секундах)
SCAN_TIMEOUT = 2


def send_zpl_to_printer(ip: str, port: int, zpl: str) -> Tuple[bool, Optional[str]]:
    """
    Відправляє ZPL-команди на принтер через TCP/IP socket
    
    Args:
        ip: IP-адреса принтера
        port: Порт принтера (зазвичай 9100)
        zpl: ZPL команди для друку
        
    Returns:
        Tuple[bool, Optional[str]]: (успіх, повідомлення про помилку)
    """
    if not ip or not isinstance(ip, str):
        return False, "IP адреса не вказана або невалідна"
    
    if not isinstance(port, int) or port < 1 or port > 65535:
        return False, f"Порт повинен бути числом від 1 до 65535, отримано: {port}"
    
    if not zpl or not isinstance(zpl, str) or not zpl.strip():
        return False, "ZPL команди не вказані або порожні"
    
    sock = None
    try:
        # Створюємо TCP socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(CONNECTION_TIMEOUT)
        
        # Підключаємося до принтера
        logger.info(f"Підключення до принтера {ip}:{port}")
        sock.connect((ip, port))
        
        # Встановлюємо таймаут для відправки
        sock.settimeout(SEND_TIMEOUT)
        
        # Відправляємо ZPL команди
        logger.info(f"Відправка ZPL на {ip}:{port} ({len(zpl)} байт)")
        sock.sendall(zpl.encode('utf-8'))
        
        logger.info(f"ZPL успішно відправлено на {ip}:{port}")
        return True, None
        
    except socket.timeout:
        error_msg = f"Таймаут підключення до принтера {ip}:{port}"
        logger.error(error_msg)
        return False, error_msg
        
    except socket.gaierror as e:
        error_msg = f"Помилка DNS для адреси {ip}: {str(e)}"
        logger.error(error_msg)
        return False, error_msg
        
    except socket.error as e:
        error_msg = f"Помилка підключення до принтера {ip}:{port}: {str(e)}"
        logger.error(error_msg)
        return False, error_msg
        
    except Exception as e:
        error_msg = f"Невідома помилка при відправці на {ip}:{port}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, error_msg
        
    finally:
        # Закриваємо з'єднання
        if sock:
            try:
                sock.close()
            except Exception as e:
                logger.warning(f"Помилка при закритті socket: {str(e)}")


def check_port_open(ip: str, port: int, timeout: float = SCAN_TIMEOUT) -> bool:
    """
    Перевіряє, чи відкритий порт на вказаній IP адресі
    
    Args:
        ip: IP адреса для перевірки
        port: Порт для перевірки
        timeout: Таймаут перевірки в секундах
        
    Returns:
        bool: True якщо порт відкритий, False інакше
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except Exception as e:
        logger.debug(f"Помилка перевірки порту {ip}:{port}: {str(e)}")
        return False


def get_local_network() -> Optional[str]:
    """
    Визначає локальну мережу контейнера
    
    Returns:
        str: CIDR нотація мережі (наприклад, "192.168.1.0/24") або None
    """
    try:
        # Отримуємо IP адресу контейнера
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            # Підключаємося до публічного DNS (не підключається насправді)
            s.connect(('8.8.8.8', 80))
            local_ip = s.getsockname()[0]
        except Exception:
            # Fallback: використовуємо localhost
            local_ip = '127.0.0.1'
        finally:
            s.close()
        
        # Визначаємо мережу на основі IP адреси
        # Припускаємо стандартну маску /24 для приватних мереж
        ip_obj = ipaddress.IPv4Address(local_ip)
        
        # Перевіряємо, чи це приватна адреса
        if ip_obj.is_private:
            # Створюємо мережу /24
            network = ipaddress.IPv4Network(f"{local_ip}/24", strict=False)
            return str(network)
        else:
            # Якщо не приватна, повертаємо None
            return None
            
    except Exception as e:
        logger.error(f"Помилка визначення локальної мережі: {str(e)}")
        return None


def scan_printers(network: Optional[str] = None, port: int = 9100, max_workers: int = 50) -> List[Dict[str, str]]:
    """
    Сканує локальну мережу на пошук пристроїв з відкритим портом 9100
    
    Args:
        network: CIDR нотація мережі (наприклад, "192.168.1.0/24"). Якщо None, визначається автоматично
        port: Порт для сканування (за замовчуванням 9100)
        max_workers: Максимальна кількість одночасних перевірок
        
    Returns:
        List[Dict[str, str]]: Список знайдених принтерів з IP адресами
    """
    if network is None:
        network = get_local_network()
    
    if network is None:
        logger.warning("Не вдалося визначити локальну мережу")
        return []
    
    try:
        net = ipaddress.IPv4Network(network, strict=False)
        printers = []
        
        logger.info(f"Початок сканування мережі {network} на порт {port}")
        
        # Використовуємо ThreadPoolExecutor для паралельного сканування
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Створюємо список задач
            future_to_ip = {
                executor.submit(check_port_open, str(ip), port): str(ip)
                for ip in net.hosts()
            }
            
            # Обробляємо результати
            for future in concurrent.futures.as_completed(future_to_ip):
                ip = future_to_ip[future]
                try:
                    if future.result():
                        printers.append({"ip": ip, "port": str(port)})
                        logger.info(f"Знайдено принтер: {ip}:{port}")
                except Exception as e:
                    logger.debug(f"Помилка перевірки {ip}: {str(e)}")
        
        logger.info(f"Сканування завершено. Знайдено {len(printers)} принтерів")
        return printers
        
    except Exception as e:
        logger.error(f"Помилка сканування мережі: {str(e)}")
        return []

