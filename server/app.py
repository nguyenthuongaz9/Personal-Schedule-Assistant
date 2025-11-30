from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from config import config
import time
from database import DatabaseManager
from nlp_processor import VietnameseNLProcessor
from ai_assistant import PersonalAssistant

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Sử dụng instance thay vì class
app_config = config['development']
app.config.from_object(app_config)

CORS(app)

# Initialize components với error handling
try:
    db_manager = DatabaseManager(app_config)
    nlp_processor = VietnameseNLProcessor(app_config, db_manager)
    assistant = PersonalAssistant(app_config, db_manager, nlp_processor)
    logger.info("All components initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize components: {e}")
    db_manager = None
    nlp_processor = None
    assistant = None

def get_valid_user_id(request_data: dict) -> int:
    """Lấy user_id hợp lệ từ request, mặc định là 1 (demo user)"""
    user_id = request_data.get('user_id', 1)
    try:
        user_id = int(user_id)
        if user_id != 1:
            logger.warning(f"Invalid user_id {user_id}, using default user_id 1")
            return 1
        return user_id
    except (ValueError, TypeError):
        logger.warning(f"Invalid user_id format, using default user_id 1")
        return 1

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    status = "healthy" if db_manager else "degraded"
    ollama_status = "connected" if assistant and hasattr(assistant, 'nlp') else "disconnected"
    
    return jsonify({
        "status": status, 
        "service": "Personal Scheduler API",
        "database": "connected" if db_manager else "disconnected",
        "ollama": ollama_status,
        "ollama_model": app_config.OLLAMA_MODEL,
        "timeout_settings": "5 minutes for Ollama requests"
    })

@app.route('/api/chat', methods=['POST'])
def chat_endpoint():
    """Endpoint chính cho chat với AI assistant - với timeout tổng thể 5 phút"""
    start_time = time.time()
    total_timeout = 310  # Timeout tổng thể 5 phút 10 giây (310 giây)
    
    try:
        if not assistant:
            return jsonify({
                'success': False,
                'message': 'Service temporarily unavailable'
            }), 503

        data = request.get_json()
        user_id = get_valid_user_id(data)
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({
                'success': False,
                'message': 'Tin nhắn không được để trống'
            }), 400
        
        logger.info(f"Starting chat processing for message: '{message}'")
        
        # Xử lý tin nhắn với AI assistant
        response = assistant.process_message(user_id, message)
        
        processing_time = time.time() - start_time
        logger.info(f"✅ Request processed in {processing_time:.2f} seconds")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        processing_time = time.time() - start_time
        logger.info(f"❌ Request failed after {processing_time:.2f} seconds")
        
        return jsonify({
            'success': False,
            'message': 'Có lỗi xảy ra khi xử lý yêu cầu'
        }), 500


@app.route('/api/schedules', methods=['GET'])
def get_schedules():
    """API lấy lịch trình"""
    try:
        if not db_manager:
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503

        user_id = get_valid_user_id(request.args)  # Sử dụng hàm mới
        date = request.args.get('date')
        
        from models import ScheduleModel
        schedule_model = ScheduleModel(db_manager)
        schedules = schedule_model.get_user_schedules(user_id, date)
        
        schedule_list = []
        for schedule in schedules:
            schedule_list.append({
                'id': schedule.id,
                'title': schedule.title,
                'description': schedule.description,
                'start_time': schedule.start_time.isoformat() if hasattr(schedule.start_time, 'isoformat') else schedule.start_time,
                'end_time': schedule.end_time.isoformat() if hasattr(schedule.end_time, 'isoformat') else schedule.end_time,
                'status': schedule.status,
                'priority': schedule.priority,
                'category': schedule.category
            })
        
        return jsonify({
            'success': True,
            'schedules': schedule_list
        })
        
    except Exception as e:
        logger.error(f"Get schedules error: {e}")
        return jsonify({
            'success': False,
            'message': 'Lỗi khi lấy lịch trình'
        }), 500

@app.route('/api/schedules/upcoming', methods=['GET'])
def get_upcoming_schedules():
    """API lấy lịch trình sắp tới"""
    try:
        if not db_manager:
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503

        user_id = get_valid_user_id(request.args)  # Sử dụng hàm mới
        hours = request.args.get('hours', 24, type=int)
        
        from models import ScheduleModel
        schedule_model = ScheduleModel(db_manager)
        schedules = schedule_model.get_upcoming_schedules(user_id, hours)
        
        return jsonify({
            'success': True,
            'schedules': [
                {
                    'id': s.id,
                    'title': s.title,
                    'start_time': s.start_time.isoformat() if hasattr(s.start_time, 'isoformat') else s.start_time,
                    'end_time': s.end_time.isoformat() if hasattr(s.end_time, 'isoformat') else s.end_time,
                    'priority': s.priority
                } for s in schedules
            ]
        })
        
    except Exception as e:
        logger.error(f"Get upcoming schedules error: {e}")
        return jsonify({'success': False, 'message': 'Lỗi khi lấy lịch trình sắp tới'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
