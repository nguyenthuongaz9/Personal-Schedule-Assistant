from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from config import config
import time
from database import DatabaseManager
from ai_assistant import PersonalAssistant
import jwt
import datetime
from functools import wraps
import hashlib
import re
from models import UserModel


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)


try:
    app_config = config['development']
    app.config.from_object(app_config)
    logger.info("Configuration loaded successfully")
except Exception as e:
    logger.error(f"Failed to load configuration: {e}")
    app_config = None

app.config['JWT_SECRET_KEY'] = app.config.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(hours=24)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)


db_manager = None
assistant = None

try:
    if app_config:
        db_manager = DatabaseManager(app_config)
        logger.info("DatabaseManager initialized successfully")
    else:
        logger.error("Cannot initialize DatabaseManager: app_config is None")
except Exception as e:
    logger.error(f"Failed to initialize DatabaseManager: {e}")

try:
    if app_config and db_manager:
        assistant = PersonalAssistant(app_config, db_manager)
        logger.info("PersonalAssistant initialized successfully")
        logger.info(f"Using Ollama model: {getattr(app_config, 'OLLAMA_MODEL', 'llama2')}")
    else:
        logger.warning("Cannot initialize PersonalAssistant due to missing dependencies")
except Exception as e:
    logger.error(f"Failed to initialize PersonalAssistant: {e}")

def validate_email(email: str) -> bool:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def token_required(f):
    
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
     
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  
            except IndexError:
                return jsonify({
                    'success': False,
                    'message': 'Token không hợp lệ'
                }), 401
        
        if not token:
            return jsonify({
                'success': False,
                'message': 'Token là bắt buộc'
            }), 401
        
        try:
         
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            current_user_id = data['user_id']
            
            
            if not db_manager:
                return jsonify({
                    'success': False,
                    'message': 'Database service unavailable'
                }), 503
                
            user_model = UserModel(db_manager)
            current_user = user_model.get_user_by_id(current_user_id)
            
            if not current_user:
                return jsonify({
                    'success': False,
                    'message': 'Người dùng không tồn tại'
                }), 401
                
         
            request.user_id = current_user_id
            request.current_user = current_user
            
        except jwt.ExpiredSignatureError:
            return jsonify({
                'success': False,
                'message': 'Token đã hết hạn'
            }), 401
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token error: {e}")
            return jsonify({
                'success': False,
                'message': 'Token không hợp lệ'
            }), 401
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return jsonify({
                'success': False,
                'message': 'Lỗi xác thực token'
            }), 500
        
        return f(*args, **kwargs)
    
    return decorated

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed_password: str) -> bool:
    return hash_password(password) == hashed_password

def generate_token(user_id: int) -> str:
    try:
        payload = {
            'user_id': user_id,
            'exp': datetime.datetime.now(datetime.timezone.utc) + app.config['JWT_ACCESS_TOKEN_EXPIRES']
        }
        
        token = jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm="HS256")
        
      
        if isinstance(token, bytes):
            token = token.decode('utf-8')
            
        return token
    except Exception as e:
        logger.error(f"Token generation error: {e}")
        raise

def check_db_connection():
  
    if not db_manager:
        logger.error("DatabaseManager is not initialized")
        return False
    return True

@app.route('/api/auth/register', methods=['POST'])
def register():
  
    try:
        if not check_db_connection():
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Dữ liệu không hợp lệ'
            }), 400

   
        required_fields = ['email', 'password']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Thiếu trường bắt buộc: {field}'
                }), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        fullname = data.get('fullname', '').strip()
        

        if not validate_email(email):
            return jsonify({
                'success': False,
                'message': 'Email không hợp lệ'
            }), 400
        
     
        if len(password) < 6:
            return jsonify({
                'success': False,
                'message': 'Mật khẩu phải có ít nhất 6 ký tự'
            }), 400
        
        user_model = UserModel(db_manager)

  
        if user_model.get_user_by_email(email):
            return jsonify({
                'success': False,
                'message': 'Email đã được đăng ký'
            }), 400


        hashed_password = hash_password(password)
        
    
        user_id = user_model.create_user(
            email=email,
            password=hashed_password,
            fullname=fullname
        )
        
        if user_id:
            
            token = generate_token(user_id)
            
            
            user = user_model.get_user_by_id(user_id)
            
            if user:
                return jsonify({
                    'success': True,
                    'message': 'Đăng ký thành công',
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'fullname': user.fullname
                    },
                    'token': token
                })
            else:
                logger.error(f"User created but not found: {user_id}")
                return jsonify({
                    'success': False,
                    'message': 'Đăng ký thất bại - không tìm thấy người dùng'
                }), 500
        else:
            return jsonify({
                'success': False,
                'message': 'Đăng ký thất bại'
            }), 500
        
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({
            'success': False,
            'message': 'Có lỗi xảy ra khi đăng ký'
        }), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
   
    try:
        if not check_db_connection():
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Dữ liệu không hợp lệ'
            }), 400
        
      
        required_fields = ['email', 'password']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Thiếu trường bắt buộc: {field}'
                }), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
     
        if not validate_email(email):
            return jsonify({
                'success': False,
                'message': 'Email không hợp lệ'
            }), 400
        
        user_model = UserModel(db_manager)

       
        user = user_model.get_user_by_email(email)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Email hoặc mật khẩu không đúng'
            }), 401
        
     
        if not verify_password(password, user.password):
            return jsonify({
                'success': False,
                'message': 'Email hoặc mật khẩu không đúng'
            }), 401

      
        token = generate_token(user.id)
       
        return jsonify({
            'success': True,
            'message': 'Đăng nhập thành công',
            'user': {
                'id': user.id,
                'email': user.email,
                'fullname': user.fullname,
                'created_at': user.created_at.isoformat() if hasattr(user.created_at, 'isoformat') else str(user.created_at)
            },
            'token': token
        })
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({
            'success': False,
            'message': 'Có lỗi xảy ra khi đăng nhập'
        }), 500

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user():
    
    try:
        if not check_db_connection():
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503
        
        user_model = UserModel(db_manager)
        user = user_model.get_user_by_id(request.user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Người dùng không tồn tại'
            }), 404
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'fullname': user.fullname,
                'created_at': user.created_at.isoformat() if hasattr(user.created_at, 'isoformat') else str(user.created_at),
                'updated_at': user.updated_at.isoformat() if hasattr(user.updated_at, 'isoformat') else str(user.updated_at)
            }
        })
        
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        return jsonify({
            'success': False,
            'message': 'Có lỗi xảy ra khi lấy thông tin người dùng'
        }), 500

@app.route('/api/auth/update-profile', methods=['PUT'])
@token_required
def update_profile():
    try:
        if not check_db_connection():
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Dữ liệu không hợp lệ'
            }), 400
        
        user_model = UserModel(db_manager)
        update_data = {}
        
       
        if 'fullname' in data:
            update_data['fullname'] = data['fullname'].strip()
      
        if 'email' in data:
            email = data['email'].strip().lower()
            
            if not validate_email(email):
                return jsonify({
                    'success': False,
                    'message': 'Email không hợp lệ'
                }), 400


            existing_user = user_model.get_user_by_email(email)
            if existing_user and existing_user.id != request.user_id:
                return jsonify({
                    'success': False,
                    'message': 'Email đã được sử dụng'
                }), 400
            update_data['email'] = email

 
        if 'current_password' in data and 'new_password' in data:
            user = user_model.get_user_by_id(request.user_id)
            if not verify_password(data['current_password'], user.password):
                return jsonify({
                    'success': False,
                    'message': 'Mật khẩu hiện tại không đúng'
                }), 400
            
            if len(data['new_password']) < 6:
                return jsonify({
                    'success': False,
                    'message': 'Mật khẩu mới phải có ít nhất 6 ký tự'
                }), 400
            
            update_data['password'] = hash_password(data['new_password'])
        
        
        if update_data:
            success = user_model.update_user(request.user_id, update_data)
            
            if success:
                updated_user = user_model.get_user_by_id(request.user_id)
                return jsonify({
                    'success': True,
                    'message': 'Cập nhật thông tin thành công',
                    'user': {
                        'id': updated_user.id,
                        'email': updated_user.email,
                        'fullname': updated_user.fullname
                    }
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Cập nhật thông tin thất bại'
                }), 500
        else:
            return jsonify({
                'success': False,
                'message': 'Không có dữ liệu để cập nhật'
            }), 400
        
    except Exception as e:
        logger.error(f"Update profile error: {e}")
        return jsonify({
            'success': False,
            'message': 'Có lỗi xảy ra khi cập nhật thông tin'
        }), 500

@app.route('/api/auth/check-email', methods=['POST'])
def check_email_availability():
   
    try:
        if not check_db_connection():
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503
        
        data = request.get_json()
        if not data or 'email' not in data:
            return jsonify({
                'success': False,
                'message': 'Thiếu thông tin email'
            }), 400
        
        email = data['email'].strip().lower()

        if not validate_email(email):
            return jsonify({
                'success': False,
                'available': False,
                'message': 'Email không hợp lệ'
            })
        
        user_model = UserModel(db_manager)

        user = user_model.get_user_by_email(email)
        
        return jsonify({
            'success': True,
            'available': user is None,
            'message': 'Email đã được sử dụng' if user else 'Email có thể sử dụng'
        })
        
    except Exception as e:
        logger.error(f"Check email error: {e}")
        return jsonify({
            'success': False,
            'available': False,
            'message': 'Có lỗi xảy ra khi kiểm tra email'
        }), 500

@app.route('/api/chat', methods=['POST'])
@token_required
def chat_endpoint():
  
    start_time = time.time()
    
    try:
        if not assistant:
            return jsonify({
                'success': False,
                'message': 'Service temporarily unavailable. Please try again later.'
            }), 503
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Invalid JSON data'
            }), 400
            
        user_id = request.user_id
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({
                'success': False,
                'message': 'Tin nhắn không được để trống'
            }), 400
        
        logger.info(f"Processing message from user {user_id}: '{message}'")
        
      
        response = assistant.process_message(user_id, message)
        
        processing_time = time.time() - start_time
        logger.info(f"Request processed in {processing_time:.2f} seconds")
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        processing_time = time.time() - start_time
        logger.info(f"Request failed after {processing_time:.2f} seconds")
        
        return jsonify({
            'success': False,
            'message': 'Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại sau.'
        }), 500




@app.route('/api/schedules', methods=['GET'])
@token_required
def get_schedules():
    try:
        if not check_db_connection():
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503

        user_id = request.user_id
        date = request.args.get('date')
        
        from models import ScheduleModel
        schedule_model = ScheduleModel(db_manager)
        schedules = schedule_model.get_user_schedules(user_id, date)
        
        schedule_list = []
        for schedule in schedules:
            
            if isinstance(schedule, dict):
                
                schedule_info = {
                    'id': schedule.get('id'),
                    'title': schedule.get('title', ''),
                    'description': schedule.get('description', ''),
                    'start_time': schedule.get('start_time'),
                    'end_time': schedule.get('end_time'),
                    'status': schedule.get('status', 'pending'),
                    'priority': schedule.get('priority', 'medium'),
                    'category': schedule.get('category', '')
                }
            else:
               
                schedule_info = {
                    'id': schedule.id,
                    'title': schedule.title,
                    'description': schedule.description,
                    'start_time': schedule.start_time.isoformat() if hasattr(schedule.start_time, 'isoformat') else str(schedule.start_time),
                    'end_time': schedule.end_time.isoformat() if hasattr(schedule.end_time, 'isoformat') else str(schedule.end_time),
                    'status': schedule.status,
                    'priority': schedule.priority,
                    'category': schedule.category
                }
            
            # Xử lý datetime nếu cần (cho cả dict và object)
            if schedule_info['start_time'] and hasattr(schedule_info['start_time'], 'isoformat'):
                schedule_info['start_time'] = schedule_info['start_time'].isoformat()
            
            if schedule_info['end_time'] and hasattr(schedule_info['end_time'], 'isoformat'):
                schedule_info['end_time'] = schedule_info['end_time'].isoformat()
            
            schedule_list.append(schedule_info)
        
        return jsonify({
            'success': True,
            'schedules': schedule_list,
            'count': len(schedule_list)
        })
        
    except Exception as e:
        logger.error(f"Get schedules error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'message': 'Lỗi khi lấy lịch trình'
        }), 500







@app.route('/api/schedules/upcoming', methods=['GET'])
@token_required
def get_upcoming_schedules():
    try:
        if not check_db_connection():
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503

        user_id = request.user_id
        hours = request.args.get('hours', 24, type=int)
        
        from models import ScheduleModel
        schedule_model = ScheduleModel(db_manager)
        schedules = schedule_model.get_upcoming_schedules(user_id, hours)
        
        # schedules đã là danh sách các dictionary từ method get_upcoming_schedules
        # Không cần chuyển đổi lại, chỉ cần trích xuất thông tin cần thiết
        
        schedule_list = []
        for schedule in schedules:
            schedule_info = {
                'id': schedule['id'],  # Sửa: schedule là dict, dùng schedule['id']
                'title': schedule['title'],
                'start_time': schedule['start_time'],  # Đã được format trong model
                'end_time': schedule['end_time'],      # Đã được format trong model
                'priority': schedule['priority'],
                'category': schedule['category'],
                'status': schedule.get('status', 'scheduled')  # Thêm trạng thái nếu cần
            }
            schedule_list.append(schedule_info)
        
        return jsonify({
            'success': True,
            'schedules': schedule_list,
            'count': len(schedule_list),
            'timeframe_hours': hours
        })
        
    except Exception as e:
        logger.error(f"Get upcoming schedules error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False, 
            'message': 'Lỗi khi lấy lịch trình sắp tới'
        }), 500



@app.route('/api/schedules', methods=['POST'])
@token_required
def create_schedule():
    try:
        if not check_db_connection():
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Dữ liệu không hợp lệ'
            }), 400
        
        required_fields = ['title', 'start_time', 'end_time']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Thiếu trường bắt buộc: {field}'
                }), 400
        
        user_id = request.user_id
        
        from models import ScheduleModel
        schedule_model = ScheduleModel(db_manager)
        data_template = {
            'title': data['title'],
            'description': data.get('description', ''),
            'start_time': data['start_time'],
            'end_time': data['end_time'],
            'priority': data.get('priority', 'medium'),
            'category': data.get('category', 'general')
        }
        
        schedule_id = schedule_model.create_schedule(
            user_id,
            data_template
        )
        
        return jsonify({
            'success': True,
            'message': 'Tạo lịch trình thành công',
            'schedule_id': schedule_id
        })
        
    except Exception as e:
        logger.error(f"Create schedule error: {e}")
        return jsonify({
            'success': False,
            'message': f'Lỗi khi tạo lịch trình: {str(e)}'
        }), 500



@app.route('/api/schedules/<int:schedule_id>', methods=['PUT'])
@token_required
def update_schedule(schedule_id):
    try:
        if not check_db_connection():
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Dữ liệu không hợp lệ'
            }), 400
        
        required_fields = ['title', 'start_time', 'end_time']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Thiếu trường bắt buộc: {field}'
                }), 400
        
        user_id = request.user_id
        
        from models import ScheduleModel
        schedule_model = ScheduleModel(db_manager)
        
        existing_schedule = schedule_model.get_schedule_by_id_with_user(schedule_id, user_id)
        if not existing_schedule:
            return jsonify({
                'success': False,
                'message': 'Lịch trình không tồn tại'
            }), 404
        
       
        update_data = {
            'title': data['title'],
            'description': data.get('description', ''),
            'start_time': data['start_time'],
            'end_time': data['end_time'],
            'priority': data.get('priority', 'medium'),
            'category': data.get('category', 'general')
        }
        
       
        success = schedule_model.update_schedule(schedule_id, update_data)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Cập nhật lịch trình thành công'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Không thể cập nhật lịch trình'
            }), 500
        
    except Exception as e:
        logger.error(f"Update schedule error: {e}")
        return jsonify({
            'success': False,
            'message': f'Lỗi khi cập nhật lịch trình: {str(e)}'
        }), 500

@app.route('/api/schedules/<int:schedule_id>', methods=['DELETE'])
@token_required
def delete_schedule(schedule_id):
    try:
        if not check_db_connection():
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503

        user_id = request.user_id
        
        from models import ScheduleModel
        schedule_model = ScheduleModel(db_manager)
        
        existing_schedule = schedule_model.get_schedule_by_id_with_user(schedule_id, user_id)
        if not existing_schedule:
            return jsonify({
                'success': False,
                'message': f'Lịch trình không tồn tại hoặc bạn không có quyền xóa'
            }), 404
        
        success = schedule_model.delete_schedule(schedule_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Đã xóa lịch trình ID {schedule_id}',
                'schedule_id': schedule_id
            })
        else:
            return jsonify({
                'success': False,
                'message': f'Không thể xóa lịch trình ID {schedule_id}'
            }), 500
            
    except Exception as e:
        logger.error(f"Delete schedule error: {e}")
        return jsonify({
            'success': False,
            'message': 'Lỗi khi xóa lịch trình'
        }), 500

@app.route('/api/test/ollama', methods=['POST'])
@token_required
def test_ollama():
    try:
        if not assistant:
            return jsonify({
                'success': False,
                'message': 'Assistant not available'
            }), 503
            
        data = request.get_json()
        test_message = data.get('message', 'Xin chào')
        
        logger.info(f"Testing Ollama with message: '{test_message}'")
        
        response = assistant._call_ollama_for_intent(test_message, request.user_id)
        
        return jsonify({
            'success': True,
            'ollama_response': response,
            'message': 'Ollama connection test successful'
        })
        
    except Exception as e:
        logger.error(f"Ollama test error: {e}")
        return jsonify({
            'success': False,
            'message': f'Ollama test failed: {str(e)}'
        }), 500

@app.route('/api/schedules/cursor', methods=['GET'])
@token_required
def get_schedules_cursor():
    
    try:
        if not check_db_connection():
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503

        user_id = request.user_id
        cursor = request.args.get('cursor', type=int)
        limit = request.args.get('limit', 10, type=int)
        date = request.args.get('date')
        direction = request.args.get('direction', 'older')

        from models import ScheduleModel
        schedule_model = ScheduleModel(db_manager)
        
        schedules = schedule_model.get_schedules_by_cursor(
            user_id=user_id, 
            limit=limit,
            date=date,
            direction=direction
        )
        
        schedule_list = []
        for schedule in schedules:
            schedule_info = {
                'id': schedule['id'],
                'title': schedule['title'],
                'description': schedule.get('description', '') or '',
                'start_time': schedule['start_time'],
                'end_time': schedule['end_time'],
                'priority': schedule.get('priority', 'medium'),
                'category': schedule.get('category', 'general')
            }
            schedule_list.append(schedule_info)

        next_cursor = None
        prev_cursor = None
        has_more = False
        
        if schedule_list:
            if direction == 'older':
                next_cursor = schedule_list[-1]['id']
                has_more = len(schedule_list) == limit
            else:
                next_cursor = schedule_list[0]['id']
                has_more = len(schedule_list) == limit
            
            if direction == 'older' and cursor:
                prev_cursor = cursor
            elif direction == 'newer' and len(schedule_list) >= limit:
                prev_cursor = schedule_list[-1]['id']
        
        return jsonify({
            'success': True,
            'schedules': schedule_list,
            'pagination': {
                'next_cursor': next_cursor,
                'prev_cursor': prev_cursor,
                'limit': limit,
                'direction': direction,
                'has_more': has_more
            },
            'count': len(schedule_list)
        })
        
    except Exception as e:
        logger.error(f"Get schedules by cursor error: {e}")
        return jsonify({
            'success': False,
            'message': f'Lỗi khi lấy lịch trình: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        health_status = {
            'api': 'running',
            'database': 'connected' if db_manager and db_manager.check_connection() else 'disconnected',
            'ai_assistant': 'available' if assistant else 'unavailable',
            'timestamp': datetime.datetime.now().isoformat()
        }
        
        status_code = 200 if health_status['database'] == 'connected' else 503
        
        return jsonify({
            'success': health_status['database'] == 'connected',
            'status': health_status
        }), status_code
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            'success': False,
            'status': {
                'api': 'error',
                'error': str(e)
            }
        }), 500
    

@app.route('/api/schedules/range', methods=['GET'])
@token_required
def get_schedules_in_range():
    try:
        if not check_db_connection():
            return jsonify({
                'success': False,
                'message': 'Database service unavailable'
            }), 503

        user_id = request.user_id
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            return jsonify({
                'success': False,
                'message': 'Thiếu tham số start_date hoặc end_date'
            }), 400
        
        from models import ScheduleModel
        schedule_model = ScheduleModel(db_manager)

        query = """
            SELECT * FROM schedules 
            WHERE user_id = %s 
            AND DATE(start_time) BETWEEN %s AND %s
            ORDER BY start_time
        """
        
        schedules = schedule_model.db.execute_query(query, (user_id, start_date, end_date), fetch=True)
        
        schedule_list = []
        for schedule in schedules:
            schedule_info = {
                'id': schedule['id'],
                'title': schedule['title'],
                'description': schedule['description'],
                'start_time': schedule['start_time'].isoformat() if hasattr(schedule['start_time'], 'isoformat') else str(schedule['start_time']),
                'end_time': schedule['end_time'].isoformat() if hasattr(schedule['end_time'], 'isoformat') else str(schedule['end_time']),
                'status': schedule['status'],
                'priority': schedule['priority'],
                'category': schedule['category'],
                'user_id': schedule['user_id'],
                'created_at': schedule['created_at'].isoformat() if hasattr(schedule['created_at'], 'isoformat') else str(schedule['created_at']),
                'updated_at': schedule['updated_at'].isoformat() if hasattr(schedule['updated_at'], 'isoformat') else str(schedule['updated_at'])
            }
            schedule_list.append(schedule_info)
        
        return jsonify({
            'success': True,
            'schedules': schedule_list,
            'count': len(schedule_list)
        })
        
    except Exception as e:
        logger.error(f"Get schedules in range error: {e}")
        return jsonify({
            'success': False,
            'message': 'Lỗi khi lấy lịch trình'
        }), 500

if __name__ == '__main__':
    logger.info("=" * 50)
    logger.info("Starting Personal Scheduler API with Ollama Integration")
    logger.info("=" * 50)
    
    if app_config:
        logger.info(f"Ollama URL: {getattr(app_config, 'OLLAMA_URL', 'http://localhost:11434')}")
        logger.info(f"Ollama Model: {getattr(app_config, 'OLLAMA_MODEL', 'mistral')}")
    
    logger.info(f"JWT Authentication: Enabled")
    logger.info(f"Database Status: {'Connected' if db_manager else 'Disconnected'}")
    logger.info(f"AI Assistant Status: {'Available' if assistant else 'Unavailable'}")
    logger.info("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)