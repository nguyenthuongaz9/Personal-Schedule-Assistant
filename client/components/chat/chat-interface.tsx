'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Clock, AlertTriangle } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import { Message } from './message';
import { TypingIndicator } from './typing-indicator';
import { SuggestedMessages } from './suggested-messages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { useAppStore } from '@/hooks/app-store';

export const ChatInterface: React.FC = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLongRequest, setIsLongRequest] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { chatHistory, addChatMessage, setSchedules } = useAppStore();
  const { sendMessage, isLoading } = useChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Hiển thị cảnh báo cho request dài
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLongRequest(true);
        toast.loading('Request đang mất nhiều thời gian. Vui lòng chờ...', {
          duration: 10000, // 10 giây
          id: 'long-request-warning'
        });
      }, 30000); // Sau 30 giây

      return () => {
        clearTimeout(timer);
        toast.dismiss('long-request-warning');
      };
    } else {
      setIsLongRequest(false);
    }
  }, [isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user' as const,
      text: inputMessage.trim(),
      timestamp: new Date(),
    };

    addChatMessage(userMessage);
    setInputMessage('');

    try {
      const response = await sendMessage(inputMessage.trim());
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant' as const,
        text: response.message || 'Đã xử lý yêu cầu của bạn',
        timestamp: new Date(),
        data: response,
      };

      addChatMessage(aiMessage);

      if (response.schedules) {
        setSchedules(response.schedules);
      }

      if (response.success && response.type === 'schedule_created') {
        toast.success(response.message);
      }

    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant' as const,
        text: 'Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại.',
        timestamp: new Date(),
        isError: true,
      };
      addChatMessage(errorMessage);
    }
  };

  const handleSuggestedMessageClick = (message: string) => {
    setInputMessage(message);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Warning for long requests */}
      {isLongRequest && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mx-4 mt-4 flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-700">
            Request đang mất nhiều thời gian. Đây là bình thường với AI model lớn.
          </span>
        </div>
      )}

      {/* Processing info */}
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mx-4 mt-2 flex items-center space-x-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-700">
            Đang xử lý... Có thể mất đến 5 phút
          </span>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="text-center py-12">
            <SuggestedMessages onMessageClick={handleSuggestedMessageClick} />
          </div>
        ) : (
          chatHistory.map((message) => (
            <Message key={message.id} message={message} />
          ))
        )}
        
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSendMessage} className="flex space-x-4">
          <div className="flex-1">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Nhập tin nhắn... (Có thể mất đến 5 phút để xử lý)"
              disabled={isLoading}
              className={isLoading ? 'opacity-70' : ''}
            />
            {isLoading && (
              <p className="text-xs text-gray-500 mt-1">
                ⏳ Đang xử lý với AI... Vui lòng chờ
              </p>
            )}
          </div>
          <Button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="flex items-center space-x-2 min-w-[80px]"
          >
            {isLoading ? (
              <Clock className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Đợi...' : 'Gửi'}</span>
          </Button>
        </form>
        
        {/* Additional info */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          <p>💡 Mẹo: Sử dụng câu ngắn gọn để xử lý nhanh hơn</p>
        </div>
      </div>
    </div>
  );
};
