"""
Модуль для роботи з даними сканування принтерів
"""
import json
import os
import logging
from typing import Dict, Any, Optional, Tuple, List
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

# Шлях до файлу з даними сканування
DEFAULT_SCAN_DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    'config',
    'scan_data.json'
)

# Дефолтні дані сканування
DEFAULT_SCAN_DATA = {
    "network": None,
    "port": 9100,
    "printers": [],
    "last_scan": None
}


def get_scan_data_path() -> str:
    """Повертає шлях до файлу з даними сканування"""
    scan_data_path = os.getenv('SCAN_DATA_PATH', DEFAULT_SCAN_DATA_PATH)
    return scan_data_path


def load_scan_data() -> Dict[str, Any]:
    """
    Завантажує дані сканування з JSON файлу
    
    Returns:
        Dict з даними сканування
    """
    scan_data_path = get_scan_data_path()
    
    # Якщо файл не існує, створюємо з дефолтними значеннями
    if not os.path.exists(scan_data_path):
        logger.info(f"Файл даних сканування не знайдено: {scan_data_path}. Створюю з дефолтними значеннями.")
        os.makedirs(os.path.dirname(scan_data_path), exist_ok=True)
        save_scan_data(DEFAULT_SCAN_DATA)
        return DEFAULT_SCAN_DATA.copy()
    
    try:
        with open(scan_data_path, 'r', encoding='utf-8') as f:
            scan_data = json.load(f)
        
        # Перевіряємо, що всі необхідні ключі присутні
        for key in DEFAULT_SCAN_DATA.keys():
            if key not in scan_data:
                logger.warning(f"Відсутній ключ '{key}' в даних сканування. Використовую дефолтне значення.")
                scan_data[key] = DEFAULT_SCAN_DATA[key]
        
        return scan_data
        
    except json.JSONDecodeError as e:
        logger.error(f"Помилка парсингу JSON даних сканування: {str(e)}")
        return DEFAULT_SCAN_DATA.copy()
        
    except Exception as e:
        logger.error(f"Помилка завантаження даних сканування: {str(e)}")
        return DEFAULT_SCAN_DATA.copy()


def save_scan_data(scan_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Зберігає дані сканування в JSON файл
    
    Args:
        scan_data: Dict з даними сканування
        
    Returns:
        Tuple[bool, Optional[str]]: (успіх, повідомлення про помилку)
    """
    scan_data_path = get_scan_data_path()
    
    try:
        # Валідація даних
        if not isinstance(scan_data, dict):
            return False, "Дані сканування повинні бути словником"
        
        # Перевіряємо обов'язкові поля
        required_fields = ['network', 'port', 'printers', 'last_scan']
        for field in required_fields:
            if field not in scan_data:
                return False, f"Відсутнє обов'язкове поле: {field}"
        
        # Перевіряємо типи
        if scan_data['network'] is not None and not isinstance(scan_data['network'], str):
            return False, "network повинен бути рядком або None"
        if not isinstance(scan_data['port'], int):
            return False, "port повинен бути числом"
        if not isinstance(scan_data['printers'], list):
            return False, "printers повинен бути списком"
        if scan_data['last_scan'] is not None and not isinstance(scan_data['last_scan'], str):
            return False, "last_scan повинен бути рядком (ISO format) або None"
        
        # Створюємо директорію, якщо не існує
        os.makedirs(os.path.dirname(scan_data_path), exist_ok=True)
        
        # Зберігаємо дані
        with open(scan_data_path, 'w', encoding='utf-8') as f:
            json.dump(scan_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Дані сканування збережені: {scan_data_path}")
        return True, None
        
    except Exception as e:
        error_msg = f"Помилка збереження даних сканування: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, error_msg


def update_scan_data(network: Optional[str], port: int, printers: List[Dict[str, str]]) -> Tuple[bool, Optional[str]]:
    """
    Оновлює дані сканування
    
    Args:
        network: CIDR нотація мережі (може бути None)
        port: Порт сканування
        printers: Список знайдених принтерів
        
    Returns:
        Tuple[bool, Optional[str]]: (успіх, повідомлення про помилку)
    """
    scan_data = {
        "network": network,
        "port": port,
        "printers": printers,
        "last_scan": datetime.now().isoformat()
    }
    
    return save_scan_data(scan_data)

