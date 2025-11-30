import React from 'react';
import { User, Bot, AlertCircle } from 'lucide-react';
import { ChatMessage } from '@/types';
import { format } from 'date-fns';

interface MessageProps {
  message: ChatMessage;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.type === 'user';
  const isError = message.isError;

  const formatTime = (timestamp: Date) => {
    return format(timestamp, 'HH:mm');
  };

  return (
    <div className={`flex space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary-600' : isError ? 'bg-red-500' : 'bg-green-500'
      }`}>
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : isError ? (
          <AlertCircle className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>
      
      <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block max-w-[70%] rounded-2xl px-4 py-2 ${
          isUser 
            ? 'bg-primary-600 text-white' 
            : isError
            ? 'bg-red-100 text-red-800 border border-red-200'
            : 'bg-gray-100 text-gray-900'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        </div>
        
        {message.data?.schedules && message.data.schedules.length > 0 && (
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800 font-medium mb-2">
              📅 Tìm thấy {message.data.schedules.length} lịch trình:
            </p>
            <div className="space-y-1">
              {message.data.schedules.map((schedule: any, index: number) => (
                <div key={index} className="text-sm text-blue-700">
                  • {schedule.title} - {schedule.start_time}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : ''}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};
