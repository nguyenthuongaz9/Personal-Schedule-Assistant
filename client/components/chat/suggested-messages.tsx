import React from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuggestedMessagesProps {
  onMessageClick: (message: string) => void;
}

const suggestedMessages = [
  "Đặt lịch họp với team ngày mai lúc 9h sáng",
  "Xem lịch trình của tôi hôm nay",
  "Tôi có lịch gì vào chiều nay?",
  "Tạo lịch khám sức khỏe thứ 6 tuần này",
  "Hủy lịch họp chiều nay",
  "Thêm lịch gặp đối tác tuần sau",
];

export const SuggestedMessages: React.FC<SuggestedMessagesProps> = ({ 
  onMessageClick 
}) => {
  return (
    <div className="max-w-2xl mx-auto">
      <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
        Chào bạn! Tôi là trợ lý ảo
      </h3>
      <p className="text-gray-600 mb-6 text-center">
        Tôi có thể giúp bạn quản lý lịch trình. Hãy thử một trong những câu sau:
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestedMessages.map((message, index) => (
          <button
            key={index}
            onClick={() => onMessageClick(message)}
            className="text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-2 group-hover:bg-primary-600 transition-colors"></div>
              <span className="text-sm text-gray-700 group-hover:text-gray-900 leading-relaxed">
                {message}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Hoặc nhập tin nhắn của bạn ở bên dưới
        </p>
      </div>
    </div>
  );
};
