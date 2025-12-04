import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/axios-client';
import { ScheduleRequest, ApiResponse } from '@/types/api';
import { Schedule } from '@/types';

export const useSchedules = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const fetchSchedules = useCallback(async (date?: string): Promise<ApiResponse<Schedule[]>> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.getSchedules(date);
      
      if (result.success && result.data) {
        setSchedules(result.data);
      } else {
        setError(result.message || 'Không thể lấy lịch trình');
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Có lỗi xảy ra khi lấy lịch trình';
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUpcomingSchedules = useCallback(async (hours: number = 24): Promise<ApiResponse<Schedule[]>> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.getUpcomingSchedules(hours);
      
      if (result.success && result.data) {
        setSchedules(result.data);
      } else {
        setError(result.message || 'Không thể lấy lịch trình sắp tới');
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Có lỗi xảy ra khi lấy lịch trình sắp tới';
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSchedule = useCallback(async (data: Schedule): Promise<ApiResponse<any>> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.createSchedule(data);
      
      if (result.success) {
        await fetchSchedules();
      } else {
        setError(result.message || 'Không thể tạo lịch trình');
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Có lỗi xảy ra khi tạo lịch trình';
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [fetchSchedules]);

  const updateSchedule = useCallback(async (scheduleId: number, data: ScheduleRequest): Promise<ApiResponse<any>> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.updateSchedule(scheduleId, data);
      
      if (result.success) {
        await fetchSchedules();
      } else {
        setError(result.message || 'Không thể cập nhật lịch trình');
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Có lỗi xảy ra khi cập nhật lịch trình';
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [fetchSchedules]);

  const deleteSchedule = useCallback(async (scheduleId: number): Promise<ApiResponse<any>> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.deleteSchedule(scheduleId);
      
      if (result.success) {
        setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      } else {
        setError(result.message || 'Không thể xóa lịch trình');
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Có lỗi xảy ra khi xóa lịch trình';
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    schedules,
    isLoading,
    error,
    fetchSchedules,
    fetchUpcomingSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    setSchedules
  };
};