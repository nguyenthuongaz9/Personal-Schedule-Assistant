import { useState, useCallback } from 'react';
import { chatAPI } from '@/lib/api';
import { AIResponse, ChatMessage } from '@/types';
import toast from 'react-hot-toast';
import { useAppStore } from './app-store';

export function useChat() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, addChatMessage, setSchedules, addSchedule } = useAppStore();

  const sendMessage = useCallback(async (message: string): Promise<AIResponse> => {
    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }

    setIsLoading(true);
    setError(null);

    // Hiển thị toast loading trong thời gian dài
    const loadingToast = toast.loading('Đang xử lý yêu cầu... (Có thể mất đến 5 phút)');

    try {
      const response = await chatAPI.sendMessage({
        user_id: user.id,
        message: message.trim(),
      });

      toast.dismiss(loadingToast);

      if (response.success) {
        // Handle schedule creation
        if (response.type === 'schedule_created' && response.schedule_id) {
          toast.success(response.message);
        }

        // Handle schedule list
        if (response.schedules) {
          setSchedules(response.schedules);
        }

        return response;
      } else {
        throw new Error(response.message || 'Something went wrong');
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      
      const errorMessage = err.response?.data?.message || err.message || 'Connection error';
      setError(errorMessage);
      
      // Hiển thị thông báo lỗi thân thiện
      if (errorMessage.includes('timeout')) {
        toast.error('Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại với câu ngắn hơn.');
      } else if (errorMessage.includes('Network error')) {
        toast.error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      } else {
        toast.error(errorMessage);
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user.id, setSchedules, addSchedule]);

  const clearError = useCallback(() => setError(null), []);

  return {
    sendMessage,
    isLoading,
    error,
    clearError,
  };
}
