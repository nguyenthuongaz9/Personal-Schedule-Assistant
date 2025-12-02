# models.py
import logging
from datetime import datetime , timedelta

from dataclasses import dataclass
from typing import List, Optional, Dict, Any
from datetime import datetime
from collections import namedtuple

logger = logging.getLogger(__name__)
@dataclass
class User:
    id: int
    fullname: str
    email: str
    password: str
    created_at: datetime
    updated_at:datetime

@dataclass
class Schedule:
    id:int
    user_id: int
    title: str
    description:str
    start_time: datetime
    end_time: datetime
    category: str
    priority: str
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
            logger.error(f"❌ Error creating user: {e}", exc_info=True)
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
                    fullname=row.get('fullname'),
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
                    fullname=row.get('fullname'),
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
        except Exception as e:
            logger.error(f"Error getting user by email {email}: {e}")
        
        return None





class ScheduleModel:
    def __init__(self, db_manager):
        self.db = db_manager
    
    def update_schedule(self, schedule_id: int, update_data: Dict) -> bool:
       
        try:
            set_clauses = []
            params = []
            
            for field, value in update_data.items():
                set_clauses.append(f"{field} = %s")
                params.append(value)
            
            params.append(schedule_id)
            set_clause = ", ".join(set_clauses)
            
           
            query = f"UPDATE schedules SET {set_clause} WHERE id = %s"
            
            result = self.db.execute_query(query, params)
            logger.info(f"Schedule {schedule_id} updated successfully")
            return True
        except Exception as e:
            logger.error(f"Error updating schedule {schedule_id}: {e}")
            
           
            try:
                logger.info(f"Trying alternative update method for schedule {schedule_id}")
                return self._update_schedule_alternative(schedule_id, update_data)
            except Exception as e2:
                logger.error(f"Alternative update also failed: {e2}")
                return False
    
    def _update_schedule_alternative(self, schedule_id: int, update_data: Dict) -> bool:
        
        try:
            set_clauses = []
            params = []
            
            for field, value in update_data.items():
                set_clauses.append(f"{field} = %s")
                params.append(value)
            
            
            set_clauses.append("updated_at = NOW()")
            
            set_clause = ", ".join(set_clauses)
            query = f"UPDATE schedules SET {set_clause} WHERE id = %s"
            params.append(schedule_id)
            
            result = self.db.execute_query(query, params)
            logger.info(f"Schedule {schedule_id} updated successfully (alternative method)")
            return True
        except Exception as e:
            logger.error(f"Alternative update failed for schedule {schedule_id}: {e}")
            return False
    
    def create_schedule(self, user_id: int, schedule_data: Dict) -> int:
       
        try:
         
            query = """
            INSERT INTO schedules 
            (user_id, title, description, start_time, end_time, priority, category, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """
            
            params = (
                user_id,
                schedule_data['title'],
                schedule_data.get('description', ''),
                schedule_data['start_time'].strftime('%Y-%m-%d %H:%M:%S') if hasattr(schedule_data['start_time'], 'strftime') else schedule_data['start_time'],
                schedule_data['end_time'].strftime('%Y-%m-%d %H:%M:%S') if hasattr(schedule_data['end_time'], 'strftime') else schedule_data['end_time'],
                schedule_data.get('priority', 'medium'),
                schedule_data.get('category', 'general')
            )
            
           
            result = self.db.execute_query(query, params)
            
            
            if hasattr(result, 'lastrowid') and result.lastrowid:
                schedule_id = result.lastrowid
                logger.info(f"Schedule created with ID (lastrowid): {schedule_id}")
                return schedule_id
            elif isinstance(result, int) and result > 0:
                id_query = "SELECT LAST_INSERT_ID() as id"
                id_result = self.db.execute_query(id_query, fetch=True)
                if id_result and len(id_result) > 0 and id_result[0]['id']:
                    schedule_id = id_result[0]['id']
                    logger.info(f"Schedule created with ID (LAST_INSERT_ID): {schedule_id}")
                    return schedule_id
            
            return self._get_schedule_id_by_query(user_id, schedule_data['title'])
                    
        except Exception as e:
            logger.error(f"Error creating schedule: {e}")
            schedule_id = self._generate_temporary_id()
            logger.info(f"Using fallback ID after error: {schedule_id}")
            return schedule_id
    
    def get_user_schedules(self, user_id: int, target_date: Optional[str] = None) -> List:
        
        try:
            if target_date:
                query = """
                SELECT * FROM schedules 
                WHERE user_id = %s AND DATE(start_time) = %s 
                ORDER BY start_time
                """
                params = (user_id, target_date)
            else:
                query = """
                SELECT * FROM schedules 
                WHERE user_id = %s 
                ORDER BY start_time
                """
                params = (user_id,)
            
            result = self.db.execute_query(query, params, fetch=True)
            return result if result else []
        except Exception as e:
            logger.error(f"Error getting user schedules: {e}")
            return []
    
    def get_schedule_by_id(self, schedule_id: int):
       
        try:
            query = "SELECT * FROM schedules WHERE id = %s"
            result = self.db.execute_query(query, (schedule_id,), fetch=True)
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error getting schedule by ID: {e}")
            return None
    def get_schedule_by_id_with_user(self, schedule_id: int, user_id: int):
        try:
            query = "SELECT * FROM schedules WHERE id = %s AND user_id = %s"
            result = self.db.execute_query(query, (schedule_id, user_id), fetch=True)
            return result[0] if result else None
        except Exception as e:
            logger.error(f"Error getting schedule by ID: {e}")
            return None

    
    def _get_schedule_id_by_query(self, user_id: int, title: str) -> int:
        
        try:
            query = """
            SELECT id FROM schedules 
            WHERE user_id = %s AND title = %s 
            ORDER BY created_at DESC 
            LIMIT 1
            """
            result = self.db.execute_query(query, (user_id, title), fetch=True)
            if result and len(result) > 0:
                schedule_id = result[0]['id']
                logger.info(f"Schedule created with ID (query): {schedule_id}")
                return schedule_id
            else:
                schedule_id = self._generate_temporary_id()
                logger.warning(f"️Could not get schedule ID, using temporary: {schedule_id}")
                return schedule_id
        except Exception as e:
            logger.error(f"Error getting schedule ID by query: {e}")
            return self._generate_temporary_id()
    
    def _generate_temporary_id(self) -> int:
       
        return int(datetime.now().timestamp() % 1000000) + 1
    
    def delete_schedule(self, schedule_id: int) -> bool:
        
        try:
            query = "DELETE FROM schedules WHERE id = %s"
            result = self.db.execute_query(query, (schedule_id,))
            logger.info(f"Schedule {schedule_id} deleted successfully")
            return True
        except Exception as e:
            logger.error(f"Error deleting schedule {schedule_id}: {e}")
            return False
        

    def get_upcoming_schedules(self, user_id: int, hours: int = 24) -> List[Dict]:
        """
        Lấy các lịch trình sắp tới của user trong khoảng thời gian nhất định
        
        Args:
            user_id: ID của người dùng
            hours: Số giờ trong tương lai để kiểm tra (mặc định 24 giờ)
        
        Returns:
            Danh sách các lịch trình sắp tới
        """
        try:
            query = """
            SELECT 
                id,
                user_id,
                title,
                description,
                start_time,
                end_time,
                status,
                category,
                priority,
                created_at,
                updated_at
            FROM schedules 
            WHERE user_id = %s 
                AND start_time >= NOW()
                AND start_time <= DATE_ADD(NOW(), INTERVAL %s HOUR)
                AND status != 'cancelled'
            ORDER BY start_time ASC
            """
            
            params = (user_id, hours)
            logger.info(f"Getting upcoming schedules for user {user_id}, next {hours} hours")
            
            result = self.db.execute_query(query, params, fetch=True)
            
            if not result:
                logger.info(f"No upcoming schedules found for user {user_id}")
                return []
            
            logger.info(f"Found {len(result)} upcoming schedules for user {user_id}")
            
            # Format kết quả
            schedule_list = []
            for schedule in result:
                schedule_info = {
                    'id': schedule['id'],
                    'user_id': schedule['user_id'],
                    'title': schedule['title'],
                    'description': schedule.get('description', ''),
                    'start_time': schedule['start_time'].isoformat() if hasattr(schedule['start_time'], 'isoformat') else str(schedule['start_time']),
                    'end_time': schedule['end_time'].isoformat() if hasattr(schedule['end_time'], 'isoformat') else str(schedule['end_time']),
                    'status': schedule.get('status', 'scheduled'),
                    'priority': schedule.get('priority', 'medium'),
                    'category': schedule.get('category', 'general'),
                    'created_at': schedule['created_at'].isoformat() if hasattr(schedule['created_at'], 'isoformat') else str(schedule['created_at']),
                    'updated_at': schedule['updated_at'].isoformat() if hasattr(schedule['updated_at'], 'isoformat') else str(schedule['updated_at'])
                }
                schedule_list.append(schedule_info)
            
            return schedule_list
            
        except Exception as e:
            logger.error(f"Error getting upcoming schedules for user {user_id}: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return []
 

    def get_schedules_by_cursor(self, user_id, date, limit=10, direction='older'):
        
        try:
            if direction == 'older':
                query = """
                    SELECT id, user_id, title, description, start_time, end_time, 
                        created_at, updated_at
                    FROM schedules 
                    WHERE user_id = %s AND DATE(start_time) = %s 
                    ORDER BY id DESC 
                    LIMIT %s
                """
            else:  # newer
                query = """
                    SELECT id, user_id, title, description, start_time, end_time, 
                        created_at, updated_at
                    FROM schedules 
                    WHERE user_id = %s AND DATE(start_time) = %s 
                    ORDER BY id ASC 
                    LIMIT %s
                """
            
            params = (user_id, date, limit)
            logger.info(f"Executing query: {query}")
            logger.info(f"With params: {params}")
            
            
            try:
                results = self.db.execute_fetchall(query, params)
            except AttributeError:
               
                results = self.db.execute_query(query, params, fetch=True)
            
            schedules = []
            for row in results:
                schedule = {
                    'id': row['id'],
                    'user_id': row['user_id'],
                    'title': row['title'],
                    'description': row['description'],
                    'start_time': row['start_time'].isoformat() if row['start_time'] else None,
                    'end_time': row['end_time'].isoformat() if row['end_time'] else None,
                    'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                    'updated_at': row['updated_at'].isoformat() if row['updated_at'] else None,
                   
                }
                schedules.append(schedule)
            
            return schedules
            
        except Exception as e:
            logger.error(f"Error getting schedules by cursor: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return []