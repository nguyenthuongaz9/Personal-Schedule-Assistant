import logging
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List, Optional, Dict, Any
import json

logger = logging.getLogger(__name__)

@dataclass
class User:
    id: int
    fullname: str
    email: str
    password: str
    created_at: datetime
    updated_at: datetime

@dataclass
class Schedule:
    id: int
    user_id: int
    event: str 
    description: str
    start_time: datetime
    end_time: Optional[datetime] 
    location: Optional[str] 
    reminder_minutes: Optional[int]  
    category: str
    priority: str
    status: str  
    created_at: datetime
    updated_at: datetime


class UserModel:
    def __init__(self, db_manager):
        self.db = db_manager
    
    def create_user(self, email: str, password: str, fullname: str = '') -> Optional[int]:
        query = """
        INSERT INTO users (email, password, fullname, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s)
        """
        now = datetime.now()
        
        logger.info(f"Creating user: {email}")
        
        try:
            user_id = self.db.execute_query(
                query, 
                (email, password, fullname, now, now), 
                fetch=False  
            )
            
            if user_id:
                logger.info(f"✓ User created with ID: {user_id}")
                return user_id
            else:
                logger.error("✗ INSERT query returned None")
                return None
                
        except Exception as e:
            logger.error(f"Error creating user: {e}", exc_info=True)
            return None
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        query = "SELECT * FROM users WHERE id = %s"
        
        try:
            result = self.db.execute_query(query, (user_id,), fetch=True)
            
            if result and len(result) > 0:
                row = result[0]
                return User(
                    id=row['id'],
                    email=row['email'],
                    password=row['password'],
                    fullname=row.get('fullname', ''),
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
        except Exception as e:
            logger.error(f"Error getting user by id {user_id}: {e}")
        
        return None
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        query = "SELECT * FROM users WHERE email = %s"
        
        try:
            result = self.db.execute_query(query, (email,), fetch=True)
            
            if result and len(result) > 0:
                row = result[0]
                return User(
                    id=row['id'],
                    email=row['email'],
                    password=row['password'],
                    fullname=row.get('fullname', ''),
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
        except Exception as e:
            logger.error(f"Error getting user by email {email}: {e}")
        
        return None


class ScheduleModel:
    def __init__(self, db_manager):
        self.db = db_manager
    
    def create_schedule(self, user_id: int, schedule_data: Dict) -> int:
       
        try:
            event = schedule_data.get('event', '')
            description = schedule_data.get('description', '')
            category = schedule_data.get('category', 'general')
            priority = schedule_data.get('priority', 'medium')
            location = schedule_data.get('location')
            reminder_minutes = schedule_data.get('reminder_minutes')
            status = schedule_data.get('status', 'scheduled')
            
            start_time = schedule_data.get('start_time')
            if isinstance(start_time, str):
                start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            
            end_time = schedule_data.get('end_time')
            if end_time:
                if isinstance(end_time, str):
                    end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            else:
                end_time = None
            
            query = """
            INSERT INTO schedules 
            (user_id, event, description, start_time, end_time, location, 
             reminder_minutes, category, priority, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """
            
            params = (
                user_id,
                event,
                description,
                start_time,
                end_time,
                location,
                reminder_minutes,
                category,
                priority,
                status
            )
            
            result = self.db.execute_query(query, params)
            
            if hasattr(result, 'lastrowid') and result.lastrowid:
                schedule_id = result.lastrowid
            else:
                id_query = "SELECT LAST_INSERT_ID() as id"
                id_result = self.db.execute_query(id_query, fetch=True)
                if id_result and len(id_result) > 0:
                    schedule_id = id_result[0]['id']
                else:
                    schedule_id = self._generate_temporary_id()
            
            logger.info(f"Schedule created with ID: {schedule_id}")
            return schedule_id
                    
        except Exception as e:
            logger.error(f"Error creating schedule: {e}")
            schedule_id = self._generate_temporary_id()
            logger.info(f"Using fallback ID after error: {schedule_id}")
            return schedule_id
    
    def update_schedule(self, schedule_id: int, update_data: Dict) -> bool:
      
        try:
            set_clauses = []
            params = []
            
            for field, value in update_data.items():
                if field in ['start_time', 'end_time'] and isinstance(value, str):
                    value = datetime.fromisoformat(value.replace('Z', '+00:00'))
                
                set_clauses.append(f"{field} = %s")
                params.append(value)
            
            params.append(schedule_id)
            set_clause = ", ".join(set_clauses)
            
            query = f"UPDATE schedules SET {set_clause}, updated_at = NOW() WHERE id = %s"
            
            self.db.execute_query(query, params)
            logger.info(f"Schedule {schedule_id} updated successfully")
            return True
        except Exception as e:
            logger.error(f"Error updating schedule {schedule_id}: {e}")
            return False
    
    def get_user_schedules(self, user_id: int, target_date: Optional[str] = None) -> List[Dict]:
       
        try:
            if target_date:
                query = """
                SELECT * FROM schedules 
                WHERE user_id = %s AND DATE(start_time) = %s 
                ORDER BY start_time ASC
                """
                params = (user_id, target_date)
            else:
                query = """
                SELECT * FROM schedules 
                WHERE user_id = %s 
                ORDER BY start_time DESC
                """
                params = (user_id,)
            
            result = self.db.execute_query(query, params, fetch=True)
            
            schedules = []
            if result:
                for row in result:
                    schedule = {
                        'id': row['id'],
                        'user_id': row['user_id'],
                        'event': row['event'],
                        'description': row.get('description', ''),
                        'start_time': row['start_time'].isoformat() if row['start_time'] else None,
                        'end_time': row['end_time'].isoformat() if row['end_time'] else None,
                        'location': row.get('location'),
                        'reminder_minutes': row.get('reminder_minutes'),
                        'category': row.get('category', 'general'),
                        'priority': row.get('priority', 'medium'),
                        'status': row.get('status', 'scheduled'),
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                        'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None
                    }
                    schedules.append(schedule)
            
            return schedules
        except Exception as e:
            logger.error(f"Error getting user schedules: {e}")
            return []
    
    def get_schedule_by_id(self, schedule_id: int) -> Optional[Dict]:
        
        try:
            query = "SELECT * FROM schedules WHERE id = %s"
            result = self.db.execute_query(query, (schedule_id,), fetch=True)
            
            if result and len(result) > 0:
                row = result[0]
                return {
                    'id': row['id'],
                    'user_id': row['user_id'],
                    'event': row['event'],
                    'description': row.get('description', ''),
                    'start_time': row['start_time'].isoformat() if row['start_time'] else None,
                    'end_time': row['end_time'].isoformat() if row['end_time'] else None,
                    'location': row.get('location'),
                    'reminder_minutes': row.get('reminder_minutes'),
                    'category': row.get('category', 'general'),
                    'priority': row.get('priority', 'medium'),
                    'status': row.get('status', 'scheduled'),
                    'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                    'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None
                }
            return None
        except Exception as e:
            logger.error(f"Error getting schedule by ID: {e}")
            return None
    
    def get_schedule_by_id_with_user(self, schedule_id: int, user_id: int) -> Optional[Dict]:
       
        try:
            query = "SELECT * FROM schedules WHERE id = %s AND user_id = %s"
            result = self.db.execute_query(query, (schedule_id, user_id), fetch=True)
            
            if result and len(result) > 0:
                row = result[0]
                return {
                    'id': row['id'],
                    'user_id': row['user_id'],
                    'event': row['event'],
                    'description': row.get('description', ''),
                    'start_time': row['start_time'].isoformat() if row['start_time'] else None,
                    'end_time': row['end_time'].isoformat() if row['end_time'] else None,
                    'location': row.get('location'),
                    'reminder_minutes': row.get('reminder_minutes'),
                    'category': row.get('category', 'general'),
                    'priority': row.get('priority', 'medium'),
                    'status': row.get('status', 'scheduled'),
                    'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                    'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None
                }
            return None
        except Exception as e:
            logger.error(f"Error getting schedule by ID with user: {e}")
            return None
    
    def get_upcoming_schedules(self, user_id: int, hours: int = 24) -> List[Dict]:
       
        try:
            query = """
            SELECT * FROM schedules 
            WHERE user_id = %s 
                AND start_time >= NOW()
                AND start_time <= DATE_ADD(NOW(), INTERVAL %s HOUR)
                AND status != 'cancelled'
            ORDER BY start_time ASC
            """
            
            params = (user_id, hours)
            result = self.db.execute_query(query, params, fetch=True)
            
            schedules = []
            if result:
                for row in result:
                    schedule = {
                        'id': row['id'],
                        'user_id': row['user_id'],
                        'event': row['event'],
                        'description': row.get('description', ''),
                        'start_time': row['start_time'].isoformat() if row['start_time'] else None,
                        'end_time': row['end_time'].isoformat() if row['end_time'] else None,
                        'location': row.get('location'),
                        'reminder_minutes': row.get('reminder_minutes'),
                        'category': row.get('category', 'general'),
                        'priority': row.get('priority', 'medium'),
                        'status': row.get('status', 'scheduled'),
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                        'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None
                    }
                    schedules.append(schedule)
            
            return schedules
        except Exception as e:
            logger.error(f"Error getting upcoming schedules: {e}")
            return []
    
    def delete_schedule(self, schedule_id: int) -> bool:
       
        try:
            query = "DELETE FROM schedules WHERE id = %s"
            self.db.execute_query(query, (schedule_id,))
            logger.info(f"Schedule {schedule_id} deleted successfully")
            return True
        except Exception as e:
            logger.error(f"Error deleting schedule {schedule_id}: {e}")
            return False
    
    def get_schedules_by_cursor(self, user_id: int, date: str, limit: int = 10, direction: str = 'older') -> List[Dict]:
      
        try:
            if direction == 'older':
                query = """
                SELECT * FROM schedules 
                WHERE user_id = %s AND DATE(start_time) = %s 
                ORDER BY id DESC 
                LIMIT %s
                """
            else: 
                query = """
                SELECT * FROM schedules 
                WHERE user_id = %s AND DATE(start_time) = %s 
                ORDER BY id ASC 
                LIMIT %s
                """
            
            params = (user_id, date, limit)
            result = self.db.execute_query(query, params, fetch=True)
            
            schedules = []
            if result:
                for row in result:
                    schedule = {
                        'id': row['id'],
                        'user_id': row['user_id'],
                        'event': row['event'],
                        'description': row.get('description', ''),
                        'start_time': row['start_time'].isoformat() if row['start_time'] else None,
                        'end_time': row['end_time'].isoformat() if row['end_time'] else None,
                        'location': row.get('location'),
                        'reminder_minutes': row.get('reminder_minutes'),
                        'category': row.get('category', 'general'),
                        'priority': row.get('priority', 'medium'),
                        'status': row.get('status', 'scheduled'),
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                        'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None
                    }
                    schedules.append(schedule)
            
            return schedules
        except Exception as e:
            logger.error(f"Error getting schedules by cursor: {e}")
            return []
    
    def _generate_temporary_id(self) -> int:
        """Tạo ID tạm thời"""
        return int(datetime.now().timestamp() % 1000000) + 1
    
    def search_schedules(self, user_id: int, search_term: str) -> List[Dict]:
       
        try:
            query = """
            SELECT * FROM schedules 
            WHERE user_id = %s 
                AND (event LIKE %s OR description LIKE %s OR location LIKE %s)
            ORDER BY start_time DESC
            """
            
            search_pattern = f"%{search_term}%"
            params = (user_id, search_pattern, search_pattern, search_pattern)
            
            result = self.db.execute_query(query, params, fetch=True)
            
            schedules = []
            if result:
                for row in result:
                    schedule = {
                        'id': row['id'],
                        'user_id': row['user_id'],
                        'event': row['event'],
                        'description': row.get('description', ''),
                        'start_time': row['start_time'].isoformat() if row['start_time'] else None,
                        'end_time': row['end_time'].isoformat() if row['end_time'] else None,
                        'location': row.get('location'),
                        'reminder_minutes': row.get('reminder_minutes'),
                        'category': row.get('category', 'general'),
                        'priority': row.get('priority', 'medium'),
                        'status': row.get('status', 'scheduled'),
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                        'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None
                    }
                    schedules.append(schedule)
            
            return schedules
        except Exception as e:
            logger.error(f"Error searching schedules: {e}")
            return []