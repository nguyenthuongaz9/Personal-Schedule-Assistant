import os
from datetime import timedelta

class Config:
    def __init__(self):
        self.MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
        self.MYSQL_USER = os.getenv('MYSQL_USER', 'root')
        self.MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', 'nguyenthuong01')
        self.MYSQL_DB = os.getenv('MYSQL_DB', 'personal_scheduler')
        self.MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
        
        self.OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434/api/generate')  
        self.OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'mistral')  

        self.JWT_SECRET_KEY = os.getenv('SECRET_KEY', 'fdklajflkdsjalkfdsdlkl')
        self.JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
        self.OLLAMA_TIMEOUT = 10000
        
    
        

class DevelopmentConfig(Config):
    def __init__(self):
        super().__init__()
        self.DEBUG = True

class ProductionConfig(Config):
    def __init__(self):
        super().__init__()
        self.DEBUG = False


config = {
    'development': DevelopmentConfig(),
    'production': ProductionConfig(),
    'default': DevelopmentConfig()
}
