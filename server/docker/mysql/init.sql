CREATE DATABASE IF NOT EXISTS personal_scheduler;
USE personal_scheduler;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fullname VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    event VARCHAR(255) NOT NULL COMMENT 'Tên sự kiện',
    description TEXT COMMENT 'Mô tả chi tiết',
    start_time DATETIME NOT NULL COMMENT 'Thời gian bắt đầu',
    end_time DATETIME COMMENT 'Thời gian kết thúc',
    location VARCHAR(500) COMMENT 'Địa điểm',
    reminder_minutes INT COMMENT 'Thông báo trước (phút)',
    category VARCHAR(100) NOT NULL COMMENT 'Danh mục',
    priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium' COMMENT 'Độ ưu tiên',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT 'Trạng thái',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian tạo',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời gian cập nhật',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_schedules_user_id ON schedules(user_id);
CREATE INDEX idx_schedules_start_time ON schedules(start_time);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_category ON schedules(category);
CREATE INDEX idx_users_email ON users(email);
