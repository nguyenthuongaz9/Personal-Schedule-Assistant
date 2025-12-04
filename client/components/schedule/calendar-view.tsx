'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  Edit,
  Trash2,
  Loader2,
  Bell
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, 
         isSameMonth, isSameDay, isToday, parseISO, 
         startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Schedule } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAppStore } from '@/hooks/app-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/axios-client';
import toast from 'react-hot-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

const scheduleFormSchema = z.object({
  event: z.string().min(1, "Tiêu đề là bắt buộc"),
  description: z.string().optional(),
  start_time: z.string().min(1, "Thời gian bắt đầu là bắt buộc"),
  end_time: z.string().optional(),
  location: z.string().optional(),
  reminder_minutes: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  category: z.string().optional(),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

export const CalendarView: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [selectedDaySchedules, setSelectedDaySchedules] = useState<Schedule[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [monthSchedules, setMonthSchedules] = useState<Schedule[]>([]);
  
  const { 
    selectedDate, 
    setSelectedDate,
  } = useAppStore();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      event: "",
      description: "",
      start_time: "",
      end_time: "",
      location: "",
      reminder_minutes: "",
      priority: "medium",
      category: "general",
    },
  });

  useEffect(() => {
    if (!selectedDate) {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      setSelectedDate(todayStr);
    }
  }, [selectedDate, setSelectedDate]);

  useEffect(() => {
    if (!isCreateDialogOpen && !isEditDialogOpen) {
      form.reset({
        event: "",
        description: "",
        start_time: "",
        end_time: "",
        location: "",
        reminder_minutes: "",
        priority: "medium",
        category: "general",
      });
      setEditingSchedule(null);
    }
  }, [isCreateDialogOpen, isEditDialogOpen, form]);

  useEffect(() => {
    const loadMonthData = async () => {
      setIsLoadingMonth(true);
      try {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        
        const startDateStr = format(monthStart, 'yyyy-MM-dd');
        const endDateStr = format(monthEnd, 'yyyy-MM-dd');
        
        console.log(`Loading schedules from ${startDateStr} to ${endDateStr}`);
        
        const response = await apiClient.getSchedulesInRange(startDateStr, endDateStr);
        
        console.log('API Range Response:', response);
        
        if (response?.data?.success) {
          const schedules = response.data.schedules;
          
          if (schedules && Array.isArray(schedules)) {
            setMonthSchedules(schedules);
            console.log(`Loaded ${schedules.length} schedules for month`);
          } else {
            console.warn('No schedule data found in response');
            setMonthSchedules([]);
          }
        } else {
          console.warn('API request was not successful or no data');
          setMonthSchedules([]);
        }
      } catch (error) {
        console.error('Error loading month schedules:', error);
        toast.error('Không thể tải lịch trình cho tháng');
        setMonthSchedules([]);
      } finally {
        setIsLoadingMonth(false);
      }
    };

    loadMonthData();
  }, [currentMonth]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd
    });
  }, [currentMonth]);

  const getSchedulesForDate = useCallback((date: Date): Schedule[] => {
    if (!monthSchedules || !Array.isArray(monthSchedules)) return [];
    
    return monthSchedules.filter(schedule => {
      if (!schedule || !schedule.start_time) return false;
      
      try {
        const scheduleDate = new Date(schedule.start_time);
        return isSameDay(scheduleDate, date);
      } catch (error) {
        console.error('Error parsing schedule date:', error);
        return false;
      }
    });
  }, [monthSchedules]);

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

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

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'destructive';
      case 'in_progress':
        return 'warning';
      case 'scheduled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Chờ xử lý';
      case 'scheduled':
        return 'Đã lên lịch';
      case 'in_progress':
        return 'Đang thực hiện';
      case 'completed':
        return 'Hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const formatTime = (dateTimeString: string) => {
    try {
      const date = parseISO(dateTimeString);
      return format(date, 'HH:mm');
    } catch (error) {
      
        return '--:--';
      
    }
  };

  const formatDateDisplay = (date: Date) => {
    try {
      return format(date, 'dd/MM/yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const formatDateTitle = (date: Date) => {
    try {
      return format(date, 'EEEE, dd/MM/yyyy', { locale: vi });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const toMySQLDateTime = (date: Date): string => {
    return format(date, 'yyyy-MM-dd HH:mm:ss');
  };

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(dateStr);
    
    const daySchedules = getSchedulesForDate(date);
    setSelectedDaySchedules(daySchedules);
    setSelectedDay(date);
    
    setIsDateDialogOpen(true);
    
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }
  };

  const handleCreateSchedule = async (data: ScheduleFormValues) => {
    try {
      setIsCreating(true);
      
      if (!selectedDay) {
        toast.error('Vui lòng chọn ngày');
        return;
      }
      
      const selectedDateStr = format(selectedDay, 'yyyy-MM-dd');
      const startDateTime = new Date(`${selectedDateStr}T${data.start_time}`);
      
      if (isNaN(startDateTime.getTime())) {
        toast.error('Thời gian bắt đầu không hợp lệ');
        return;
      }
      
      let endDateTime = null;
      if (data.end_time) {
        endDateTime = new Date(`${selectedDateStr}T${data.end_time}`);
        if (isNaN(endDateTime.getTime())) {
          toast.error('Thời gian kết thúc không hợp lệ');
          return;
        }
      }
      
      const scheduleData = {
        event: data.event,
        description: data.description || '',
        start_time: toMySQLDateTime(startDateTime),
        end_time: data.end_time ? toMySQLDateTime(endDateTime!) : undefined,
        location: data.location || '',
        reminder_minutes: data.reminder_minutes ? parseInt(data.reminder_minutes) : undefined,
        priority: data.priority,
        category: data.category || 'general'
      };
      
      console.log('Creating schedule with data:', scheduleData);
      
      const response = await apiClient.createSchedule(scheduleData);
      
      console.log('Create schedule response:', response);
      
      if (response?.data?.success) {
        const newScheduleData = response.data.data || response.data.schedule;
        
        const newSchedule: Schedule = {
          event: data.event,
          description: data.description || '',
          start_time: startDateTime.toISOString(),  
          end_time: data.end_time ? endDateTime!.toISOString() : undefined,
          location: data.location || '',
          reminder_minutes: data.reminder_minutes ? parseInt(data.reminder_minutes) : undefined,
          priority: data.priority,
          category: data.category || 'general',
          id: newScheduleData?.id || Date.now(),
          user_id: 1,
          status: newScheduleData?.status || 'scheduled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
     
        setMonthSchedules(prev => [...prev, newSchedule]);
        
        setSelectedDaySchedules(prev => [...prev, newSchedule]);
        
        toast.success('Tạo lịch trình thành công');
        setIsCreateDialogOpen(false);
        form.reset({
          event: "",
          description: "",
          start_time: "",
          end_time: "",
          location: "",
          reminder_minutes: "",
          priority: "medium",
          category: "general",
        });
        
        await reloadMonthData();
      } else {
        toast.error(response?.data?.message || 'Không thể tạo lịch trình');
      }
    } catch (error: any) {
      console.error('Error creating schedule:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi tạo lịch trình');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditSchedule = async (data: ScheduleFormValues) => {
    if (!editingSchedule || !selectedDay) return;
    
    try {
      setIsCreating(true);
      
      const selectedDateStr = format(selectedDay, 'yyyy-MM-dd');
      const startDateTime = new Date(`${selectedDateStr}T${data.start_time}`);
      
      if (isNaN(startDateTime.getTime())) {
        toast.error('Thời gian bắt đầu không hợp lệ');
        return;
      }
      
      let endDateTime = null;
      if (data.end_time) {
        endDateTime = new Date(`${selectedDateStr}T${data.end_time}`);
        if (isNaN(endDateTime.getTime())) {
          toast.error('Thời gian kết thúc không hợp lệ');
          return;
        }
      }
      
      const scheduleData = {
        event: data.event,
        description: data.description || '',
        start_time: toMySQLDateTime(startDateTime),  
        end_time: data.end_time ? toMySQLDateTime(endDateTime!) : undefined,
        location: data.location || '',
        reminder_minutes: data.reminder_minutes ? parseInt(data.reminder_minutes) : undefined,
        priority: data.priority,
        category: data.category || 'general'
      };
      
      console.log('Updating schedule with data:', scheduleData);
      
      const response = await apiClient.updateSchedule(editingSchedule.id, scheduleData);
      
      console.log('Update schedule response:', response);
      
      if (response?.data?.success) {
        const updatedSchedule: Schedule = {
          ...editingSchedule,
          event: data.event,
          description: data.description || '',
          start_time: startDateTime.toISOString(),
          end_time: data.end_time ? endDateTime!.toISOString() : undefined,
          location: data.location || '',
          reminder_minutes: data.reminder_minutes ? parseInt(data.reminder_minutes) : undefined,
          priority: data.priority,
          category: data.category || 'general',
          updated_at: new Date().toISOString(),
        };
        
        
        setMonthSchedules(prev => 
          prev.map(s => s.id === updatedSchedule.id ? updatedSchedule : s)
        );
        
        setSelectedDaySchedules(prev => 
          prev.map(s => s.id === updatedSchedule.id ? updatedSchedule : s)
        );
        
        toast.success('Cập nhật lịch trình thành công');
        setIsEditDialogOpen(false);
        setEditingSchedule(null);
        form.reset({
          event: "",
          description: "",
          start_time: "",
          end_time: "",
          location: "",
          reminder_minutes: "",
          priority: "medium",
          category: "general",
        });
        
        await reloadMonthData();
      } else {
        toast.error(response?.data?.message || 'Không thể cập nhật lịch trình');
      }
    } catch (error: any) {
      console.error('Error updating schedule:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi cập nhật lịch trình');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch trình này?')) return;
    
    try {
      const response = await apiClient.deleteSchedule(scheduleId);
      
      if (response?.data?.success) {
        
        setMonthSchedules(prev => prev.filter(s => s.id !== scheduleId));
        
        setSelectedDaySchedules(prev => prev.filter(s => s.id !== scheduleId));
        
        toast.success('Đã xóa lịch trình');
        
        await reloadMonthData();
      } else {
        toast.error(response?.data?.message || 'Không thể xóa lịch trình');
      }
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi xóa lịch trình');
    }
  };

  const handleEditClick = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    
    const startTime = formatTime(schedule.start_time);
    const endTime = schedule.end_time ? formatTime(schedule.end_time) : '';
    
    form.reset({
      event: schedule.event || schedule.title || '',
      description: schedule.description || '',
      start_time: startTime,
      end_time: endTime,
      location: schedule.location || '',
      reminder_minutes: schedule.reminder_minutes?.toString() || '',
      priority: schedule.priority,
      category: schedule.category || 'general',
    });
    
    setIsEditDialogOpen(true);
    setIsDateDialogOpen(false);
  };

  const reloadMonthData = async () => {
    setIsLoadingMonth(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const startDateStr = format(monthStart, 'yyyy-MM-dd');
      const endDateStr = format(monthEnd, 'yyyy-MM-dd');
      
      const response = await apiClient.getSchedulesInRange(startDateStr, endDateStr);
      
      if (response?.data?.success) {
        const schedules = response.data.schedules;
        
        if (schedules && Array.isArray(schedules)) {
          setMonthSchedules(schedules);
          
          if (selectedDay) {
            const updatedDaySchedules = schedules.filter(schedule => {
              if (!schedule || !schedule.start_time) return false;
              
              try {
                const scheduleDate = new Date(schedule.start_time);
                return isSameDay(scheduleDate, selectedDay);
              } catch (error) {
                return false;
              }
            });
            setSelectedDaySchedules(updatedDaySchedules);
          }
        }
      }
    } catch (error) {
      console.error('Error reloading month data:', error);
    } finally {
      setIsLoadingMonth(false);
    }
  };

  const handleCreateScheduleFromDateDialog = () => {
    setIsDateDialogOpen(false);
    setIsCreateDialogOpen(true);
  };

  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const showCalendarLoading = isLoadingMonth;

  return (
    <div className="h-full flex flex-col">
      <Card className="mb-4">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {format(currentMonth, 'MMMM yyyy', { locale: vi })}
                </h2>
                <p className="text-xs text-gray-500">
                  Lịch cá nhân
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevMonth}
                disabled={showCalendarLoading}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(today);
                  const todayStr = format(today, 'yyyy-MM-dd');
                  setSelectedDate(todayStr);
                  handleDateClick(today);
                }}
                disabled={showCalendarLoading}
                className="h-8 px-3 text-xs"
              >
                Hôm nay
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={nextMonth}
                disabled={showCalendarLoading}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-4 pb-4">
          {showCalendarLoading && (
            <div className="flex items-center justify-center py-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-xs text-gray-500">Đang tải lịch trình tháng...</span>
            </div>
          )}
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, index) => (
              <div
                key={`weekday-${day}-${index}`}
                className="text-center text-xs font-medium text-gray-500 py-1.5"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const daySchedules = getSchedulesForDate(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isTodayDate = isToday(day);

              return (
                <div
                  key={`day-${day.toISOString()}-${index}`}
                  className={`
                    min-h-[70px] border rounded-md p-1 cursor-pointer transition-all
                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${isSelected 
                      ? 'border-primary-500 ring-1 ring-primary-200' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                    ${isTodayDate && !isSelected ? 'border-blue-300 bg-blue-50' : ''}
                    hover:shadow-xs
                    flex flex-col
                  `}
                  onClick={() => handleDateClick(day)}
                >
                  <div className="flex justify-between items-start mb-0.5">
                    <span className={`
                      text-xs font-semibold
                      ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                      ${isTodayDate ? 'text-blue-600' : ''}
                      ${isSelected ? 'text-primary-600' : ''}
                    `}>
                      {format(day, 'd')}
                    </span>
                    {daySchedules.length > 0 && (
                      <span className="text-[10px] bg-primary-100 text-primary-800 px-1 py-0.5 rounded-full min-w-[16px] text-center">
                        {daySchedules.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 flex-grow">
                    {daySchedules.slice(0, 2).map((schedule, idx) => (
                      <div
                        key={`schedule-indicator-${schedule.id}-${idx}`}
                        className={`
                          text-[10px] px-1 py-0.5 rounded text-white truncate
                          ${getPriorityColor(schedule.priority)}
                          hover:opacity-90 transition-opacity
                        `}
                        title={`${formatTime(schedule.start_time)} ${schedule.event || schedule.title || ''}`}
                      >
                        <div className="font-medium truncate">
                          {formatTime(schedule.start_time)}
                        </div>
                      </div>
                    ))}
                    {daySchedules.length > 2 && (
                      <div className="text-[10px] text-gray-500 text-center">
                        +{daySchedules.length - 2} thêm
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-lg">
                {selectedDay ? formatDateTitle(selectedDay) : 'Lịch trình ngày'}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDaySchedules.length} lịch trình
              </p>
            </div>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            {selectedDaySchedules.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-2">Không có lịch trình nào</p>
                <p className="text-xs text-gray-400 mb-4">
                  Tạo lịch trình mới cho ngày này
                </p>
                <Button 
                  size="sm" 
                  onClick={handleCreateScheduleFromDateDialog}
                  className="mb-4"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Tạo lịch trình
                </Button>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {selectedDaySchedules.map((schedule, index) => (
                  <div 
                    key={`schedule-${schedule.id}-${index}`}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h4 className="font-medium text-gray-900 text-base truncate">
                            {schedule.event || schedule.title || ''}
                          </h4>
                          <Badge 
                            variant={getPriorityBadgeVariant(schedule.priority)} 
                            className="text-xs"
                          >
                            {schedule.priority === 'high' ? 'Cao' : 
                             schedule.priority === 'medium' ? 'TB' : 'Thấp'}
                          </Badge>
                          <Badge 
                            variant={getStatusBadgeVariant(schedule.status)} 
                            className="text-xs"
                          >
                            {getStatusText(schedule.status)}
                          </Badge>
                        </div>
                        
                        {schedule.description && (
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {schedule.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {formatTime(schedule.start_time)} 
                              {schedule.end_time && ` - ${formatTime(schedule.end_time)}`}
                            </span>
                          </div>
                          
                          {schedule.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{schedule.location}</span>
                            </div>
                          )}
                          
                          {schedule.reminder_minutes && (
                            <div className="flex items-center gap-2">
                              <Bell className="h-4 w-4" />
                              <span>Nhắc {schedule.reminder_minutes} phút trước</span>
                            </div>
                          )}
                          
                          {schedule.category && (
                            <div className="flex items-center gap-2">
                              <span>{schedule.category}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(schedule)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <div className="flex justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              Tổng: {selectedDaySchedules.length} lịch trình
            </div>
            <Button 
              onClick={handleCreateScheduleFromDateDialog}
              className="ml-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm lịch trình
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Tạo lịch trình mới</DialogTitle>
            {selectedDay && (
              <p className="text-sm text-gray-500">
                Ngày: {formatDateDisplay(selectedDay)}
              </p>
            )}
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateSchedule)} className="space-y-4">
              <FormField
                control={form.control}
                name="event"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Tiêu đề</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nhập tiêu đề lịch trình" 
                        className="text-sm h-9"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Mô tả (tùy chọn)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Nhập mô tả chi tiết" 
                        className="text-sm min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Thời gian bắt đầu</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          className="text-sm h-9"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Thời gian kết thúc (tùy chọn)</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          className="text-sm h-9"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Địa điểm (tùy chọn)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nhập địa điểm" 
                        className="text-sm h-9"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="reminder_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Nhắc nhở trước (phút, tùy chọn)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ví dụ: 15, 30, 60" 
                        className="text-sm h-9"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Mức độ ưu tiên</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-sm h-9">
                            <SelectValue placeholder="Chọn mức độ ưu tiên" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low" className="text-sm">Thấp</SelectItem>
                          <SelectItem value="medium" className="text-sm">Trung bình</SelectItem>
                          <SelectItem value="high" className="text-sm">Cao</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Danh mục</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-sm h-9">
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general" className="text-sm">Chung</SelectItem>
                          <SelectItem value="work" className="text-sm">Công việc</SelectItem>
                          <SelectItem value="personal" className="text-sm">Cá nhân</SelectItem>
                          <SelectItem value="meeting" className="text-sm">Họp</SelectItem>
                          <SelectItem value="alarm" className="text-sm">Báo thức</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="text-sm h-9"
                >
                  Hủy
                </Button>
                <Button 
                  type="submit" 
                  disabled={isCreating}
                  className="text-sm h-9"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Đang tạo...
                    </>
                  ) : 'Tạo lịch trình'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Chỉnh sửa lịch trình</DialogTitle>
            {selectedDay && (
              <p className="text-sm text-gray-500">
                Ngày: {formatDateDisplay(selectedDay)}
              </p>
            )}
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSchedule)} className="space-y-4">
              <FormField
                control={form.control}
                name="event"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Tiêu đề</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nhập tiêu đề lịch trình" 
                        className="text-sm h-9"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Mô tả (tùy chọn)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Nhập mô tả chi tiết" 
                        className="text-sm min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Thời gian bắt đầu</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          className="text-sm h-9"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Thời gian kết thúc (tùy chọn)</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          className="text-sm h-9"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Địa điểm (tùy chọn)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nhập địa điểm" 
                        className="text-sm h-9"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="reminder_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Nhắc nhở trước (phút, tùy chọn)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ví dụ: 15, 30, 60" 
                        className="text-sm h-9"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Mức độ ưu tiên</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-sm h-9">
                            <SelectValue placeholder="Chọn mức độ ưu tiên" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low" className="text-sm">Thấp</SelectItem>
                          <SelectItem value="medium" className="text-sm">Trung bình</SelectItem>
                          <SelectItem value="high" className="text-sm">Cao</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Danh mục</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-sm h-9">
                            <SelectValue placeholder="Chọn danh mục" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general" className="text-sm">Chung</SelectItem>
                          <SelectItem value="work" className="text-sm">Công việc</SelectItem>
                          <SelectItem value="personal" className="text-sm">Cá nhân</SelectItem>
                          <SelectItem value="meeting" className="text-sm">Họp</SelectItem>
                          <SelectItem value="alarm" className="text-sm">Báo thức</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingSchedule(null);
                  }}
                  className="text-sm h-9"
                >
                  Hủy
                </Button>
                <Button 
                  type="submit" 
                  disabled={isCreating}
                  className="text-sm h-9"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : 'Cập nhật'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};