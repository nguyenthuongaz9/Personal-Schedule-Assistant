'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/axios-client';
import { Schedule } from '@/types';
import toast from 'react-hot-toast';
import { differenceInMinutes, isAfter } from 'date-fns';

export const useUpcomingSchedules = () => {
  const [upcomingSchedules, setUpcomingSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [checkInterval, setCheckInterval] = useState(5); 
  const intervalRef = useRef<NodeJS.Timeout>();


  const getDismissedSchedules = (): Set<number> => {
    if (typeof window === 'undefined') return new Set();
    
    try {
      const dismissed = JSON.parse(localStorage.getItem('dismissed_schedules') || '[]');
      const dismissedIds = dismissed
        .filter((item: any) => {
          const dismissedAt = new Date(item.dismissedAt);
          const hoursDiff = (new Date().getTime() - dismissedAt.getTime()) / (1000 * 60 * 60);
          return hoursDiff < 24;
        })
        .map((item: any) => item.id);
      
      return new Set(dismissedIds);
    } catch (error) {
      console.error('Error getting dismissed schedules:', error);
      return new Set();
    }
  };


  const filterDismissedSchedules = (schedules: Schedule[]): Schedule[] => {
    const dismissedIds = getDismissedSchedules();
    return schedules.filter(schedule => !dismissedIds.has(schedule.id));
  };

 
  const dismissSchedule = (scheduleId: number) => {
    try {
      const dismissed = JSON.parse(localStorage.getItem('dismissed_schedules') || '[]');
      dismissed.push({
        id: scheduleId,
        dismissedAt: new Date().toISOString()
      });
      localStorage.setItem('dismissed_schedules', JSON.stringify(dismissed));
      

      setUpcomingSchedules(prev => prev.filter(s => s.id !== scheduleId));
    } catch (error) {
      console.error('Error dismissing schedule:', error);
    }
  };


  const fetchUpcomingSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Fetching upcoming schedules...');
      
      const response = await apiClient.getUpcomingSchedules(24);
      
      console.log('API Response:', {
        success: response.success,
        data: response.data,
        message: response.message
      });
      
      if (response.success && Array.isArray(response.data)) {
        const now = new Date();
        
        console.log('Raw schedules:', response.data);
        

        const upcoming = response.data.filter((schedule: Schedule) => {
          if (!schedule.start_time) return false;
          const scheduleTime = new Date(schedule.start_time);
          return isAfter(scheduleTime, now);
        });

        console.log('Upcoming schedules after filter:', upcoming);

        const sortedSchedules = upcoming.sort((a, b) => {
          const timeA = new Date(a.start_time).getTime();
          const timeB = new Date(b.start_time).getTime();
          return timeA - timeB;
        });

 
        const filteredSchedules = filterDismissedSchedules(sortedSchedules);
        setUpcomingSchedules(filteredSchedules);
        setLastChecked(new Date());
        
        console.log('Final filtered schedules:', filteredSchedules);
        
  
        const upcomingNearSchedules = filteredSchedules.filter((schedule: Schedule) => {
          const scheduleTime = new Date(schedule.start_time);
          const diffMinutes = differenceInMinutes(scheduleTime, now);
          return diffMinutes > 0 && diffMinutes <= 15;
        });
        
        console.log('Upcoming near schedules (within 15 min):', upcomingNearSchedules);
        
        if (upcomingNearSchedules.length > 0 && !showNotification) {
          setShowNotification(true);
          
          const nearestSchedule = upcomingNearSchedules[0];
          const diffMinutes = differenceInMinutes(
            new Date(nearestSchedule.start_time), 
            now
          );
 
          toast.success(
            `Lịch trình sắp bắt đầu: ${nearestSchedule.title} (còn ${diffMinutes} phút)`,
            { 
              duration: 5000,
              icon: '⏰'
            }
          );
        }
      } else {
        console.error('Invalid response format:', response);
      }
    } catch (error) {
      console.error('Error fetching upcoming schedules:', error);
      toast.error('Không thể tải lịch trình sắp tới');
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  const setupCheckInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      fetchUpcomingSchedules();
    }, checkInterval * 60 * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkInterval, fetchUpcomingSchedules]);

 
  useEffect(() => {

    fetchUpcomingSchedules();

    const cleanup = setupCheckInterval();
    
    return cleanup;
  }, [fetchUpcomingSchedules, setupCheckInterval]);

  const refreshUpcomingSchedules = async () => {
    await fetchUpcomingSchedules();
  };


  const closeNotification = () => {
    setShowNotification(false);
  };


  const updateCheckInterval = (minutes: number) => {
    setCheckInterval(minutes);
  };

  return {
    upcomingSchedules,
    isLoading,
    showNotification,
    lastChecked,
    checkInterval,
    refreshUpcomingSchedules,
    closeNotification,
    updateCheckInterval,
    setShowNotification,
    dismissSchedule,
    getDismissedSchedules,
  };
};