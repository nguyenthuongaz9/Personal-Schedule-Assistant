'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  MapPin
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, 
         isSameMonth, isSameDay, isToday, parseISO, 
         startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Schedule } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAppStore } from '@/hooks/app-store';

export const CalendarView: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { schedules, setSelectedDate, selectedDate } = useAppStore();

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Monday
    
    return eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd
    });
  }, [currentMonth]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const getSchedulesForDate = (date: Date): Schedule[] => {
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.start_time);
      return isSameDay(scheduleDate, date);
    });
  };

  const getSchedulesForSelectedDate = useMemo(() => {
    return getSchedulesForDate(new Date(selectedDate));
  }, [schedules, selectedDate]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTime = (dateTimeString: string) => {
    return format(parseISO(dateTimeString), 'HH:mm');
  };

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentMonth, 'MMMM yyyy', { locale: vi })}
            </h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                Hôm nay
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const daySchedules = getSchedulesForDate(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = isSameDay(day, new Date(selectedDate));
              const isTodayDate = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    min-h-[100px] border rounded-lg p-2 cursor-pointer transition-colors
                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${isSelected 
                      ? 'border-primary-500 ring-2 ring-primary-200' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                    ${isTodayDate && !isSelected ? 'border-blue-300 bg-blue-50' : ''}
                  `}
                  onClick={() => setSelectedDate(day.toISOString().split('T')[0])}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`
                      text-sm font-medium
                      ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                      ${isTodayDate ? 'text-blue-600' : ''}
                    `}>
                      {format(day, 'd')}
                    </span>
                    {daySchedules.length > 0 && (
                      <span className="text-xs bg-primary-100 text-primary-800 px-1.5 py-0.5 rounded-full">
                        {daySchedules.length}
                      </span>
                    )}
                  </div>

                  {/* Schedule Indicators */}
                  <div className="space-y-1">
                    {daySchedules.slice(0, 2).map((schedule) => (
                      <div
                        key={schedule.id}
                        className={`
                          text-xs p-1 rounded text-white truncate
                          ${getPriorityColor(schedule.priority)}
                        `}
                        title={schedule.title}
                      >
                        {formatTime(schedule.start_time)} {schedule.title}
                      </div>
                    ))}
                    {daySchedules.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{daySchedules.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Schedules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Lịch trình {format(new Date(selectedDate), 'dd/MM/yyyy')}
            </h3>
            <span className="text-sm text-gray-500">
              {getSchedulesForSelectedDate.length} lịch trình
            </span>
          </div>
        </CardHeader>
        
        <CardContent>
          {getSchedulesForSelectedDate.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Không có lịch trình nào cho ngày này</p>
              <Button variant="outline" className="mt-3">
                <Plus className="h-4 w-4 mr-2" />
                Tạo lịch trình mới
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {getSchedulesForSelectedDate.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className={`w-3 h-3 rounded-full mt-1.5 ${getPriorityColor(schedule.priority)}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-gray-900 truncate">
                        {schedule.title}
                      </h4>
                      <span className="text-sm text-gray-500 whitespace-nowrap ml-2">
                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                      </span>
                    </div>
                    
                    {schedule.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {schedule.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span>{schedule.category || 'Không có danh mục'}</span>
                      </div>
                      <span className={`
                        text-xs px-2 py-1 rounded-full
                        ${schedule.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : schedule.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                        }
                      `}>
                        {schedule.status === 'scheduled' ? 'Đã lên lịch' :
                         schedule.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
