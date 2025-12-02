import mysql.connector
from mysql.connector import Error, pooling
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self, config):
        self.config = config
        self.connection_pool = None
        self._create_connection_pool()
    
    def _create_connection_pool(self):
       
        try:
            self.connection_pool = pooling.MySQLConnectionPool(
                pool_name="scheduler_pool",
                pool_size=5,
                host=self.config.MYSQL_HOST,
                database=self.config.MYSQL_DB,
                user=self.config.MYSQL_USER,
                password=self.config.MYSQL_PASSWORD,
                port=self.config.MYSQL_PORT,
                auth_plugin='mysql_native_password',
                charset='utf8mb4',
                collation='utf8mb4_unicode_ci',
                autocommit=False,
                pool_reset_session=True
            )
            logger.info("MySQL connection pool created successfully")
        except Error as e:
            logger.error(f"Error creating connection pool: {e}")
            self.connection_pool = None
    
    @contextmanager
    def get_connection(self):
       
        connection = None
        try:
            if self.connection_pool:
                connection = self.connection_pool.get_connection()
            else:
              
                connection = mysql.connector.connect(
                    host=self.config.MYSQL_HOST,
                    database=self.config.MYSQL_DB,
                    user=self.config.MYSQL_USER,
                    password=self.config.MYSQL_PASSWORD,
                    port=self.config.MYSQL_PORT,
                    auth_plugin='mysql_native_password',
                    charset='utf8mb4',
                    collation='utf8mb4_unicode_ci',
                    autocommit=False
                )
            yield connection
        except Error as e:
            logger.error(f"Database connection error: {e}")
            raise
        finally:
            if connection and connection.is_connected():
                connection.close()
    
    def execute_query(self, query, params=None, fetch=True):
        """
        Execute SQL query
        
        Args:
            query: SQL query string
            params: Query parameters
            fetch: True for SELECT queries, False for INSERT/UPDATE/DELETE
            
        Returns:
            For SELECT: list of dictionaries
            For INSERT: lastrowid or rowcount
            For UPDATE/DELETE: rowcount
        """
        with self.get_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            try:
                cursor.execute(query, params or ())
                
               
                query_lower = query.strip().lower()
                is_select = query_lower.startswith('select') or query_lower.startswith('show')
                
                if fetch and is_select:
                    result = cursor.fetchall()
                else:
                    
                    connection.commit()
                    
                   
                    if query_lower.startswith('insert'):
                       
                        try:
                            cursor.execute("SELECT LAST_INSERT_ID() as id")
                            last_id_result = cursor.fetchone()
                            if last_id_result and last_id_result['id']:
                                result = last_id_result['id']
                            else:
                                result = cursor.rowcount
                        except:
                            result = cursor.rowcount
                    else:
                        result = cursor.rowcount
                
                return result
                
            except Error as e:
                connection.rollback()
                logger.error(f" Query execution error: {e}")
                logger.error(f"Query: {query}")
                logger.error(f"Params: {params}")
                return None
            except Exception as e:
                connection.rollback()
                logger.error(f"Unexpected error in execute_query: {e}")
                return None
            finally:
                cursor.close()
    
    def execute_fetchall(self, query, params=None):
       
        return self.execute_query(query, params, fetch=True)
    
    def execute_fetchone(self, query, params=None):
        
        with self.get_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            try:
                cursor.execute(query, params or ())
                result = cursor.fetchone()
                return result
            except Error as e:
                logger.error(f"Query execution error: {e}")
                return None
            finally:
                cursor.close()
    
    def test_connection(self):
       
        try:
            result = self.execute_query("SELECT 1 as test", fetch=True)
            return result is not None and len(result) > 0
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False
    
    def get_last_insert_id(self):
        
        try:
            result = self.execute_query("SELECT LAST_INSERT_ID() as id", fetch=True)
            if result and len(result) > 0:
                return result[0]['id']
        except Exception as e:
            logger.error(f"Error getting last insert ID: {e}")
        return None