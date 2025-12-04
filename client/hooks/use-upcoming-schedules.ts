'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/axios-client';
import { Schedule } from '@/types';
import toast from 'react-hot-toast';
import { differenceInMinutes, isAfter, addMinutes, subMinutes } from 'date-fns';

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
        
        const schedulesWithReminders = response.data.map((schedule: Schedule) => {
          if (schedule.reminder_minutes && schedule.start_time) {
            const startTime = new Date(schedule.start_time);
            const reminderTime = subMinutes(startTime, schedule.reminder_minutes);
            return {
              ...schedule,
              reminder_time: reminderTime.toISOString(),
              should_remind: isAfter(reminderTime, now) && isAfter(startTime, now)
            };
          }
          return {
            ...schedule,
            reminder_time: null,
            should_remind: false
          };
        });

        const upcoming = schedulesWithReminders.filter((schedule: Schedule & { reminder_time?: string | null, should_remind?: boolean }) => {
          if (!schedule.start_time) return false;
          
          const scheduleTime = new Date(schedule.start_time);
          const timeUntilStart = differenceInMinutes(scheduleTime, now);
          
          if (timeUntilStart > 0 && timeUntilStart <= 24 * 60) {
            return true;
          }
          
          if (schedule.reminder_minutes && schedule.reminder_time) {
            const reminderTime = new Date(schedule.reminder_time);
            const timeUntilReminder = differenceInMinutes(reminderTime, now);
            return timeUntilReminder > 0 && timeUntilReminder <= 24 * 60;
          }
          
          return false;
        });

        console.log('Upcoming schedules after filter:', upcoming);

        const sortedSchedules = upcoming.sort((a, b) => {
          const timeA = a.reminder_time ? new Date(a.reminder_time).getTime() : new Date(a.start_time).getTime();
          const timeB = b.reminder_time ? new Date(b.reminder_time).getTime() : new Date(b.start_time).getTime();
          return timeA - timeB;
        });

        const filteredSchedules = filterDismissedSchedules(sortedSchedules);
        setUpcomingSchedules(filteredSchedules);
        setLastChecked(new Date());
        
        console.log('Final filtered schedules:', filteredSchedules);
        
        const immediateReminders = filteredSchedules.filter((schedule: Schedule & { reminder_time?: string | null, should_remind?: boolean }) => {
          if (!schedule.reminder_time || !schedule.should_remind) return false;
          
          const reminderTime = new Date(schedule.reminder_time);
          const diffMinutes = differenceInMinutes(reminderTime, now);
          return diffMinutes > 0 && diffMinutes <= 15;
        });
        
        console.log('Immediate reminders (within 15 min):', immediateReminders);
        
        if (immediateReminders.length > 0 && !showNotification) {
          setShowNotification(true);
          
          const nearestReminder = immediateReminders[0];
          const diffMinutes = differenceInMinutes(
            new Date(nearestReminder.reminder_time!), 
            now
          );
          
          const message = nearestReminder.reminder_minutes 
            ? `Nhắc nhở: ${nearestReminder.event} (bắt đầu sau ${nearestReminder.reminder_minutes} phút)`
            : `Lịch trình sắp bắt đầu: ${nearestReminder.event}`;
 
          toast.success(
            message,
            { 
              duration: 5000,
              icon: '⏰'
            }
          );
        }
      } else {
        console.warn('No valid schedules data in response:', response);
        setUpcomingSchedules([]);
      }
    } catch (error) {
      console.error('Error fetching upcoming schedules:', error);
      toast.error('Không thể tải lịch trình sắp tới');
      setUpcomingSchedules([]);
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