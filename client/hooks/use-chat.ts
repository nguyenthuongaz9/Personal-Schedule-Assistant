import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/axios-client';
import { ChatRequest, AIResponse, ApiResponse } from '@/types/api';

export const useChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AIResponse | null>(null);

  const sendMessage = useCallback(async (message: string): Promise<ApiResponse<AIResponse>> => {
    setIsLoading(true);
    setError(null);

    try {
      const chatRequest: ChatRequest = {
        message: message.trim()
      };

      const result = await apiClient.sendChatMessage(chatRequest);
      
      if (result.success && result.data) {
        setResponse(result.data);
      } else {
        setError(result.message || 'Không thể xử lý tin nhắn');
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Có lỗi xảy ra khi gửi tin nhắn';
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  return {
    sendMessage,
    clearChat,
    isLoading,
    error,
    response,
    setResponse
  };
};