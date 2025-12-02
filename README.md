
🗓️ Personal Schedule Assistant
Ứng dụng quản lý lịch trình cá nhân thông minh với trợ lý AI, hỗ trợ tiếng Việt và xử lý ngôn ngữ tự nhiên.

https://img.shields.io/badge/Architecture-Microservices-blue
https://img.shields.io/badge/Python-3.9+-green
https://img.shields.io/badge/Next.js-14.0+-blue
https://img.shields.io/badge/AI-Ollama-orange

✨ Tính năng chính
🤖 Trợ lý AI thông minh
Xử lý ngôn ngữ tự nhiên tiếng Việt - Giao tiếp tự nhiên như nói chuyện với người

Đa dạng intent: Tạo lịch, xem lịch, cập nhật, xóa lịch trình

Tích hợp Ollama - Chạy AI model cục bộ, bảo mật dữ liệu

📅 Quản lý lịch trình
Tạo lịch nhanh bằng giọng nói tự nhiên

Xem lịch theo ngày/tuần với giao diện trực quan

Phân loại và ưu tiên công việc

Nhắc nhở thông minh

🎨 Giao diện hiện đại
Responsive design - Hoạt động trên mọi thiết bị

Dark/Light mode (coming soon)

Real-time updates - Cập nhật tức thì

Vietnamese UI - Giao diện tiếng Việt thân thiện

🏗️ Kiến trúc hệ thống
text
Frontend (Next.js) ←→ Backend (Flask) ←→ Database (MySQL)
                            ↓
                       AI Service (Ollama)
Tech Stack
Frontend: Next.js 14, TypeScript, Tailwind CSS, Zustand

Backend: Python Flask, MySQL Connector

AI: Ollama với các model Mistral/TinyLlama

Database: MySQL 8.0

Container: Docker & Docker Compose

🚀 Quick Start
Prerequisites
Docker & Docker Compose

4GB RAM trở lên

10GB disk space trở lên

Cài đặt nhanh (Recommended)
bash
# Clone repository
git clone 
cd ai_assistant_calendar_management

# Khởi động toàn bộ hệ thống
docker compose up -d

# Kiểm tra trạng thái
docker compose ps

# Truy cập ứng dụng
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Ollama: http://localhost:11434
Cài đặt thủ công
Backend
bash
cd server

# Tạo virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# hoặc venv\Scripts\activate  # Windows

# Cài dependencies
pip install -r requirements.txt

# Chạy backend
python app.py
Frontend
bash
cd frontend

# Cài dependencies
npm install

# Chạy development server
npm run dev
Ollama (AI Service)
bash
# Cài đặt Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull model (chọn 1)
ollama pull mistral:7b      # Cân bằng tốt
ollama pull tinyllama       # Nhẹ và nhanh
ollama pull codellama:7b    # Tốt cho text

# Khởi động Ollama
ollama serve
📖 Hướng dẫn sử dụng
Giao tiếp với trợ lý AI
Bạn có thể nói chuyện tự nhiên bằng tiếng Việt:

text
💬 "Đặt lịch họp với team ngày mai lúc 9h sáng"
💬 "Xem lịch trình của tôi hôm nay"
💬 "Tôi có lịch gì chiều nay không?"
💬 "Tạo lịch khám sức khỏe thứ 6 tuần này"
💬 "Hủy lịch họp chiều nay"
Các tính năng chính
Chat Interface: Trò chuyện trực tiếp với AI assistant

Calendar View: Xem lịch trình dạng lịch tháng

List View: Danh sách lịch trình chi tiết

Smart Scheduling: AI tự động phân tích và tạo lịch

Ví dụ sử dụng
python
# Tạo lịch trình qua API
import requests

response = requests.post('http://localhost:5000/api/chat', {
    'user_id': 1,
    'message': 'Đặt lịch họp review dự án ngày mai lúc 14:00'
})

print(response.json())
# {
#   "success": true,
#   "message": "✅ Đã tạo lịch 'họp review dự án' vào lúc 14:00 02/12/2024",
#   "type": "schedule_created"
# }
🔧 Cấu hình
Environment Variables
Backend (.env)
env
# Database
MYSQL_HOST=localhost
MYSQL_USER=app_user
MYSQL_PASSWORD=app_password
MYSQL_DB=personal_scheduler
MYSQL_PORT=3306

# Ollama
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=mistral:7b
OLLAMA_TIMEOUT=30

# App
SECRET_KEY=your-secret-key
DEBUG=True
Frontend (.env.local)
env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_REQUEST_TIMEOUT=120000
Tùy chọn Model AI
Model	Size	Speed	Quality	Use Case
tinyllama	500MB	⚡⚡⚡⚡	⭐⭐	Demo, Testing
phi	1.6GB	⚡⚡⚡	⭐⭐⭐	General Purpose
mistral:7b	4.1GB	⚡⚡	⭐⭐⭐⭐	Production
codellama:7b	3.8GB	⚡⚡	⭐⭐⭐⭐	Text Processing
🗃️ Database Schema
sql
-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

-- Schedules table  
CREATE TABLE schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('scheduled', 'completed', 'cancelled'),
    priority ENUM('low', 'medium', 'high')
);

🛠️ Development
Project Structure
text
ai_assistant_calendar_management/
├── server/                 # Python Flask Backend
│   ├── app.py             # Main application
│   ├── models.py          # Database models
│   ├── nlp_processor.py   # AI NLP processing
│   ├── ai_assistant.py    # AI assistant logic
│   ├── database.py        # Database management
│   ├── config.py          # Configuration
│   └── requirements.txt
├── frontend/              # Next.js Frontend
│   ├── app/               # App router
│   ├── components/        # React components
│   ├── lib/               # Utilities
│   ├── hooks/             # Custom hooks
│   └── types/             # TypeScript types
└── docker-compose.yml     # Docker configuration
API Endpoints
Method	Endpoint	Description
GET	/api/health	Health check
POST	/api/chat	Chat with AI assistant
GET	/api/schedules	Get user schedules
POST	/api/schedules	Create new schedule
GET	/api/schedules/upcoming	Get upcoming schedules
Development Commands
bash
# Backend development
cd server
python app.py

# Frontend development  
cd frontend
npm run dev

# Database management
docker exec -it mysqldb mysql -u app_user -p personal_scheduler

# Ollama management
docker exec -it ollama ollama list
🐛 Troubleshooting
Common Issues
Ollama connection timeout

bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama service
docker restart ollama
Database connection issues

bash
# Check MySQL container
docker compose logs mysql

# Reset database
docker compose down -v
docker compose up -d mysql
Model download issues

bash
# Clean pull
docker exec ollama ollama rm mistral:7b
docker exec ollama ollama pull mistral:7b
Performance Tips
Sử dụng tinyllama cho development

Tăng RAM nếu model chậm

Sử dụng SSD để tăng tốc model loading

Giới hạn num_predict trong Ollama options

🤝 Contributing
We welcome contributions! Please see our Contributing Guide for details.

Development Setup
Fork the repository

Create a feature branch

Make your changes

Add tests

Submit a pull request

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
Ollama for making local AI accessible

Next.js for the amazing React framework

Flask for lightweight Python backend

Tailwind CSS for beautiful UI components

📞 Support
📧 Email: support@example.com

💬 Issues: GitHub Issues

📚 Documentation: Project Wiki

