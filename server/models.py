from datetime import datetime , timedelta
import json
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

@dataclass
class User:
    id: int
    username: str
    email: str
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
    status: str
    category: str
    priority: str
    created_at: datetime
    updated_at: datetime

@dataclass
class AIInteraction:
    id: int
    user_id: int
    user_message: str
    ai_response: str
    intent: str
    confidence_score: float
    processed_data: Dict[str, Any]
    created_at: timedelta

class ScheduleModel:
    def __init__(self, db_manager):
        self.db = db_manager
    
    def create_schedule(self, user_id: int, Schedule:Dict) -> int:
        query = """
        INSERT INTO schedules 
        (user_id, title, description, start_time, end_time, category, priority)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            user_id,
            schedule_data['title'],
            schedule_data.get('description', ''),
            schedule_data['start_time'],
            schedule_data['end_time'],
            schedule_data.get('category', 'general'),
            schedule_data.get('priority', 'medium')
        )
        return self.db.execute_query(query, params) 

    def get_user_schedules(self, user_id: int, date: str = None) -> List[Schedule]:
        if date:
            query = """
            SELECT * FROM schedules 
            WHERE user_id = %s AND DATE(start_time) = %s 
            ORDER BY start_time, priority DESC
            """
            params = (user_id, date)
        else:
            query = """
            SELECT * FROM schedules 
            WHERE user_id = %s AND start_time >= %s
            ORDER BY start_time, priority DESC
            """
            params = (user_id, datetime.now())
        
        results = self.db.execute_query(query, params, fetch=True)
        return [Schedule(**row) for row in results]
    
    def update_schedule_status(self, schedule_id: int, user_id: int, status: str) -> bool:
        query = "UPDATE schedules SET status = %s WHERE id = %s AND user_id = %s"
        params = (status, schedule_id, user_id)
        try:
            self.db.execute_query(query, params)
            return True
        except:
            return False
    
    def get_upcoming_schedules(self, user_id: int, hours: int = 24) -> List[Schedule]:
        query = """
        SELECT * FROM schedules 
        WHERE user_id = %s AND start_time BETWEEN %s AND %s 
        AND status = 'scheduled'
        ORDER BY start_time
        """
        now = datetime.now()
        end_time = now + timedelta(hours=hours)
        params = (user_id, now, end_time)
        
        results = self.db.execute_query(query, params, fetch=True)
        return [Schedule(**row) for row in results]
