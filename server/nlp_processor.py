# nlp_processor.py
import re
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class VietnameseNLProcessor:
    def __init__(self, config, db_manager):
        self.config = config
        self.db = db_manager
        self.setup_advanced_patterns()
    
    def setup_advanced_patterns(self):
        """Thiết lập patterns nâng cao cho tiếng Việt tự nhiên"""
        self.intent_patterns = {
            'schedule': [
                # Các cách diễn đạt tạo lịch thông thường
                r'.*(đặt|lập|tạo|thêm|ghi|thêm vào|đăng ký|đăng kí)\s+(lịch|cuộc họp|sự kiện|báo thức|nhắc nhở|hẹn|báo|công việc|việc|cần làm).*',
                r'.*báo thức\s+.*',
                r'.*nhắc nhở\s+.*',
                r'.*nhắc tôi.*',
                r'.*đánh thức.*',
                r'.*hẹn\s+.*',
                r'.*(phải|nhớ|cần)\s+(dậy|tỉnh|đánh thức|uống thuốc|làm|thực hiện|hoàn thành).*',
                r'.*cho tôi.*báo thức.*',
                r'.*tạo cho tôi.*lịch.*',
                r'.*có việc.*',
                r'.*cần làm.*',
                r'.*phải làm.*',
                r'.*có hẹn.*',
                r'.*lên lịch.*',
                r'.*sắp xếp.*',
            ],
            'query': [
                # Các cách diễn đạt xem lịch
                r'.*(xem|kiểm tra|tra cứu|hiển thị|liệt kê|xem thử|cho xem|cho tôi xem|hiện|hiển thị|liệt kê|kể|nói)\s+(lịch|lịch trình|công việc|việc|sự kiện|hẹn|báo thức).*',
                r'.*(có|lịch)\s+gì\s+.*',
                r'.*xem lịch.*',
                r'.*lịch trình.*',
                r'.*tất cả lịch trình.*',
                r'.*lịch trình hiện có.*',
                r'.*lịch\s+(ngày mai|hôm nay|tuần này|tháng này|năm nay).*',
                r'.*hôm nay có gì.*',
                r'.*ngày mai có gì.*',
                r'.*tuần này có gì.*',
                r'.*các việc cần làm.*',
                r'.*công việc sắp tới.*',
                r'.*sự kiện sắp tới.*',
                r'.*hẹn sắp tới.*',
                r'.*lịch của tôi.*',
                r'.*kế hoạch.*',
                r'.*các lịch trình hiện có.*',
                r'.*tất cả các lịch trình.*',
                r'.*danh sách lịch trình.*',
            ],
            'update': [
                # Các cách diễn đạt sửa lịch
                r'.*(sửa|thay đổi|chỉnh sửa|cập nhật|đổi|sửa lại|chỉnh|thay|điều chỉnh|update)\s+(lịch|lịch trình|tiêu đề|tên|thông tin).*',
                r'.*(sửa|thay đổi|chỉnh sửa)\s+(tiêu đề|tên).*',
                r'.*đổi tên lịch.*',
                r'.*cập nhật lịch.*',
                r'.*sửa\s+.*thành\s+.*',
                r'.*đổi\s+.*thành\s+.*',
                r'.*thay đổi\s+.*thành\s+.*',
                r'.*sửa lại\s+.*thành\s+.*',
                r'.*cho tôi sửa.*',
                r'.*chỉnh sửa.*',
                r'.*cập nhật.*',
                r'.*thay đổi thông tin.*',
                r'.*đổi tên.*',
            ],
            'delete': [
                # Các cách diễn đạt xóa lịch
                r'.*(xóa|xoá|hủy|hủy bỏ|xóa bỏ|dừng|ngừng|xóa đi|hủy đi|gỡ|remove|delete)\s+(lịch|lịch trình|báo thức|sự kiện|hẹn|công việc|việc).*',
                r'.*xóa lịch.*',
                r'.*hủy lịch.*',
                r'.*xóa báo thức.*',
                r'.*hủy báo thức.*',
                r'.*dừng báo thức.*',
                r'.*xóa\s+.*lúc\s+.*',
                r'.*hủy\s+.*lúc\s+.*',
                r'.*xóa\s+lịch\s+trình\s+(có\s+tên|tên\s+là|với\s+tên)\s+.*',
                r'.*hủy\s+lịch\s+trình\s+(có\s+tên|tên\s+là|với\s+tên)\s+.*',
                r'.*xóa\s+(cái|cuộc|vụ)\s+(họp|hẹn).*',
                r'.*hủy\s+(cái|cuộc|vụ)\s+(họp|hẹn).*',
                r'.*cho tôi xóa.*',
                r'.*giúp tôi xóa.*',
                r'.*hủy bỏ.*',
                r'.*xóa đi.*',
                r'.*gỡ lịch.*',
            ],
            'greeting': [
                r'^(xin chào|chào|hello|hi|chào bạn|chào bot|chào em|chào anh|chị|em|anh|bạn|hey|hi there).*',
            ],
            'thanks': [
                r'^(cảm ơn|thank you|thanks|cám ơn|ơn|đa tạ|cảm ơn bạn|cảm ơn nhiều).*',
            ],
            'help': [
                r'^(help|giúp|hỗ trợ|làm gì|tính năng|hướng dẫn|chức năng|trợ giúp|support).*',
            ],
            'time_query': [
                r'.*(mấy giờ|mấy h|bao nhiêu giờ|thời gian|giờ).*',
                r'.*bây giờ là mấy.*',
                r'.*giờ là mấy.*',
                r'.*cho biết giờ.*',
                r'.*mấy giờ rồi.*',
                r'.*thời gian hiện tại.*',
            ],
            'date_query': [
                r'.*hôm nay là ngày mấy.*',
                r'.*ngày bao nhiêu.*',
                r'.*thứ mấy.*',
                r'.*cho biết ngày.*',
                r'.*hôm nay thứ mấy.*',
                r'.*ngày tháng.*',
            ],
        }
    
    def detect_intent(self, text: str) -> Dict[str, Any]:
        """Phát hiện intent với xử lý ngôn ngữ tự nhiên"""
        text_lower = text.lower().strip()
        logger.info(f"🔍 Analyzing natural language: '{text}'")
        
        # Bước 1: Làm sạch và chuẩn hóa văn bản
        cleaned_text = self._clean_and_normalize_text(text_lower)
        
        # Bước 2: Phát hiện intent với độ ưu tiên
        intent_result = self._detect_intent_with_priority(cleaned_text)
        
        # Bước 3: Phân tích chi tiết dựa trên intent
        enhanced_result = self._enhance_with_detailed_analysis(cleaned_text, intent_result)
        
        logger.info(f"🎯 Final analysis: {enhanced_result}")
        return enhanced_result
    
    def _clean_and_normalize_text(self, text: str) -> str:
        """Làm sạch và chuẩn hóa văn bản tiếng Việt"""
        # Loại bỏ các từ cảm thán, từ dư thừa
        filler_words = ['ạ', 'nhé', 'nha', 'đi', 'nào', 'ơi', 'à', 'ừm', 'nhá', 'nè', 'đấy', 'đó']
        for word in filler_words:
            text = re.sub(r'\s+' + word + r'\s*', ' ', text)
            text = re.sub(r'^\s*' + word + r'\s+', '', text)
            text = re.sub(r'\s+' + word + r'$', '', text)
        
        # Chuẩn hóa cách viết
        replacements = {
            'xoá': 'xóa',
            'bthức': 'báo thức',
            'nhắc nhở': 'nhắc',
            'lịch trình': 'lịch',
            'cuộc họp': 'họp',
            'sự kiện': 'sự kiện',
            'công việc': 'việc',
            'kế hoạch': 'kế hoạch'
        }
        
        for old, new in replacements.items():
            text = text.replace(old, new)
        
        return text.strip()
    
    def _detect_intent_with_priority(self, text: str) -> Dict[str, Any]:
        """Phát hiện intent với độ ưu tiên và điểm số"""
        
        # Tính điểm cho từng intent
        intent_scores = {}
        
        for intent, patterns in self.intent_patterns.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, text):
                    score += 1
            
            # Thêm điểm cho từ khóa đặc biệt
            keyword_bonus = {
                'schedule': ['đặt', 'tạo', 'báo thức', 'nhắc', 'hẹn', 'việc', 'làm'],
                'update': ['sửa', 'đổi', 'thành', 'chỉnh', 'cập nhật'],
                'delete': ['xóa', 'hủy', 'dừng', 'gỡ'],
                'query': ['xem', 'kiểm tra', 'có gì', 'lịch trình', 'tất cả', 'các']
            }
            
            if intent in keyword_bonus:
                for keyword in keyword_bonus[intent]:
                    if keyword in text:
                        score += 0.5
            
            if score > 0:
                intent_scores[intent] = score
        
        # Chọn intent có điểm cao nhất
        if intent_scores:
            best_intent = max(intent_scores, key=intent_scores.get)
            confidence = min(0.95, 0.7 + (intent_scores[best_intent] * 0.1))
            
            return {
                'intent': best_intent,
                'confidence': confidence,
                'method': 'pattern_scoring'
            }
        
        # Fallback: sử dụng phân tích cơ bản
        return self._fallback_analysis(text)
    
    def _enhance_with_detailed_analysis(self, text: str, intent_result: Dict) -> Dict[str, Any]:
        """Phân tích chi tiết dựa trên intent"""
        intent = intent_result['intent']
        
        if intent == 'schedule':
            analysis = self._natural_schedule_analysis(text)
        elif intent == 'query':
            analysis = self._natural_query_analysis(text)
        elif intent == 'update':
            analysis = self._natural_update_analysis(text)
        elif intent == 'delete':
            analysis = self._natural_delete_analysis(text)
        else:
            analysis = {}
        
        return {**intent_result, **analysis}
    
    def _natural_schedule_analysis(self, text: str) -> Dict[str, Any]:
        """Phân tích tự nhiên cho tạo lịch"""
        # Xác định loại sự kiện
        event_type = self._determine_event_type(text)
        
        # Extract thông tin thời gian
        time_info = self._advanced_time_extraction(text)
        
        # Extract tiêu đề tự nhiên
        title = self._extract_natural_title_improved(text, event_type)
        
        # Extract mô tả
        description = self._extract_contextual_description(text)
        
        return {
            'title': title,
            'description': description,
            'datetime': time_info['datetime'],
            'duration_minutes': 15 if event_type == 'alarm' else 60,
            'priority': 'high' if event_type == 'alarm' else 'medium',
            'category': event_type,
            'is_alarm': event_type == 'alarm',
            'time_info': time_info
        }
    
    def _extract_natural_title_improved(self, text: str, event_type: str) -> str:
        """Trích xuất tiêu đề tự nhiên - PHIÊN BẢN CẢI THIỆN"""
        logger.info(f"🔍 Extracting title from: '{text}'")
        
        # Ưu tiên 1: Tìm tiêu đề trong dấu ngoặc kép
        quoted_title = self._extract_quoted_title(text)
        if quoted_title:
            logger.info(f"📝 Found quoted title: '{quoted_title}'")
            return quoted_title
        
        # Ưu tiên 2: Tìm tiêu đề sau từ khóa "với tiêu đề là", "tên là", etc.
        keyword_title = self._extract_title_after_keywords(text)
        if keyword_title:
            logger.info(f"📝 Found keyword title: '{keyword_title}'")
            return keyword_title
        
        # Ưu tiên 3: Tìm tiêu đề cuối câu (sau thời gian)
        end_title = self._extract_title_from_end(text)
        if end_title:
            logger.info(f"📝 Found end title: '{end_title}'")
            return end_title
        
        # Ưu tiên 4: Tìm tiêu đề từ nội dung chính
        main_title = self._extract_main_content_title(text)
        if main_title:
            logger.info(f"📝 Found main title: '{main_title}'")
            return main_title
        
        # Fallback: Dựa vào loại sự kiện
        if event_type == 'alarm':
            if any(word in text for word in ['dậy', 'tỉnh']):
                return "Báo thức dậy"
            elif any(word in text for word in ['uống thuốc']):
                return "Báo thức uống thuốc"
            else:
                return "Báo thức"
        
        logger.info("📝 Using default title: 'Sự kiện mới'")
        return "Sự kiện mới"
    
    def _extract_main_content_title(self, text: str) -> str:
        """Trích xuất tiêu đề từ nội dung chính của câu"""
        # Loại bỏ các phần không cần thiết
        patterns_to_remove = [
            r'.*(đặt|lập|tạo|thêm|ghi)\s+(lịch|báo thức|nhắc)\s+(cho\s+)?(tôi|mình|mình|tao|tớ)?\s*',
            r'.*(vào|lúc|ngày|vào ngày|vào lúc|hôm|mai|ngày mai)\s+.*',
            r'.*\d{1,2}(h|:\d{2})?\s*(sáng|chiều|tối)?\s*',
            r'^(xin\s+)?(chào|hello|hi)\s+.*',
        ]
        
        clean_text = text
        for pattern in patterns_to_remove:
            clean_text = re.sub(pattern, '', clean_text).strip()
        
        # Lấy các từ quan trọng
        words = clean_text.split()
        important_words = []
        
        for word in words:
            if len(word) > 2 and word not in ['là', 'có', 'với', 'cho', 'của', 'từ']:
                important_words.append(word)
        
        if important_words:
            title = ' '.join(important_words[:5])  # Giới hạn 5 từ
            if len(title) > 3:
                return title
        
        return ""
    
    def _extract_quoted_title(self, text: str) -> str:
        """Trích xuất tiêu đề trong dấu ngoặc kép"""
        # Tìm text trong dấu ngoặc kép
        quoted_matches = re.findall(r'[""]([^""]+)[""]', text)
        if quoted_matches:
            # Lấy phần trong ngoặc kép cuối cùng (thường là tiêu đề)
            return quoted_matches[-1].strip()
        
        # Tìm text trong dấu nháy đơn
        single_quoted_matches = re.findall(r"'([^']+)'", text)
        if single_quoted_matches:
            return single_quoted_matches[-1].strip()
        
        return ""
    
    def _extract_title_after_keywords(self, text: str) -> str:
        """Trích xuất tiêu đề sau các từ khóa chỉ định"""
        keyword_patterns = [
            r'với\s+tiêu\s+đề\s+là\s+[""]([^""]+)[""]',
            r'tiêu\s+đề\s+là\s+[""]([^""]+)[""]', 
            r'tên\s+là\s+[""]([^""]+)[""]',
            r'với\s+tên\s+là\s+[""]([^""]+)[""]',
            r'đặt\s+tên\s+là\s+[""]([^""]+)[""]',
            r'gọi\s+là\s+[""]([^""]+)[""]',
            # Không có dấu ngoặc kép
            r'với\s+tiêu\s+đề\s+là\s+(.+)',
            r'tiêu\s+đề\s+là\s+(.+)', 
            r'tên\s+là\s+(.+)',
            r'với\s+tên\s+là\s+(.+)',
            r'thành\s+(.+)',
            r'là\s+(.+)',
        ]
        
        for pattern in keyword_patterns:
            match = re.search(pattern, text)
            if match:
                raw_title = match.group(1).strip()
                # Lọc bỏ phần thời gian nếu có
                title = self._clean_extracted_title(raw_title)
                if title and len(title) > 2:  # Ít nhất 3 ký tự
                    return title
        
        return ""
    
    def _extract_title_from_end(self, text: str) -> str:
        """Trích xuất tiêu đề từ cuối câu (sau phần thời gian)"""
        # Pattern: [hành động] [thời gian] [tiêu đề]
        end_patterns = [
            r'(?:lúc\s+\d{1,2}(?:h|:\d{2})?\s*(?:sáng|chiều|tối)?\s*(?:ngày\s+mai|mai|hôm\s+nay)?\s*)(.+)',
            r'(?:vào\s+\d{1,2}(?:h|:\d{2})?\s*(?:sáng|chiều|tối)?\s*(?:ngày\s+mai|mai|hôm\s+nay)?\s*)(.+)',
            r'(?:ngày\s+mai\s+lúc\s+\d{1,2}(?:h|:\d{2})?\s*(?:sáng|chiều|tối)?\s*)(.+)',
            r'(?:hôm\s+nay\s+lúc\s+\d{1,2}(?:h|:\d{2})?\s*(?:sáng|chiều|tối)?\s*)(.+)',
            r'(?:thứ\s+.*\s+lúc\s+\d{1,2}(?:h|:\d{2})?\s*)(.+)',
        ]
        
        for pattern in end_patterns:
            match = re.search(pattern, text)
            if match:
                raw_title = match.group(1).strip()
                title = self._clean_extracted_title(raw_title)
                if title and not any(word in title.lower() for word in ['với', 'cho', 'để', 'là', 'có']):
                    return title
        
        return ""
    
    def _clean_extracted_title(self, raw_title: str) -> str:
        """Làm sạch tiêu đề đã trích xuất"""
        if not raw_title:
            return ""
        
        # Loại bỏ các từ khóa không cần thiết ở đầu
        stop_starts = ['với tiêu đề là', 'tiêu đề là', 'tên là', 'với tên là', 'gọi là', 'thành', 'là']
        for stop in stop_starts:
            if raw_title.lower().startswith(stop):
                raw_title = raw_title[len(stop):].strip()
        
        # Loại bỏ các từ dư thừa
        stop_words = ['với', 'cho', 'vào', 'lúc', 'ngày', 'mai', 'hôm nay', 'sáng', 'chiều', 'tối', 'nhé', 'nha', 'ạ']
        words = raw_title.split()
        filtered_words = [word for word in words if word.lower() not in stop_words]
        
        title = ' '.join(filtered_words).strip()
        
        # Loại bỏ dấu câu thừa
        title = re.sub(r'^[,\-\s]+|[,\-\s]+$', '', title)
        
        return title if title else ""
    
    def _determine_event_type(self, text: str) -> str:
        """Xác định loại sự kiện"""
        if any(word in text for word in ['báo thức', 'đánh thức', 'dậy', 'tỉnh', 'thức']):
            return 'alarm'
        elif any(word in text for word in ['họp', 'meeting', 'cuộc họp', 'hội họp']):
            return 'meeting'
        elif any(word in text for word in ['nhắc', 'nhắc nhở', 'reminder']):
            return 'reminder'
        elif any(word in text for word in ['siêu thị', 'mua sắm', 'ăn uống', 'cafe', 'giải trí']):
            return 'personal'
        elif any(word in text for word in ['học', 'bài', 'đồ án', 'dự án', 'làm bài']):
            return 'study'
        else:
            return 'general'
    
    def _advanced_time_extraction(self, text: str) -> Dict[str, Any]:
        """Trích xuất thời gian nâng cao"""
        now = datetime.now()
        
        # Xác định ngày
        date_info = self._extract_date_info(text, now)
        
        # Xác định giờ
        time_info = self._extract_time_info(text)
        
        # Kết hợp ngày và giờ
        target_datetime = date_info['target_date'].replace(
            hour=time_info['hour'], 
            minute=time_info['minute'], 
            second=0, 
            microsecond=0
        )
        
        # Điều chỉnh nếu thời gian đã qua
        if target_datetime < now and date_info['date_type'] == 'today':
            target_datetime += timedelta(days=1)
        
        return {
            'datetime': target_datetime.strftime('%Y-%m-%d %H:%M:%S'),
            'date': target_datetime.strftime('%Y-%m-%d'),
            'time': target_datetime.strftime('%H:%M'),
            'hour': time_info['hour'],
            'minute': time_info['minute'],
            'date_type': date_info['date_type'],
            'period': time_info['period']
        }
    
    def _extract_date_info(self, text: str, now: datetime) -> Dict[str, Any]:
        """Trích xuất thông tin ngày"""
        # Xác định ngày dựa trên từ khóa
        if any(word in text for word in ['mai', 'ngày mai']):
            return {'target_date': now + timedelta(days=1), 'date_type': 'tomorrow'}
        elif any(word in text for word in ['hôm nay', 'hôm nay', 'bây giờ']):
            return {'target_date': now, 'date_type': 'today'}
        elif any(word in text for word in ['hôm qua']):
            return {'target_date': now - timedelta(days=1), 'date_type': 'yesterday'}
        elif 'thứ 2' in text or 'thứ hai' in text:
            days_ahead = 0 - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return {'target_date': now + timedelta(days=days_ahead), 'date_type': 'monday'}
        elif 'thứ 3' in text or 'thứ ba' in text:
            days_ahead = 1 - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return {'target_date': now + timedelta(days=days_ahead), 'date_type': 'tuesday'}
        elif 'thứ 4' in text or 'thứ tư' in text:
            days_ahead = 2 - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return {'target_date': now + timedelta(days=days_ahead), 'date_type': 'wednesday'}
        elif 'thứ 5' in text or 'thứ năm' in text:
            days_ahead = 3 - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return {'target_date': now + timedelta(days=days_ahead), 'date_type': 'thursday'}
        elif 'thứ 6' in text or 'thứ sáu' in text:
            days_ahead = 4 - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return {'target_date': now + timedelta(days=days_ahead), 'date_type': 'friday'}
        elif 'thứ 7' in text or 'thứ bảy' in text:
            days_ahead = 5 - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return {'target_date': now + timedelta(days=days_ahead), 'date_type': 'saturday'}
        elif 'chủ nhật' in text:
            days_ahead = 6 - now.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return {'target_date': now + timedelta(days=days_ahead), 'date_type': 'sunday'}
        else:
            return {'target_date': now, 'date_type': 'today'}
    
    def _extract_time_info(self, text: str) -> Dict[str, Any]:
        """Trích xuất thông tin giờ"""
        # Pattern chi tiết cho thời gian
        time_patterns = [
            r'(\d{1,2})h\s*(\d{1,2})?\s*(sáng|chiều|tối)?',
            r'(\d{1,2}):(\d{1,2})\s*(sáng|chiều|tối)?',
            r'lúc\s*(\d{1,2})\s*(sáng|chiều|tối)?',
            r'(\d{1,2})\s*giờ\s*(\d{1,2})?\s*(sáng|chiều|tối)?',
            r'(\d{1,2})\s*(sáng|chiều|tối)',
        ]
        
        for pattern in time_patterns:
            match = re.search(pattern, text)
            if match:
                hour = int(match.group(1))
                minute = int(match.group(2)) if match.group(2) else 0
                period = match.group(3) if match.group(3) else ''
                
                # Điều chỉnh giờ theo buổi
                if period == 'chiều' or period == 'tối':
                    if hour < 12:
                        hour += 12
                elif period == 'sáng' and hour == 12:
                    hour = 0
                
                return {'hour': hour, 'minute': minute, 'period': period}
        
        # Mặc định 9:00 sáng
        return {'hour': 9, 'minute': 0, 'period': ''}
    
    def _extract_contextual_description(self, text: str) -> str:
        """Trích xuất mô tả theo ngữ cảnh"""
        descriptions = []
        
        if any(word in text for word in ['quan trọng', 'khẩn cấp', 'gấp']):
            descriptions.append("quan trọng")
        if any(word in text for word in ['uống thuốc']):
            descriptions.append("uống thuốc")
        if any(word in text for word in ['dậy sớm']):
            descriptions.append("dậy sớm")
        if any(word in text for word in ['học bài', 'làm bài']):
            descriptions.append("học tập")
        if any(word in text for word in ['mua sắm', 'siêu thị']):
            descriptions.append("mua sắm")
        
        return ", ".join(descriptions) if descriptions else ""
    
    def _natural_query_analysis(self, text: str) -> Dict[str, Any]:
        """Phân tích truy vấn tự nhiên"""
        if any(word in text for word in ['mai', 'ngày mai']):
            scope = 'tomorrow'
        elif any(word in text for word in ['hôm nay', 'hôm nay']):
            scope = 'today'
        elif any(word in text for word in ['tuần', 'tuần này']):
            scope = 'week'
        elif any(word in text for word in ['tất cả', 'các', 'hiện có', 'toàn bộ']):
            scope = 'all'
        else:
            scope = 'all'
        
        return {'query_scope': scope}
    
    def _natural_update_analysis(self, text: str) -> Dict[str, Any]:
        """Phân tích cập nhật tự nhiên"""
        result = {}
        
        # Pattern "sửa A thành B"
        change_match = re.search(r'sửa\s+(.+?)\s+thành\s+(.+)', text)
        if change_match:
            result['old_title'] = self._clean_title(change_match.group(1))
            result['new_title'] = self._clean_title(change_match.group(2))
        
        # Tìm ID trong cập nhật
        id_match = re.search(r'(?:lịch\s*trình\s*)?(?:có\s+)?id\s*(?:bằng|là|=\s*)?\s*(\d+)', text)
        if id_match:
            result['schedule_id'] = int(id_match.group(1))
        
        # Thêm thời gian nếu có
        time_info = self._advanced_time_extraction(text)
        if time_info['datetime']:
            result['datetime'] = time_info['datetime']
        
        return result
    
    def _natural_delete_analysis(self, text: str) -> Dict[str, Any]:
        """Phân tích xóa tự nhiên"""
        result = {}
        
        # Rule 1: Tìm ID trực tiếp
        id_match = re.search(r'(?:lịch\s*trình\s*)?(?:có\s+)?id\s*(?:bằng|là|=\s*)?\s*(\d+)', text)
        if id_match:
            result['schedule_id'] = int(id_match.group(1))
            return result
        
        # Rule 2: Pattern "xóa lịch trình có tên X"
        name_patterns = [
            r'xóa\s+(?:lịch\s+trình|lịch)\s+(?:có\s+tên|tên\s+là|với\s+tên)\s+(.+)',
            r'hủy\s+(?:lịch\s+trình|lịch)\s+(?:có\s+tên|tên\s+là|với\s+tên)\s+(.+)',
            r'xóa\s+(.+)',
            r'hủy\s+(.+)'
        ]
        
        title_keyword = None
        for pattern in name_patterns:
            match = re.search(pattern, text)
            if match:
                raw_title = match.group(1).strip()
                title_keyword = self._clean_delete_keyword(raw_title, text)
                if title_keyword:
                    break
        
        if title_keyword:
            result['title_keyword'] = title_keyword
        
        # Rule 3: Extract thời gian để tìm kiếm chính xác hơn
        time_info = self._advanced_time_extraction(text)
        if time_info['datetime']:
            result['datetime'] = time_info['datetime']
        
        # Rule 4: Xác định loại sự kiện để tìm kiếm
        if any(word in text for word in ['báo thức', 'nhắc', 'đánh thức']):
            result['search_category'] = 'alarm'
        elif any(word in text for word in ['họp', 'hẹn', 'cuộc họp']):
            result['search_category'] = 'meeting'
        
        return result
    
    def _clean_delete_keyword(self, raw_keyword: str, original_text: str) -> str:
        """Làm sạch từ khóa tìm kiếm cho xóa"""
        if not raw_keyword:
            return ""
        
        # Loại bỏ thời gian và từ dư thừa
        time_indicators = ['lúc', 'vào', 'ngày', 'mai', 'hôm nay', 'sáng', 'chiều', 'tối']
        stop_words = ['đi', 'nhé', 'nha', 'ạ', 'cho tôi', 'giúp tôi', 'giùm tôi', 'giúp', 'cho']
        
        clean_keyword = raw_keyword.strip()
        
        # Loại bỏ phần thời gian
        for indicator in time_indicators:
            if indicator in clean_keyword:
                clean_keyword = clean_keyword.split(indicator)[0].strip()
        
        # Loại bỏ từ dư thừa
        for word in stop_words:
            clean_keyword = clean_keyword.replace(word, '').strip()
        
        # Loại bỏ số và ký tự thời gian
        clean_keyword = re.sub(r'\d+[h:\s]*', '', clean_keyword).strip()
        
        return clean_keyword if clean_keyword else ""
    
    def _clean_title(self, title: str) -> str:
        """Làm sạch tiêu đề"""
        if not title:
            return ""
        
        stop_words = ['về', 'cho', 'vào', 'lúc', 'ngày', 'vào lúc', 'vào ngày']
        clean_title = title.strip()
        
        for word in stop_words:
            if clean_title.startswith(word + ' '):
                clean_title = clean_title[len(word):].strip()
            if clean_title.endswith(' ' + word):
                clean_title = clean_title[:-len(word)].strip()
        
        return clean_title
    
    def _fallback_analysis(self, text: str) -> Dict[str, Any]:
        """Phân tích fallback"""
        # Phân tích đơn giản cho các trường hợp cơ bản
        if any(word in text for word in ['chào', 'hello', 'hi', 'xin chào']):
            return {
                'intent': 'greeting',
                'confidence': 0.8,
                'method': 'fallback'
            }
        elif any(word in text for word in ['cảm ơn', 'thanks', 'thank you']):
            return {
                'intent': 'thanks', 
                'confidence': 0.8,
                'method': 'fallback'
            }
        elif any(word in text for word in ['giúp', 'help', 'hỗ trợ']):
            return {
                'intent': 'help',
                'confidence': 0.8,
                'method': 'fallback'
            }
        else:
            return {
                'intent': 'conversation',
                'response': 'Xin chào! Tôi có thể giúp gì cho bạn?',
                'confidence': 0.5,
                'method': 'fallback'
            }