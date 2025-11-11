"""
Модуль для роботи з конфігурацією (JSON файл)
"""
import json
import os
import logging
from typing import Dict, Any, Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

# Шлях до файлу конфігурації
DEFAULT_CONFIG_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    'config',
    'config.json'
)

# Дефолтна конфігурація
DEFAULT_CONFIG = {
    "duckdns_token": "",
    "duckdns_domain": "",
    "certbot_email": "",
    "auto_renew_certs": True
}


def get_config_path() -> str:
    """Повертає шлях до файлу конфігурації"""
    config_path = os.getenv('CONFIG_PATH', DEFAULT_CONFIG_PATH)
    return config_path


def load_config() -> Dict[str, Any]:
    """
    Завантажує конфігурацію з JSON файлу
    
    Returns:
        Dict з конфігурацією
    """
    config_path = get_config_path()
    
    # Якщо файл не існує, створюємо з дефолтними значеннями
    if not os.path.exists(config_path):
        logger.info(f"Файл конфігурації не знайдено: {config_path}. Створюю з дефолтними значеннями.")
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG.copy()
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # Перевіряємо, що всі необхідні ключі присутні
        for key in DEFAULT_CONFIG.keys():
            if key not in config:
                logger.warning(f"Відсутній ключ '{key}' в конфігурації. Використовую дефолтне значення.")
                config[key] = DEFAULT_CONFIG[key]
        
        return config
        
    except json.JSONDecodeError as e:
        logger.error(f"Помилка парсингу JSON конфігурації: {str(e)}")
        return DEFAULT_CONFIG.copy()
        
    except Exception as e:
        logger.error(f"Помилка завантаження конфігурації: {str(e)}")
        return DEFAULT_CONFIG.copy()


def save_config(config: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Зберігає конфігурацію в JSON файл
    
    Args:
        config: Dict з конфігурацією
        
    Returns:
        Tuple[bool, Optional[str]]: (успіх, повідомлення про помилку)
    """
    config_path = get_config_path()
    
    try:
        # Валідація конфігурації
        if not isinstance(config, dict):
            return False, "Конфігурація повинна бути словником"
        
        # Перевіряємо обов'язкові поля
        required_fields = ['duckdns_token', 'duckdns_domain', 'certbot_email', 'auto_renew_certs']
        for field in required_fields:
            if field not in config:
                return False, f"Відсутнє обов'язкове поле: {field}"
        
        # Перевіряємо типи
        if not isinstance(config['duckdns_token'], str):
            return False, "duckdns_token повинен бути рядком"
        if not isinstance(config['duckdns_domain'], str):
            return False, "duckdns_domain повинен бути рядком"
        if not isinstance(config['certbot_email'], str):
            return False, "certbot_email повинен бути рядком"
        if not isinstance(config['auto_renew_certs'], bool):
            return False, "auto_renew_certs повинен бути булевим значенням"
        
        # Створюємо директорію, якщо не існує
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        # Зберігаємо конфігурацію
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Конфігурація збережена: {config_path}")
        return True, None
        
    except Exception as e:
        error_msg = f"Помилка збереження конфігурації: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, error_msg


def validate_config(config: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Валідує конфігурацію
    
    Args:
        config: Dict з конфігурацією
        
    Returns:
        Tuple[bool, Optional[str]]: (валідна, повідомлення про помилку)
    """
    if not isinstance(config, dict):
        return False, "Конфігурація повинна бути словником"
    
    required_fields = ['duckdns_token', 'duckdns_domain', 'certbot_email', 'auto_renew_certs']
    for field in required_fields:
        if field not in config:
            return False, f"Відсутнє обов'язкове поле: {field}"
    
    # Перевірка email формату (базова)
    if config['certbot_email'] and '@' not in config['certbot_email']:
        return False, "certbot_email повинен бути валідним email адресом"
    
    return True, None

