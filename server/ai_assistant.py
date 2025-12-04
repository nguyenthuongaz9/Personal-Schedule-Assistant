from datetime import datetime, timedelta
import json
from typing import Dict, Any, List, Optional
import logging
from models import ScheduleModel
import requests
import re

logger = logging.getLogger(__name__)

class PersonalAssistant:
    def __init__(self, config, db_manager):
        self.config = config
        self.db = db_manager
        self.schedule_model = ScheduleModel(db_manager)
        self.ollama_url = getattr(config, 'OLLAMA_URL', 'http://localhost:11434')
        self.ollama_model = getattr(config, 'OLLAMA_MODEL', 'mistral')
    
    def process_message(self, user_id: int, message: str) -> Dict[str, Any]:
        logger.info(f"Processing message from user {user_id}: '{message}'")
        
        try:
            ollama_response = self._call_ollama_for_intent(message, user_id)
            
            if not ollama_response.get('success', True):
                return ollama_response
            
            logger.info(f"Ollama raw response: {json.dumps(ollama_response, indent=2, ensure_ascii=False)}")
            
            if ollama_response.get('is_schedule_related', False):
                response = self._handle_schedule_with_ollama(user_id, ollama_response, message)
            else:
                response = {
                    'success': True,
                    'message': ollama_response.get('response', 'Tôi có thể giúp gì cho bạn?'),
                    'type': 'general_conversation',
                    'is_ai_generated': True
                }
            
            logger.info(f"Final response: {response}")
            return response
            
        except Exception as e:
            logger.error(f"Critical error in process_message: {e}")
            return self._handle_critical_error(e, message)
    
    def _call_ollama_for_intent(self, message: str, user_id: int) -> Dict[str, Any]:
        try:
            existing_schedules = self._get_user_schedules_context(user_id)
            
            prompt = self._create_intent_analysis_prompt(message, user_id, existing_schedules)
            
            base_url = self.ollama_url.rstrip('/')
            if base_url.endswith('/api/generate'):
                base_url = base_url[:-13]
            url = f"{base_url}/api/generate"
            
            payload = {
                "model": self.ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.9,
                    "max_tokens": 2000
                }
            }
            
            logger.info(f"Calling Ollama at: {url}")
            response = requests.post(url, json=payload, timeout=300)
            response.raise_for_status()
            
            result = response.json()
            generated_text = result.get('response', '').strip()
            
            if not generated_text:
                return {
                    'success': False,
                    'message': 'Ollama trả về response trống',
                    'type': 'ollama_error'
                }
            
            logger.info(f"Ollama response received: {len(generated_text)} characters")
            
            return self._parse_ollama_response(generated_text, message)
            
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Cannot connect to Ollama: {e}")
            return {
                'success': False,
                'message': 'Không thể kết nối đến Ollama service. Vui lòng kiểm tra kết nối.',
                'type': 'connection_error'
            }
        except requests.exceptions.Timeout as e:
            logger.error(f"Ollama request timeout after 5 minutes: {e}")
            return {
                'success': False,
                'message': 'Ollama xử lý quá lâu. Vui lòng thử lại với câu hỏi ngắn hơn.',
                'type': 'timeout_error'
            }
        except Exception as e:
            logger.error(f"Error calling Ollama for intent: {e}")
            return {
                'success': False,
                'message': f'Lỗi khi xử lý yêu cầu: {str(e)}',
                'type': 'unknown_error'
            }
    
    def _get_user_schedules_context(self, user_id: int) -> List[Dict[str, Any]]:
        try:
            schedules = self.schedule_model.get_user_schedules(user_id)
            context_schedules = []
            
            for schedule in schedules:
                try:
                    if hasattr(schedule, '__dict__'):
                        start_time = getattr(schedule, 'start_time', '')
                        if hasattr(start_time, 'strftime'):
                            start_time = start_time.isoformat()
                        
                        schedule_info = {
                            'id': getattr(schedule, 'id', None),
                            'event': getattr(schedule, 'event', ''),
                            'start_time': start_time,
                            'end_time': getattr(schedule, 'end_time', None),
                            'location': getattr(schedule, 'location', ''),
                            'reminder_minutes': getattr(schedule, 'reminder_minutes', None),
                            'category': getattr(schedule, 'category', 'general'),
                            'priority': getattr(schedule, 'priority', 'medium'),
                            'status': getattr(schedule, 'status', 'scheduled')
                        }
                    elif isinstance(schedule, dict):
                        start_time = schedule.get('start_time', '')
                        if hasattr(start_time, 'strftime'):
                            start_time = start_time.isoformat()
                        
                        schedule_info = {
                            'id': schedule.get('id'),
                            'event': schedule.get('event', ''),  
                            'start_time': start_time,
                            'end_time': schedule.get('end_time'),
                            'location': schedule.get('location'),
                            'reminder_minutes': schedule.get('reminder_minutes'),
                            'category': schedule.get('category', 'general'),
                            'priority': schedule.get('priority', 'medium'),
                            'status': schedule.get('status', 'scheduled')
                        }
                    else:
                        continue
                    
                    if schedule_info.get('id') and schedule_info.get('event'):
                        context_schedules.append(schedule_info)
                        
                except Exception as e:
                    logger.warning(f"Error processing schedule: {e}")
                    continue
            
            logger.info(f"Loaded {len(context_schedules)} schedules for context")
            return context_schedules
            
        except Exception as e:
            logger.error(f"Error getting schedules context: {e}")
            return []
    
    def _create_intent_analysis_prompt(self, message: str, user_id: int, existing_schedules: List[Dict]) -> str:
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        schedules_context = ""
        if existing_schedules:
            schedules_context = "LỊCH TRÌNH HIỆN CÓ:\n"
            for i, schedule in enumerate(existing_schedules, 1):
                start_time = schedule['start_time']
                if 'T' in start_time:
                    start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00')).strftime('%H:%M %d/%m/%Y')
                
                reminder_text = ""
                if schedule.get('reminder_minutes'):
                    reminder_text = f" (nhắc trước {schedule['reminder_minutes']} phút)"
                
                schedules_context += f"{i}. ID {schedule['id']}: {schedule['event']} - {start_time}{reminder_text} ({schedule['category']})\n"
        
        return f"""Bạn là trợ lý AI thông minh cho ứng dụng quản lý lịch trình. Phân tích tin nhắn người dùng và xác định intent.

QUAN TRỌNG: Luôn trả về kết quả dưới dạng JSON hợp lệ.

QUY TẮC PHÂN TÍCH INTENT:
- "xem lịch", "xem tất cả lịch trình", "lịch trình hiện có" -> intent: "query", query_scope: "all"
- "xem lịch hôm nay", "hôm nay có gì" -> intent: "query", query_scope: "today"  
- "xem lịch ngày mai", "mai có gì" -> intent: "query", query_scope: "tomorrow"
- "xem lịch tuần này" -> intent: "query", query_scope: "week"
- "đặt lịch", "tạo lịch", "thêm lịch", "báo thức", "nhắc nhở" -> intent: "schedule"
- "sửa lịch", "đổi tên lịch", "cập nhật lịch" -> intent: "update"
- "xóa lịch", "hủy lịch", "xóa báo thức" -> intent: "delete"
- Các câu chào hỏi, hỏi đáp thông thường -> intent: "conversation"

TRÍCH XUẤT THÔNG TIN LỊCH TRÌNH:
1. event: Sự kiện/chủ đề (VD: "họp nhóm", "báo thức dậy")
2. datetime: Thời gian bắt đầu (format: YYYY-MM-DD HH:MM:SS)
3. reminder_minutes: Số phút nhắc nhở trước (tìm từ "trước X phút/phút/giờ", mặc định null)
4. location: Địa điểm (nếu có)
5. description: Mô tả thêm (nếu có)
6. category: Phân loại (alarm|meeting|personal|work|general)
7. priority: Ưu tiên (low|medium|high)

THÔNG TIN CONTEXT:
- Thời gian hiện tại: {current_time}
- User ID: {user_id}
{schedules_context}

ĐỊNH DẠNG JSON BẮT BUỘC:
{{
    "is_schedule_related": boolean,
    "intent": "schedule|query|update|delete|conversation",
    "confidence": 0.0-1.0,
    "response": "string (chỉ cho hội thoại thông thường)",
    "schedule_data": {{
        "event": "string",
        "description": "string", 
        "datetime": "YYYY-MM-DD HH:MM:SS",
        "end_time": "YYYY-MM-DD HH:MM:SS" or null,
        "location": "string",
        "reminder_minutes": number (số phút nhắc trước, VD: 15),
        "category": "alarm|meeting|personal|work|general",
        "priority": "low|medium|high"
    }},
    "query_scope": "today|tomorrow|week|all",
    "schedule_id": number,
    "event_keyword": "string"
}}

VÍ DỤ JSON ĐÚNG:
1. "nhắc tôi họp lúc 9h sáng mai trước 15 phút" -> {{
  "is_schedule_related": true,
  "intent": "schedule",
  "confidence": 0.9,
  "schedule_data": {{
    "event": "họp",
    "datetime": "{datetime.now().date()} 09:00:00",
    "reminder_minutes": 15,
    "category": "meeting",
    "priority": "medium"
  }}
}}

2. "đặt báo thức 7h sáng mai" -> {{
  "is_schedule_related": true,
  "intent": "schedule",
  "confidence": 0.9,
  "schedule_data": {{
    "event": "Báo thức dậy",
    "datetime": "{datetime.now().date()} 07:00:00",
    "reminder_minutes": null,
    "category": "alarm",
    "priority": "high"
  }}
}}

3. "họp nhóm tại phòng 302 lúc 14:30 chiều nay" -> {{
  "is_schedule_related": true,
  "intent": "schedule", 
  "confidence": 0.9,
  "schedule_data": {{
    "event": "họp nhóm",
    "datetime": "{datetime.now().date()} 14:30:00",
    "location": "phòng 302",
    "reminder_minutes": null,
    "category": "meeting",
    "priority": "medium"
  }}
}}

4. "chào bạn" -> {{
  "is_schedule_related": false,
  "intent": "conversation", 
  "confidence": 0.8,
  "response": "Xin chào! Tôi có thể giúp gì cho bạn?"
}}

Tin nhắn cần phân tích: "{message}"

Kết quả JSON:"""
    
    def _parse_ollama_response(self, response_text: str, original_message: str) -> Dict[str, Any]:
        try:
            logger.info(f"Ollama raw text: {response_text}")
            
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                logger.info(f"Found JSON: {json_str}")
                
                parsed_data = json.loads(json_str)
                
                validated_data = self._validate_ollama_response(parsed_data, original_message)
                validated_data['success'] = True
                return validated_data
            else:
                logger.error(f"No JSON found in Ollama response: {response_text}")
                return {
                    'success': False,
                    'message': 'Ollama trả về định dạng không hợp lệ',
                    'type': 'format_error',
                    'raw_response': response_text[:500]
                }
                
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            return {
                'success': False,
                'message': 'Lỗi phân tích response từ Ollama',
                'type': 'parse_error',
                'raw_response': response_text[:500]
            }
        except Exception as e:
            logger.error(f"Error parsing Ollama response: {e}")
            return {
                'success': False,
                'message': f'Lỗi xử lý response: {str(e)}',
                'type': 'parse_error'
            }
    
    def _validate_ollama_response(self, data: Dict, original_message: str) -> Dict[str, Any]:
        if 'is_schedule_related' not in data:
            data['is_schedule_related'] = self._auto_detect_schedule_related(original_message)
        
        if 'intent' not in data:
            data['intent'] = 'conversation'
        
        if 'confidence' not in data:
            data['confidence'] = 0.7
        
        if data.get('intent') == 'query' and 'query_scope' not in data:
            data['query_scope'] = self._detect_query_scope(original_message)
        
        if data.get('is_schedule_related') and data.get('intent') == 'schedule':
            if 'schedule_data' not in data:
                data['schedule_data'] = {}
            
            schedule_data = data['schedule_data']
            
            if 'reminder_minutes' not in schedule_data:
                schedule_data['reminder_minutes'] = self._extract_reminder_minutes(original_message)
            
            if 'location' not in schedule_data:
                schedule_data['location'] = self._extract_location(original_message)
            
            if 'event' not in schedule_data:
                schedule_data['event'] = self._extract_fallback_event(original_message)
            
            if 'datetime' not in schedule_data:
                schedule_data['datetime'] = self._get_default_datetime()
            
            if 'category' not in schedule_data:
                schedule_data['category'] = self._detect_category(original_message)
            
            if 'priority' not in schedule_data:
                schedule_data['priority'] = self._detect_priority(original_message)
        
        data['original_message'] = original_message
        data['method'] = 'ollama_analysis'
        
        return data
    
    def _extract_reminder_minutes(self, message: str) -> Optional[int]:
        message_lower = message.lower()
        
        patterns = [
            r'trước\s+(\d+)\s+phút',
            r'trước\s+(\d+)\s+giờ',
            r'nhắc\s+trước\s+(\d+)\s+phút',
            r'nhắc\s+trước\s+(\d+)\s+giờ',
            r'(\d+)\s+phút\s+trước',
            r'(\d+)\s+giờ\s+trước'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message_lower)
            if match:
                value = int(match.group(1))
                if 'giờ' in pattern:
                    return value * 60
                return value
        
        return None
    
    def _extract_location(self, message: str) -> Optional[str]:
        location_keywords = ['tại', 'ở', 'chỗ', 'địa điểm', 'phòng', 'nhà', 'công ty', 'văn phòng']
        
        words = message.split()
        for i, word in enumerate(words):
            if word.lower() in location_keywords and i + 1 < len(words):
                location_words = []
                for j in range(i + 1, min(i + 4, len(words))):
                    if words[j].lower() not in location_keywords:
                        location_words.append(words[j])
                if location_words:
                    return ' '.join(location_words)
        
        return None
    
    def _auto_detect_schedule_related(self, message: str) -> bool:
        message_lower = message.lower()
        schedule_keywords = ['lịch', 'báo thức', 'nhắc', 'hẹn', 'sự kiện', 'cuộc họp', 'đặt', 'tạo', 'xem', 'xóa', 'sửa']
        return any(keyword in message_lower for keyword in schedule_keywords)
    
    def _detect_query_scope(self, message: str) -> str:
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['mai', 'ngày mai']):
            return 'tomorrow'
        elif any(word in message_lower for word in ['hôm nay', 'hôm nay']):
            return 'today'
        elif any(word in message_lower for word in ['tuần', 'tuần này']):
            return 'week'
        else:
            return 'all'
    
    def _extract_fallback_event(self, message: str) -> str:
        words = message.split()
        stop_words = ['đặt', 'tạo', 'lịch', 'báo', 'thức', 'nhắc', 'xem', 'xóa', 'sửa', 
                     'tất', 'cả', 'hiện', 'có', 'trước', 'phút', 'giờ', 'tại', 'ở']
        
        important_words = [word for word in words if len(word) > 2 and word.lower() not in stop_words]
        
        if important_words:
            return ' '.join(important_words[:3])
        return "Sự kiện mới"
    
    def _detect_category(self, message: str) -> str:
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['báo thức', 'thức dậy', 'dậy', 'alarm']):
            return 'alarm'
        elif any(word in message_lower for word in ['họp', 'meeting', 'cuộc họp', 'hội họp']):
            return 'meeting'
        elif any(word in message_lower for word in ['cá nhân', 'riêng', 'personal']):
            return 'personal'
        elif any(word in message_lower for word in ['công việc', 'work', 'làm việc']):
            return 'work'
        else:
            return 'general'
    
    def _detect_priority(self, message: str) -> str:
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['quan trọng', 'gấp', 'khẩn cấp', 'urgent', 'high']):
            return 'high'
        elif any(word in message_lower for word in ['bình thường', 'normal', 'trung bình', 'medium']):
            return 'medium'
        else:
            return 'low'
    
    def _get_default_datetime(self) -> str:
        default_time = datetime.now() + timedelta(hours=1)
        return default_time.strftime('%Y-%m-%d %H:%M:%S')
    
    def _handle_schedule_with_ollama(self, user_id: int, ollama_data: Dict, original_message: str) -> Dict[str, Any]:
        intent = ollama_data.get('intent', 'conversation')
        
        logger.info(f"Handling schedule intent: {intent}")
        logger.info(f"Schedule data: {ollama_data}")
        
        try:
            if intent == 'schedule':
                return self._handle_schedule_creation(user_id, ollama_data)
            elif intent == 'query':
                return self._handle_schedule_query(user_id, ollama_data)
            elif intent == 'update':
                return self._handle_schedule_update(user_id, ollama_data)
            elif intent == 'delete':
                return self._handle_schedule_deletion(user_id, ollama_data)
            else:
                logger.error(f"Unknown schedule intent: {intent}")
                return self._create_error_response('Không hiểu yêu cầu về lịch trình')
                
        except Exception as e:
            logger.error(f"Error handling schedule intent: {e}")
            return self._create_error_response('Có lỗi khi xử lý lịch trình')
    
    def _handle_schedule_creation(self, user_id: int, ollama_data: Dict) -> Dict[str, Any]:
        try:
            if not self._check_user_exists(user_id):
                return self._create_error_response('Người dùng không tồn tại.')
            
            schedule_data = ollama_data.get('schedule_data', {})
            
            event = schedule_data.get('event', '').strip()
            datetime_str = schedule_data.get('datetime', '')
            
            if not event or event in ["", "Sự kiện mới"]:
                return self._create_error_response('Vui lòng cung cấp sự kiện cho lịch trình')
            
            if not datetime_str:
                return self._create_error_response('Vui lòng cung cấp thời gian cho lịch trình')
            
            prepared_data = self._prepare_schedule_data(schedule_data)
            
            schedule_id = self.schedule_model.create_schedule(user_id, prepared_data)
            
            return self._create_schedule_success_response(prepared_data, schedule_id)
            
        except Exception as e:
            logger.error(f"Error creating schedule: {e}")
            return self._create_error_response('Có lỗi khi tạo lịch trình')
    
    def _prepare_schedule_data(self, schedule_data: Dict) -> Dict[str, Any]:
        """Chuẩn bị dữ liệu cho database với cấu trúc mới"""
        event = schedule_data.get('event', '').strip()
        datetime_str = schedule_data.get('datetime', '')
        category = schedule_data.get('category', 'general')
        reminder_minutes = schedule_data.get('reminder_minutes')
        location = schedule_data.get('location')
        
        try:
            start_time = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M:%S')
        except ValueError:
            start_time = datetime.now() + timedelta(hours=1)
        
        end_time_str = schedule_data.get('end_time')
        if end_time_str:
            try:
                end_time = datetime.strptime(end_time_str, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                if category == 'alarm':
                    end_time = start_time + timedelta(minutes=15)
                else:
                    end_time = start_time + timedelta(hours=1)
        else:
            if category == 'alarm':
                end_time = start_time + timedelta(minutes=15)
            else:
                end_time = start_time + timedelta(hours=1)
        
        return {
            'event': event,
            'description': schedule_data.get('description', ''),
            'start_time': start_time,
            'end_time': end_time,
            'location': location,
            'reminder_minutes': reminder_minutes,
            'priority': schedule_data.get('priority', 'high' if category == 'alarm' else 'medium'),
            'category': category,
            'status': 'scheduled'
        }
    
    def _create_schedule_success_response(self, schedule_data: Dict, schedule_id: int) -> Dict[str, Any]:
        start_time = schedule_data['start_time']
        formatted_time = start_time.strftime('%H:%M %d/%m/%Y')
        event = schedule_data['event']
        
        if schedule_data['category'] == 'alarm':
            message = f" Đã đặt báo thức '{event}' vào lúc {formatted_time}"
        else:
            message = f" Đã tạo lịch '{event}' vào lúc {formatted_time}"
        
        if schedule_data.get('reminder_minutes'):
            message += f"\nSẽ nhắc nhở trước {schedule_data['reminder_minutes']} phút"
        
        if schedule_data.get('location'):
            message += f"\nĐịa điểm: {schedule_data['location']}"
        
        if schedule_data.get('description'):
            message += f"\nGhi chú: {schedule_data['description']}"
        
        message += f"\nID: {schedule_id}"
        
        return {
            'success': True,
            'message': message,
            'schedule_id': schedule_id,
            'type': 'schedule_created',
            'created_schedule': {
                'id': schedule_id,
                'event': event,
                'start_time': start_time.strftime('%Y-%m-%d %H:%M:%S'),
                'reminder_minutes': schedule_data.get('reminder_minutes'),
                'location': schedule_data.get('location'),
                'category': schedule_data['category']
            }
        }
    
    def _handle_schedule_query(self, user_id: int, ollama_data: Dict) -> Dict[str, Any]:
        try:
            if not self._check_user_exists(user_id):
                return self._create_error_response('Người dùng không tồn tại.')
            
            query_scope = ollama_data.get('query_scope', 'all')
            target_date = self._calculate_target_date(query_scope)
            
            schedules = self.schedule_model.get_user_schedules(user_id, target_date)
            
            if schedules:
                return self._create_schedule_list_response(schedules, query_scope)
            else:
                return self._create_empty_schedule_response(query_scope)
                
        except Exception as e:
            logger.error(f"Error querying schedules: {e}")
            return self._create_error_response('Có lỗi khi truy vấn lịch trình')
    
    def _calculate_target_date(self, query_scope: str) -> Optional[str]:
        now = datetime.now()
        
        if query_scope == 'today':
            return now.strftime('%Y-%m-%d')
        elif query_scope == 'tomorrow':
            return (now + timedelta(days=1)).strftime('%Y-%m-%d')
        elif query_scope == 'week':
            return None 
        else:
            return None
    
    def _create_schedule_list_response(self, schedules: List, query_scope: str) -> Dict[str, Any]:
        schedule_list = []
        
        for schedule in schedules:
            schedule_info = self._extract_schedule_info(schedule)
            schedule_list.append(schedule_info)
        
        schedule_list.sort(key=lambda x: x['raw_start_time'])
        
        scope_messages = {
            'today': 'hôm nay',
            'tomorrow': 'ngày mai', 
            'week': 'tuần này',
            'all': 'hiện có'
        }
        
        scope_text = scope_messages.get(query_scope, '')
        message = f"Tìm thấy {len(schedules)} lịch trình {scope_text}:"
        
        for i, s in enumerate(schedule_list, 1):
            reminder_text = ""
            if s.get('reminder_minutes'):
                reminder_text = f" (nhắc trước {s['reminder_minutes']}p)"
            
            location_text = ""
            if s.get('location'):
                location_text = f" tại {s['location']}"
            
            message += f"\n{i}. **{s['event']}**{location_text} - {s['start_time']}{reminder_text} (ID: {s['id']})"
        
        message += f"\n\nBạn có thể sử dụng ID để xóa hoặc sửa lịch trình cụ thể."
        
        return {
            'success': True,
            'message': message,
            'schedules': schedule_list,
            'type': 'schedule_list',
            'count': len(schedules),
            'schedule_ids': [s['id'] for s in schedule_list]
        }
    
    def _extract_schedule_info(self, schedule) -> Dict[str, Any]:
        if isinstance(schedule, dict):
            return {
                'id': schedule.get('id'),
                'event': schedule.get('event', ''),
                'description': schedule.get('description', ''),
                'start_time': self._format_datetime(schedule.get('start_time')),
                'end_time': self._format_datetime(schedule.get('end_time')),
                'location': schedule.get('location'),
                'reminder_minutes': schedule.get('reminder_minutes'),
                'priority': schedule.get('priority', 'medium'),
                'category': schedule.get('category', 'general'),
                'status': schedule.get('status', 'scheduled'),
                'raw_start_time': self._get_raw_datetime(schedule.get('start_time')),
                'raw_end_time': self._get_raw_datetime(schedule.get('end_time'))
            }
        else:
            return {
                'id': schedule.id,
                'event': schedule.event,
                'description': schedule.description,
                'start_time': self._format_datetime(schedule.start_time),
                'end_time': self._format_datetime(schedule.end_time),
                'location': schedule.location,
                'reminder_minutes': schedule.reminder_minutes,
                'priority': schedule.priority,
                'category': schedule.category,
                'status': schedule.status,
                'raw_start_time': self._get_raw_datetime(schedule.start_time),
                'raw_end_time': self._get_raw_datetime(schedule.end_time)
            }
    
    def _format_datetime(self, dt) -> str:
        if hasattr(dt, 'strftime'):
            return dt.strftime('%H:%M %d/%m/%Y')
        elif isinstance(dt, str):
            try:
                if 'T' in dt:  
                    parsed_dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
                else:
                    parsed_dt = datetime.strptime(dt, '%Y-%m-%d %H:%M:%S')
                return parsed_dt.strftime('%H:%M %d/%m/%Y')
            except ValueError:
                return dt
        else:
            return str(dt)
    
    def _get_raw_datetime(self, dt) -> str:
        if hasattr(dt, 'strftime'):
            return dt.strftime('%Y-%m-%d %H:%M:%S')
        elif isinstance(dt, str):
            return dt
        else:
            return datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    def _create_empty_schedule_response(self, query_scope: str) -> Dict[str, Any]:
        scope_messages = {
            'today': 'cho hôm nay',
            'tomorrow': 'cho ngày mai',
            'week': 'trong tuần này',
            'all': 'hiện có'
        }
        
        scope_text = scope_messages.get(query_scope, '')
        message = f"Không có lịch trình nào {scope_text}"
        
        return {
            'success': True,
            'message': message,
            'schedules': [],
            'type': 'no_schedules',
            'schedule_ids': []
        }
    
    def _handle_schedule_update(self, user_id: int, ollama_data: Dict) -> Dict[str, Any]:
        try:
            if not self._check_user_exists(user_id):
                return self._create_error_response('Người dùng không tồn tại.')
            
            schedule_id = ollama_data.get('schedule_id')
            schedule_data = ollama_data.get('schedule_data', {})
            
            if not schedule_id:
                return self._create_error_response('Vui lòng cung cấp ID lịch trình cần sửa')
            
            update_data = {}
            if 'event' in schedule_data:
                update_data['event'] = schedule_data['event'].strip()
            if 'datetime' in schedule_data:
                update_data['start_time'] = schedule_data['datetime']
            if 'reminder_minutes' in schedule_data:
                update_data['reminder_minutes'] = schedule_data['reminder_minutes']
            if 'location' in schedule_data:
                update_data['location'] = schedule_data['location']
            
            if not update_data:
                return self._create_error_response('Vui lòng cung cấp thông tin cần cập nhật')
            
            success = self.schedule_model.update_schedule(schedule_id, update_data)
            
            if success:
                return {
                    'success': True,
                    'message': f' Đã cập nhật lịch trình ID {schedule_id}',
                    'schedule_id': schedule_id,
                    'type': 'schedule_updated'
                }
            else:
                return self._create_error_response('Không thể cập nhật lịch trình')
                
        except Exception as e:
            logger.error(f"Error updating schedule: {e}")
            return self._create_error_response('Có lỗi khi sửa lịch trình')
    
    def _handle_schedule_deletion(self, user_id: int, ollama_data: Dict) -> Dict[str, Any]:
        try:
            if not self._check_user_exists(user_id):
                return self._create_error_response('Người dùng không tồn tại.')
            
            schedule_id = ollama_data.get('schedule_id')
            event_keyword = ollama_data.get('event_keyword', '').strip()
            
            if schedule_id:
                success = self.schedule_model.delete_schedule(schedule_id)
                if success:
                    return {
                        'success': True,
                        'message': f' Đã xóa lịch trình ID {schedule_id}',
                        'schedule_id': schedule_id,
                        'type': 'schedule_deleted'
                    }
                else:
                    return self._create_error_response('Không tìm thấy lịch trình để xóa')
            
            elif event_keyword:
                all_schedules = self.schedule_model.get_user_schedules(user_id)
                matching_schedules = []
                
                for schedule in all_schedules:
                    schedule_event = self._get_schedule_event(schedule)
                    if event_keyword.lower() in schedule_event.lower():
                        matching_schedules.append(schedule)
                
                if len(matching_schedules) == 1:
                    schedule_to_delete = matching_schedules[0]
                    schedule_id_to_delete = self._get_schedule_id(schedule_to_delete)
                    
                    success = self.schedule_model.delete_schedule(schedule_id_to_delete)
                    if success:
                        return {
                            'success': True,
                            'message': f' Đã xóa lịch trình "{self._get_schedule_event(schedule_to_delete)}"',
                            'schedule_id': schedule_id_to_delete,
                            'type': 'schedule_deleted'
                        }
                elif len(matching_schedules) > 1:
                    return self._handle_multiple_matches(matching_schedules, "xóa")
                else:
                    return self._create_error_response(f'Không tìm thấy lịch trình với từ khóa "{event_keyword}"')
            
            else:
                return self._create_error_response('Vui lòng cung cấp ID hoặc tên sự kiện cần xóa')
                
        except Exception as e:
            logger.error(f"Error deleting schedule: {e}")
            return self._create_error_response('Có lỗi khi xóa lịch trình')
    
    def _get_schedule_id(self, schedule) -> Optional[int]:
        try:
            if hasattr(schedule, '__dict__'):
                return getattr(schedule, 'id', None)
            elif isinstance(schedule, dict):
                return schedule.get('id')
            else:
                return None
        except:
            return None
    
    def _get_schedule_event(self, schedule) -> str:
        try:
            if hasattr(schedule, '__dict__'):
                return getattr(schedule, 'event', '')
            elif isinstance(schedule, dict):
                return schedule.get('event', '')
            else:
                return ''
        except:
            return ''
    
    def _handle_multiple_matches(self, schedules: List, action: str) -> Dict[str, Any]:
        schedule_list = []
        for schedule in schedules:
            schedule_info = {
                'id': self._get_schedule_id(schedule),
                'event': self._get_schedule_event(schedule),
                'start_time': self._format_datetime(self._get_schedule_start_time_obj(schedule)),
                'category': self._get_schedule_category(schedule)
            }
            schedule_list.append(schedule_info)
        
        schedule_list.sort(key=lambda x: x['id'])
        
        message = f"Tìm thấy {len(schedules)} lịch trình phù hợp:\n\n"
        for i, s in enumerate(schedule_list, 1):
            message += f"{i}. ID {s['id']}: {s['event']} - {s['start_time']}\n"
        
        message += f"\nHãy nói '{action} lịch trình [ID]' để chọn."
        
        return {
            'success': False,
            'message': message,
            'schedules': schedule_list,
            'type': 'multiple_matches',
            'count': len(schedules)
        }
    
    def _get_schedule_start_time_obj(self, schedule):
        try:
            if hasattr(schedule, '__dict__'):
                return getattr(schedule, 'start_time', None)
            elif isinstance(schedule, dict):
                return schedule.get('start_time')
            else:
                return None
        except:
            return None
    
    def _get_schedule_category(self, schedule) -> str:
        try:
            if hasattr(schedule, '__dict__'):
                return getattr(schedule, 'category', 'general')
            elif isinstance(schedule, dict):
                return schedule.get('category', 'general')
            else:
                return 'general'
        except:
            return 'general'
    
    def _handle_critical_error(self, error: Exception, message: str) -> Dict[str, Any]:
        logger.error(f"Critical error processing message '{message}': {error}")
        
        return {
            'success': False,
            'message': 'Đã có lỗi xảy ra. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.',
            'type': 'critical_error'
        }
    
    def _create_error_response(self, message: str) -> Dict[str, Any]:
        return {
            'success': False,
            'message': message,
            'type': 'error'
        }
    
    def _check_user_exists(self, user_id: int) -> bool:
        try:
            query = "SELECT id FROM users WHERE id = %s"
            result = self.db.execute_query(query, (user_id,), fetch=True)
            return len(result) > 0
        except Exception as e:
            logger.error(f"Error checking user: {e}")
            return False