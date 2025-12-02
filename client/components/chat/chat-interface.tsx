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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const { chatHistory, addChatMessage, } = useAppStore();
  const { sendMessage, isLoading } = useChat();

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLongRequest(true);
        toast.loading('Request đang mất nhiều thời gian. Vui lòng chờ...', {
          duration: 10000,
          id: 'long-request-warning'
        });
      }, 30000); 

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

      
      if (response.success && response?.type === 'schedule_created') {
        toast.success(response?.message);
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
    setTimeout(() => {
      const input = document.querySelector('input[placeholder*="Nhập tin nhắn"]') as HTMLInputElement;
      input?.focus();
    }, 100);
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {isLongRequest && (
        <div className="flex-shrink-0 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mx-4 mt-4 flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-700">
            Request đang mất nhiều thời gian. Đây là bình thường với AI model lớn.
          </span>
        </div>
      )}

      {isLoading && (
        <div className="flex-shrink-0 bg-blue-50 border border-blue-200 rounded-lg p-3 mx-4 mt-2 flex items-center space-x-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-700">
            Đang xử lý... Có thể mất đến 5 phút
          </span>
        </div>
      )}

      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        <div className="space-y-4 min-h-full">
          {chatHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <SuggestedMessages onMessageClick={handleSuggestedMessageClick} />
              </div>
            </div>
          ) : (
            <>
              {chatHistory.map((message) => (
                <Message key={message.id} message={message} />
              ))}
              {isLoading && <TypingIndicator />}
            </>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
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
      </div>
    </div>
  );
};