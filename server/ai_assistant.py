from datetime import datetime, timedelta
import json
from typing import Dict, Any, List
from models import ScheduleModel
import logging

logger = logging.getLogger(__name__)

class PersonalAssistant:
    def __init__(self, config, db_manager, nlp_processor):
        self.config = config
        self.db = db_manager
        self.nlp = nlp_processor
        self.schedule_model = ScheduleModel(db_manager)
    
    def process_message(self, user_id: int, message: str) -> Dict[str, Any]:
        """Xử lý tin nhắn từ người dùng"""
        logger.info(f"🎯 Processing message from user {user_id}: '{message}'")
        
        # Phân tích NLP
        nlp_result = self.nlp.detect_intent(message)
        logger.info(f"📊 NLP analysis result: {nlp_result}")
        
        # Xử lý theo intent
        intent = nlp_result.get('intent', 'unknown')
        
        if intent == 'schedule':
            response = self._handle_schedule_creation(user_id, nlp_result)
        elif intent == 'query':
            response = self._handle_schedule_query(user_id, nlp_result)
        elif intent == 'update':
            response = self._handle_schedule_update(user_id, nlp_result)
        elif intent == 'delete':
            response = self._handle_schedule_deletion(user_id, nlp_result)
        else:
            response = self._handle_unknown_intent(message, nlp_result)
        
        # Lưu lịch sử tương tác
        try:
            if self._check_user_exists(user_id):
                self._save_interaction(user_id, message, response, nlp_result)
                logger.info(f"💾 Saved AI interaction for user {user_id}")
            else:
                logger.warning(f"⚠️ User ID {user_id} does not exist, skipping AI interaction save")
        except Exception as e:
            logger.warning(f"⚠️ Could not save AI interaction: {e}")
        
        logger.info(f"📤 Final response: {response}")
        return response
    
    def _check_user_exists(self, user_id: int) -> bool:
        """Kiểm tra xem user_id có tồn tại trong database không"""
        try:
            query = "SELECT id FROM users WHERE id = %s"
            result = self.db.execute_query(query, (user_id,), fetch=True)
            return len(result) > 0
        except Exception as e:
            logger.error(f"❌ Error checking user existence: {e}")
            return False
    
    def _handle_schedule_creation(self, user_id: int, nlp_data: Dict) -> Dict[str, Any]:
        """Xử lý tạo lịch trình mới"""
        try:
            # Kiểm tra dữ liệu cần thiết
            title = nlp_data.get('title', '').strip()
            datetime_str = nlp_data.get('datetime', '')
            
            logger.info(f"📅 Attempting to create schedule: title='{title}', datetime='{datetime_str}'")
            
            if not title or title == "Sự kiện mới":
                return {
                    'success': False,
                    'message': 'Vui lòng cung cấp tiêu đề cho lịch trình. Ví dụ: "đặt lịch họp team ngày mai lúc 9h"',
                    'type': 'error'
                }
            
            if not datetime_str:
                return {
                    'success': False,
                    'message': 'Vui lòng cung cấp thời gian cho lịch trình. Ví dụ: "đặt lịch họp ngày mai lúc 9h"',
                    'type': 'error'
                }
            
            # Kiểm tra user tồn tại
            if not self._check_user_exists(user_id):
                return {
                    'success': False,
                    'message': 'Người dùng không tồn tại.',
                    'type': 'error'
                }
            
            # Tính toán thời gian kết thúc
            start_time = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M:%S')
            duration = timedelta(minutes=nlp_data.get('duration_minutes', 60))
            end_time = start_time + duration
            
            schedule_data = {
                'title': title,
                'description': nlp_data.get('description', ''),
                'start_time': start_time,
                'end_time': end_time,
                'priority': nlp_data.get('priority', 'medium'),
                'category': nlp_data.get('category', 'general')
            }
            
            logger.info(f"💾 Creating schedule in database: {schedule_data}")
            
            schedule_id = self.schedule_model.create_schedule(user_id, schedule_data)
            
            # Format thời gian đẹp hơn cho user
            formatted_time = start_time.strftime('%H:%M %d/%m/%Y')
            
            logger.info(f"✅ Schedule created successfully with ID: {schedule_id}")
            
            return {
                'success': True,
                'message': f"✅ Đã tạo lịch '{title}' vào lúc {formatted_time}",
                'schedule_id': schedule_id,
                'type': 'schedule_created',
                'schedule_data': schedule_data
            }
            
        except Exception as e:
            logger.error(f"❌ Error creating schedule: {e}")
            return {
                'success': False,
                'message': '❌ Có lỗi khi tạo lịch trình. Vui lòng thử lại.',
                'type': 'error'
            }
    
    def _handle_schedule_query(self, user_id: int, nlp_data: Dict) -> Dict[str, Any]:
        """Xử lý truy vấn lịch trình"""
        try:
            # Kiểm tra user tồn tại
            if not self._check_user_exists(user_id):
                return {
                    'success': False,
                    'message': 'Người dùng không tồn tại.',
                    'type': 'error'
                }
            
            # Xác định khoảng thời gian truy vấn
            target_date = None
            if 'datetime' in nlp_data and nlp_data['datetime']:
                target_date = nlp_data['datetime'].split()[0]  # Lấy phần ngày
            
            logger.info(f"🔍 Querying schedules for user {user_id}, date: {target_date}")
            
            schedules = self.schedule_model.get_user_schedules(user_id, target_date)
            
            if schedules:
                schedule_list = []
                for schedule in schedules:
                    start_time = schedule.start_time
                    if isinstance(start_time, str):
                        start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    
                    end_time = schedule.end_time
                    if isinstance(end_time, str):
                        end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                    
                    schedule_list.append({
                        'id': schedule.id,
                        'title': schedule.title,
                        'start_time': start_time.strftime('%H:%M'),
                        'end_time': end_time.strftime('%H:%M'),
                        'priority': schedule.priority,
                        'category': schedule.category
                    })
                
                date_display = target_date if target_date else "hôm nay"
                logger.info(f"✅ Found {len(schedules)} schedules for {date_display}")
                
                return {
                    'success': True,
                    'message': f'📅 Tìm thấy {len(schedules)} lịch trình cho {date_display}',
                    'schedules': schedule_list,
                    'type': 'schedule_list'
                }
            else:
                date_display = target_date if target_date else "hôm nay"
                logger.info(f"ℹ️ No schedules found for {date_display}")
                
                return {
                    'success': True,
                    'message': f'📅 Không có lịch trình nào cho {date_display}',
                    'schedules': [],
                    'type': 'no_schedules'
                }
                
        except Exception as e:
            logger.error(f"❌ Error querying schedules: {e}")
            return {
                'success': False,
                'message': '❌ Có lỗi khi truy vấn lịch trình',
                'type': 'error'
            }
    
    def _handle_schedule_update(self, user_id: int, nlp_data: Dict) -> Dict[str, Any]:
        """Xử lý cập nhật lịch trình"""
        # Kiểm tra user tồn tại
        if not self._check_user_exists(user_id):
            return {
                'success': False,
                'message': 'Người dùng không tồn tại.',
                'type': 'error'
            }
        
        return {
            'success': True,
            'message': '🔄 Tính năng cập nhật lịch trình đang được phát triển. Hiện tại bạn có thể tạo lịch trình mới.',
            'type': 'info'
        }
    
    def _handle_schedule_deletion(self, user_id: int, nlp_data: Dict) -> Dict[str, Any]:
        """Xử lý xóa lịch trình"""
        # Kiểm tra user tồn tại
        if not self._check_user_exists(user_id):
            return {
                'success': False,
                'message': 'Người dùng không tồn tại.',
                'type': 'error'
            }
        
        return {
            'success': True,
            'message': '🗑️ Tính năng xóa lịch trình đang được phát triển.',
            'type': 'info'
        }
    
    def _handle_unknown_intent(self, message: str, nlp_data: Dict) -> Dict[str, Any]:
        """Xử lý khi không nhận diện được intent"""
        confidence = nlp_data.get('confidence', 0)
        
        if confidence < 0.5:
            return {
                'success': False,
                'message': '🤔 Tôi chưa hiểu rõ yêu cầu của bạn. Bạn có thể thử:\n\n'
                          '• "Đặt lịch họp ngày mai lúc 9h"\n'
                          '• "Xem lịch trình hôm nay"\n' 
                          '• "Tôi có lịch gì chiều nay?"\n'
                          '• "Tạo lịch khám sức khỏe thứ 6"',
                'type': 'unknown_intent'
            }
        else:
            return {
                'success': False,
                'message': '✅ Tôi đã hiểu yêu cầu của bạn nhưng tính năng này đang được hoàn thiện.',
                'type': 'info'
            }
    
    def _save_interaction(self, user_id: int, user_message: str, response: Dict, nlp_data: Dict):
        """Lưu lịch sử tương tác AI"""
        try:
            query = """
            INSERT INTO ai_interactions 
            (user_id, user_message, ai_response, intent, confidence_score, processed_data)
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            params = (
                user_id,
                user_message,
                json.dumps(response, ensure_ascii=False),
                nlp_data.get('intent', 'unknown'),
                nlp_data.get('confidence', 0.0),
                json.dumps(nlp_data, ensure_ascii=False)
            )
            self.db.execute_query(query, params)
            logger.info("💾 AI interaction saved to database")
        except Exception as e:
            logger.error(f"❌ Error saving AI interaction: {e}")
