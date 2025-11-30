USE personal_scheduler;

INSERT IGNORE INTO users (id, username, email) VALUES
(1, 'demo_user', 'demo@example.com');

INSERT IGNORE INTO schedules (user_id, title, description, start_time, end_time, category, priority) VALUES
(1, 'Họp team hàng tuần', 'Họp đánh giá công việc tuần', DATE_ADD(NOW(), INTERVAL 1 DAY), DATE_ADD(NOW(), INTERVAL 1 DAY + INTERVAL 1 HOUR), 'meeting', 'high'),
(1, 'Gặp đối tác', 'Thảo luận hợp đồng mới', DATE_ADD(NOW(), INTERVAL 2 DAY), DATE_ADD(NOW(), INTERVAL 2 DAY + INTERVAL 2 HOUR), 'business', 'medium'),
(1, 'Khám sức khỏe', 'Khám sức khỏe định kỳ', DATE_ADD(NOW(), INTERVAL 3 DAY), DATE_ADD(NOW(), INTERVAL 3 DAY + INTERVAL 1 HOUR), 'health', 'high');

INSERT IGNORE INTO nlp_patterns (intent, pattern_type, pattern_value, language, weight) VALUES
('create_schedule', 'keyword', 'tạo lịch', 'vi', 1.0),
('create_schedule', 'keyword', 'lập lịch', 'vi', 1.0),
('create_schedule', 'keyword', 'thêm lịch', 'vi', 1.0),
('create_schedule', 'regex', '(đặt|lập|tạo)\\s+(lịch|cuộc họp|sự kiện)', 'vi', 1.2),
('create_schedule', 'regex', '(mai|ngày mai|hôm nay|chiều nay|sáng nay)\\s+(.*)\\s+lúc\\s+(\\d+)', 'vi', 1.5),

('query_schedule', 'keyword', 'xem lịch', 'vi', 1.0),
('query_schedule', 'keyword', 'kiểm tra lịch', 'vi', 1.0),
('query_schedule', 'keyword', 'lịch trình', 'vi', 1.0),
('query_schedule', 'regex', '(xem|kiểm tra|tra cứu)\\s+(lịch|lịch trình)', 'vi', 1.2),
('query_schedule', 'regex', '(có|lịch)\\s+gì\\s+(mai|hôm nay|tuần này)', 'vi', 1.3),

('update_schedule', 'keyword', 'thay đổi lịch', 'vi', 1.0),
('update_schedule', 'keyword', 'chỉnh sửa lịch', 'vi', 1.0),
('update_schedule', 'keyword', 'cập nhật lịch', 'vi', 1.0),
('update_schedule', 'regex', '(thay đổi|chỉnh sửa|cập nhật|dời)\\s+(lịch|cuộc họp)', 'vi', 1.2),

('delete_schedule', 'keyword', 'hủy lịch', 'vi', 1.0),
('delete_schedule', 'keyword', 'xóa lịch', 'vi', 1.0),
('delete_schedule', 'regex', '(hủy|xóa|xoá)\\s+(lịch|cuộc hẹn)', 'vi', 1.2);
