import { useState, useCallback, useEffect } from 'react';
import { scheduleAPI } from '@/lib/api';
import { Schedule } from '@/types';
import toast from 'react-hot-toast';
import { useAppStore } from './app-store';

export function useSchedules() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, schedules, setSchedules } = useAppStore();

  const fetchSchedules = useCallback(async (date?: string): Promise<Schedule[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await scheduleAPI.getSchedules(user.id, date);
      
      if (response.success) {
        const schedulesData = response.schedules || response.data || [];
        setSchedules(schedulesData);
        return schedulesData;
      } else {
        throw new Error(response.message || 'Failed to fetch schedules');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load schedules';
      setError(errorMessage);
      
      if (errorMessage.includes('timeout')) {
        toast.error('Tải lịch trình mất quá nhiều thời gian. Vui lòng thử lại.');
      } else {
        toast.error(errorMessage);
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user.id, setSchedules]);

  const fetchUpcomingSchedules = useCallback(async (hours: number = 24): Promise<Schedule[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await scheduleAPI.getUpcomingSchedules(user.id, hours);
      
      if (response.success) {
        const schedulesData = response.schedules || response.data || [];
        setSchedules(schedulesData);
        return schedulesData;
      } else {
        throw new Error(response.message || 'Failed to fetch upcoming schedules');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load upcoming schedules';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user.id, setSchedules]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  return {
    schedules,
    isLoading,
    error,
    fetchSchedules,
    fetchUpcomingSchedules,
    refetch: fetchSchedules,
  };
}
