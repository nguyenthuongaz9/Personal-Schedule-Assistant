

import requests
import json
import logging
import time

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_ollama_directly():
    """Test Ollama trực tiếp với prompt giống thực tế"""
    url = "http://localhost:11434/api/generate"
    
    test_prompt = """
Bạn là trợ lý AI phân tích câu tiếng Việt về lịch trình.

CÂU: "đặt lịch họp với team ngày mai lúc 9h sáng"
THỜI GIAN HIỆN TẠI: 2025-11-30 19:00:00

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
{
    "intent": "schedule",
    "title": "họp",
    "description": "",
    "datetime": "2024-01-02 09:00:00",
    "duration_minutes": 60,
    "priority": "medium",
    "confidence": 0.9,
    "method": "ollama"
}

CHỈ TRẢ VỀ JSON, KHÔNG GIẢI THÍCH.
"""
    
    print("🚀 Testing Ollama directly...")
    print(f"📝 Prompt length: {len(test_prompt)} characters")
    
    try:
        start_time = time.time()
        
        response = requests.post(
            url,
            json={
                "model": "mistral",
                "prompt": test_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 500,
                    "top_p": 0.9
                }
            },
            timeout=300  # 5 phút
        )
        
        processing_time = time.time() - start_time
        
        print(f"✅ Response received in {processing_time:.2f} seconds")
        print(f"📊 Status code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            response_text = result.get('response', '').strip()
            
            print("=" * 80)
            print("📄 RAW OLLAMA RESPONSE:")
            print("-" * 40)
            print(response_text)
            print("-" * 40)
            print(f"📏 Response length: {len(response_text)} characters")
            
            # Try to parse JSON
            try:
                import re
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group())
                    print("🎯 PARSED JSON:")
                    print(json.dumps(data, indent=2, ensure_ascii=False))
                else:
                    print("❌ No JSON found in response")
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                
        else:
            print(f"❌ HTTP error: {response.status_code}")
            print(f"Error: {response.text}")
            
    except requests.exceptions.Timeout:
        print("❌ Request timeout after 5 minutes")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_ollama_directly()
