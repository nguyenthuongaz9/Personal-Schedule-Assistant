import re
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import requests
import logging

logger = logging.getLogger(__name__)

class VietnameseNLProcessor:
    def __init__(self, config, db_manager):
        self.config = config
        self.db = db_manager
        self.setup_patterns()
    
    def setup_patterns(self):
        """Thiết lập patterns cho tiếng Việt"""
        self.intent_patterns = {
            'create_schedule': [
                r'(đặt|lập|tạo)\s+(lịch|cuộc họp|sự kiện)',
                r'(hẹn|schedule)\s+(.*)',
                r'(mai|ngày mai|hôm nay|chiều nay|sáng nay)\s+(.*)\s+lúc\s+(\d+)',
                r'tạo lịch',
                r'thêm lịch'
            ],
            'query_schedule': [
                r'(xem|kiểm tra|tra cứu)\s+(lịch|lịch trình)',
                r'(có|lịch)\s+gì\s+(mai|hôm nay|tuần này)',
                r'lịch trình\s+(.*)',
                r'xem lịch',
                r'hôm nay có gì'
            ],
            'update_schedule': [
                r'(thay đổi|chỉnh sửa|cập nhật|dời)\s+(lịch|cuộc họp)',
                r'hoãn\s+(.*)',
                r'đổi\s+giờ\s+(.*)'
            ],
            'delete_schedule': [
                r'(hủy|xóa|xoá)\s+(lịch|cuộc hẹn)',
                r'xóa\s+(.*)',
                r'hủy bỏ\s+(.*)'
            ]
        }
    
    def detect_intent(self, text: str) -> Dict[str, Any]:
        """Phát hiện intent từ câu tiếng Việt - LUÔN GỌI OLLAMA ĐỂ TEST"""
        text = text.lower().strip()
        
        logger.info(f"🔍 Analyzing text: '{text}'")
        
        # TẠM THỜI COMMENT PATTERN MATCHING ĐỂ TEST OLLAMA
        # # Kiểm tra pattern cơ bản trước
        # for intent, patterns in self.intent_patterns.items():
        #     for pattern in patterns:
        #         if re.search(pattern, text):
        #             logger.info(f"Detected intent '{intent}' using pattern matching")
        #             return self._enhance_with_basic_analysis(text, intent)
        
        # LUÔN GỌI OLLAMA ĐỂ TEST
        logger.info("🚀 Bypassing pattern matching, forcing Ollama call...")
        return self._analyze_with_ollama(text)
    
    def _enhance_with_basic_analysis(self, text: str, intent: str) -> Dict[str, Any]:
        """Phân tích cơ bản với pattern matching"""
        text_lower = text.lower()
        
        # Extract thời gian cơ bản
        time_info = self.extract_time_info(text)
        
        # Extract tiêu đề
        title = self._extract_title(text, intent)
        
        return {
            'intent': intent,
            'title': title,
            'description': '',
            'datetime': time_info['datetime'],
            'duration_minutes': 60,
            'priority': 'medium',
            'confidence': 0.8,
            'method': 'pattern'
        }
    
    def _extract_title(self, text: str, intent: str) -> str:
        """Trích xuất tiêu đề từ câu"""
        if intent == 'create_schedule':
            # Tìm phần mô tả sau từ khóa
            patterns = [
                r'đặt lịch\s+(.+)',
                r'tạo lịch\s+(.+)', 
                r'lập lịch\s+(.+)',
                r'hẹn\s+(.+)'
            ]
            for pattern in patterns:
                match = re.search(pattern, text.lower())
                if match:
                    extracted = match.group(1).strip()
                    # Loại bỏ phần thời gian nếu có
                    extracted = re.sub(r'(lúc\s+\d+|sáng|chiều|tối|mai|hôm nay)', '', extracted).strip()
                    return extracted if extracted else "Sự kiện mới"
        
        return "Sự kiện mới"
    
    def _analyze_with_ollama(self, text: str) -> Dict[str, Any]:
        """Phân tích câu phức tạp với Ollama với timeout 5 phút"""
        prompt = self._build_analysis_prompt(text)
        
        logger.info("=" * 80)
        logger.info("🤖 OLLAMA REQUEST START")
        logger.info(f"📝 Input text: '{text}'")
        logger.info(f"🔗 Ollama URL: {self.config.OLLAMA_URL}")
        logger.info(f"🎯 Model: {self.config.OLLAMA_MODEL}")
        logger.info("📤 Sending request to Ollama...")
        
        try:
            # TIMEOUT 5 PHÚT (300 giây) cho deepseek-r1
            timeout = 300
            
            logger.info(f"⏰ Timeout setting: {timeout} seconds")
            
            start_time = datetime.now()
            
            response = requests.post(
                self.config.OLLAMA_URL,
                json={
                    "model": self.config.OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "top_p": 0.9,
                        "num_predict": 500,
                        "top_k": 40
                    }
                },
                timeout=timeout
            )
            
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"✅ Ollama response received in {processing_time:.2f} seconds")
            logger.info(f"📊 Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                response_text = result.get('response', '').strip()
                
                logger.info("📄 RAW OLLAMA RESPONSE:")
                logger.info("-" * 40)
                logger.info(response_text)
                logger.info("-" * 40)
                logger.info(f"📏 Response length: {len(response_text)} characters")
                
                if response_text:
                    parsed_result = self._parse_ollama_response(response_text, text)
                    logger.info("🎯 PARSED RESULT:")
                    logger.info(json.dumps(parsed_result, indent=2, ensure_ascii=False))
                    logger.info("🤖 OLLAMA REQUEST COMPLETED")
                    logger.info("=" * 80)
                    return parsed_result
                else:
                    logger.warning("❌ Ollama returned empty response")
                    logger.info("🤖 OLLAMA REQUEST FAILED - EMPTY RESPONSE")
                    logger.info("=" * 80)
                    return self._fallback_analysis(text)
            else:
                logger.error(f"❌ Ollama API error: {response.status_code}")
                logger.error(f"Error details: {response.text}")
                logger.info("🤖 OLLAMA REQUEST FAILED - API ERROR")
                logger.info("=" * 80)
                return self._fallback_analysis(text)
                
        except requests.exceptions.Timeout:
            logger.error(f"❌ Ollama request timeout after {timeout} seconds (5 minutes)")
            logger.info("🤖 OLLAMA REQUEST FAILED - TIMEOUT")
            logger.info("=" * 80)
            return self._fallback_analysis(text)
        except requests.exceptions.ConnectionError:
            logger.error("❌ Cannot connect to Ollama - is it running?")
            logger.info("🤖 OLLAMA REQUEST FAILED - CONNECTION ERROR")
            logger.info("=" * 80)
            return self._fallback_analysis(text)
        except Exception as e:
            logger.error(f"❌ Ollama connection error: {e}")
            logger.info("🤖 OLLAMA REQUEST FAILED - UNKNOWN ERROR")
            logger.info("=" * 80)
            return self._fallback_analysis(text)
    
    def _build_analysis_prompt(self, text: str) -> str:
        """Xây dựng prompt cho Ollama với context rõ ràng"""
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        return f"""
Bạn là trợ lý AI phân tích câu tiếng Việt về lịch trình.

CÂU: "{text}"
THỜI GIAN HIỆN TẠI: {current_time}

PHÂN TÍCH:
1. MỤC ĐÍCH (intent):
   - "schedule": tạo lịch mới (đặt lịch, tạo lịch, lập lịch, hẹn)
   - "query": xem lịch (xem lịch, kiểm tra lịch, lịch trình)
   - "update": sửa lịch (thay đổi, chỉnh sửa, hoãn)
   - "delete": xóa lịch (hủy, xóa)
   - "unknown": không xác định

2. THÔNG TIN:
   - title: tiêu đề sự kiện
   - datetime: thời gian YYYY-MM-DD HH:MM:SS
   - duration_minutes: thời lượng phút
   - priority: độ ưu tiên (low, medium, high)

3. THỜI GIAN TIẾNG VIỆT:
   - "mai" = ngày mai
   - "hôm nay" = hôm nay
   - "sáng" = 7:00-11:00
   - "chiều" = 13:00-17:00  
   - "tối" = 19:00-22:00

KẾT QUẢ (CHỈ JSON):
{{
    "intent": "schedule",
    "title": "họp",
    "description": "",
    "datetime": "2024-01-02 09:00:00",
    "duration_minutes": 60,
    "priority": "medium",
    "confidence": 0.9,
    "method": "ollama"
}}

CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH.
"""
    
    def _parse_ollama_response(self, response: str, original_text: str) -> Dict[str, Any]:
        """Phân tích kết quả từ Ollama"""
        try:
            logger.info("🔍 Parsing Ollama response...")
            
            # Làm sạch response
            cleaned_response = re.sub(r'```json\s*|\s*```', '', response).strip()
            logger.info(f"🧹 Cleaned response: '{cleaned_response}'")
            
            # Tìm JSON trong response
            json_match = re.search(r'\{[^{}]*\{[^{}]*\}[^{}]*\}|\{[^{}]*\}', cleaned_response, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                logger.info(f"📦 Found JSON: {json_str}")
                data = json.loads(json_str)
                logger.info(f"✅ Successfully parsed JSON")
                return data
            else:
                logger.warning(f"❌ No JSON found in Ollama response")
                logger.info(f"📄 Full response was: {cleaned_response}")
                return self._fallback_analysis(original_text)
        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON decode error: {e}")
            logger.error(f"📄 Response that failed: {response}")
            return self._fallback_analysis(original_text)
        except Exception as e:
            logger.error(f"❌ Error parsing Ollama response: {e}")
            return self._fallback_analysis(original_text)
    
    def _fallback_analysis(self, text: str) -> Dict[str, Any]:
        """Phân tích fallback khi Ollama không hoạt động"""
        logger.info("🔄 Using fallback analysis")
        
        text_lower = text.lower()
        
        if any(word in text_lower for word in ['đặt lịch', 'tạo lịch', 'lập lịch', 'hẹn']):
            intent = 'schedule'
            confidence = 0.7
        elif any(word in text_lower for word in ['xem lịch', 'kiểm tra lịch', 'lịch trình', 'có gì']):
            intent = 'query'
            confidence = 0.8
        elif any(word in text_lower for word in ['thay đổi', 'chỉnh sửa', 'cập nhật', 'hoãn']):
            intent = 'update'
            confidence = 0.6
        elif any(word in text_lower for word in ['hủy', 'xóa', 'xoá']):
            intent = 'delete'
            confidence = 0.7
        else:
            intent = 'unknown'
            confidence = 0.3
        
        time_info = self.extract_time_info(text)
        
        result = {
            'intent': intent,
            'title': self._extract_title(text, intent),
            'description': '',
            'datetime': time_info['datetime'],
            'duration_minutes': 60,
            'priority': 'medium',
            'confidence': confidence,
            'method': 'fallback'
        }
        
        logger.info(f"🔄 Fallback result: {result}")
        return result
    
    def extract_time_info(self, text: str) -> Dict[str, Any]:
        """Trích xuất thông tin thời gian từ câu tiếng Việt"""
        now = datetime.now()
        text_lower = text.lower()
        
        # Xử lý ngày
        if 'mai' in text_lower or 'ngày mai' in text_lower:
            target_date = now + timedelta(days=1)
        elif 'hôm nay' in text_lower:
            target_date = now
        elif 'hôm qua' in text_lower:
            target_date = now - timedelta(days=1)
        else:
            target_date = now
        
        # Xử lý giờ
        hour = 9  # Mặc định 9h
        minute = 0
        
        # Tìm giờ trong câu
        time_match = re.search(r'(\d+)\s*giờ\s*(\d*)|lúc\s*(\d+)', text_lower)
        if time_match:
            groups = time_match.groups()
            hour_str = next((g for g in groups if g), None)
            if hour_str:
                hour = int(hour_str)
        
        # Tìm phút
        minute_match = re.search(r'(\d+)\s*phút', text_lower)
        if minute_match:
            minute = int(minute_match.group(1))
        
        # Xử lý sáng/chiều/tối
        if 'chiều' in text_lower or 'tối' in text_lower:
            if hour < 12:
                hour += 12
        elif 'sáng' in text_lower and hour == 12:
            hour = 0
        
        # Đảm bảo giờ hợp lệ
        hour = max(0, min(23, hour))
        minute = max(0, min(59, minute))
        
        target_datetime = target_date.replace(
            hour=hour, minute=minute, second=0, microsecond=0
        )
        
        return {
            'datetime': target_datetime.strftime('%Y-%m-%d %H:%M:%S'),
            'date': target_date.strftime('%Y-%m-%d'),
            'time': f"{hour:02d}:{minute:02d}"
        }
