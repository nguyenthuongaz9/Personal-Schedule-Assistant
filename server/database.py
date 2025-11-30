import mysql.connector
from mysql.connector import Error, pooling
from contextlib import contextmanager
import logging
import os

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self, config):
        self.config = config
        self._create_connection_pool()
    
    def _create_connection_pool(self):
        """Tạo connection pool cho MySQL"""
        try:
            self.connection_pool = pooling.MySQLConnectionPool(
                pool_name="scheduler_pool",
                pool_size=5,
                host=self.config.MYSQL_HOST,
                database=self.config.MYSQL_DB,
                user=self.config.MYSQL_USER,
                password=self.config.MYSQL_PASSWORD,
                port=self.config.MYSQL_PORT,
                auth_plugin='mysql_native_password'  # Thêm dòng này
            )
            logger.info("MySQL connection pool created successfully")
        except Error as e:
            logger.error(f"Error creating connection pool: {e}")
            # Fallback to single connection
            self.connection_pool = None
    
    @contextmanager
    def get_connection(self):
        """Context manager để quản lý kết nối database"""
        connection = None
        try:
            if self.connection_pool:
                connection = self.connection_pool.get_connection()
            else:
                # Fallback connection
                connection = mysql.connector.connect(
                    host=self.config.MYSQL_HOST,
                    database=self.config.MYSQL_DB,
                    user=self.config.MYSQL_USER,
                    password=self.config.MYSQL_PASSWORD,
                    port=self.config.MYSQL_PORT,
                    auth_plugin='mysql_native_password'
                )
            yield connection
        except Error as e:
            logger.error(f"Database connection error: {e}")
            raise
        finally:
            if connection and connection.is_connected():
                connection.close()
    
    def execute_query(self, query, params=None, fetch=False):
        """Thực thi query và trả về kết quả"""
        with self.get_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            try:
                cursor.execute(query, params or ())
                if fetch:
                    result = cursor.fetchall()
                else:
                    connection.commit()
                    result = cursor.lastrowid
                return result
            except Error as e:
                connection.rollback()
                logger.error(f"Query execution error: {e}")
                raise
            finally:
                cursor.close()
