import os
from datetime import timedelta

class Config:
    def __init__(self):
        # MySQL Configuration
        self.MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
        self.MYSQL_USER = os.getenv('MYSQL_USER', 'root')
        self.MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', 'password')
        self.MYSQL_DB = os.getenv('MYSQL_DB', 'personal_scheduler')
        self.MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
        
        # Ollama Configuration - SỬA LỖI CHÍNH TẢ Ở ĐÂY
        self.OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434/api/generate')  # Sửa OLLMA_URL -> OLLAMA_URL
        self.OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'mistral')  # Sửa OLLMA_MODEL -> OLLAMA_MODEL
        
        # App Configuration
        self.SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here')
        self.JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
        
        # NLP Configuration - SỬA LỖI CHÍNH TẢ
        self.VIETNAMESE_TIME_PATTERNS = {
            "sáng": 'AM',
            "chiều": 'PM', 
            "tối": 'PM',
            "trưa": 'noon',
            "mai": 'tomorrow',  # Sửa tommorrow -> tomorrow
            "hôm nay": 'today',
            "hôm qua": 'yesterday'
        }

class DevelopmentConfig(Config):
    def __init__(self):
        super().__init__()
        self.DEBUG = True

class ProductionConfig(Config):
    def __init__(self):
        super().__init__()
        self.DEBUG = False

# Tạo instances thay vì sử dụng class trực tiếp
config = {
    'development': DevelopmentConfig(),
    'production': ProductionConfig(),
    'default': DevelopmentConfig()
}
