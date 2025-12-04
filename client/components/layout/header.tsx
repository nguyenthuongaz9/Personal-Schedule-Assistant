'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Bell, 
  User, 
  X, 
  Clock, 
  MapPin, 
  LogOut, 
  Mail, 
  Calendar as CalendarIcon,
  User as UserIcon,
  AlertCircle 
} from 'lucide-react';
import { useUpcomingSchedules } from '@/hooks/use-upcoming-schedules';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, differenceInMinutes, isAfter, subMinutes } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAppStore } from '@/hooks/app-store';
import { useAuth } from '@/context/auth-context';

export const Header: React.FC = () => {
  const {
    upcomingSchedules,
    isLoading,
    showNotification,
    lastChecked,
    refreshUpcomingSchedules,
    closeNotification,
    setShowNotification,
    dismissSchedule,
  } = useUpcomingSchedules();

  const { user } = useAuth();
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [upcomingScheduleTime, setUpcomingScheduleTime] = useState<string>('');
  const [nearestSchedule, setNearestSchedule] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const notificationTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    console.log('Current upcoming schedules:', upcomingSchedules);
    
    if (upcomingSchedules.length > 0) {
      const now = new Date();

      const schedulesWithDisplayTime = upcomingSchedules.map(schedule => {
        const startTime = new Date(schedule.start_time);
        let displayTime = startTime;
        let isReminder = false;
        
        if (schedule.reminder_minutes) {
          const reminderTime = subMinutes(startTime, schedule.reminder_minutes);
          if (isAfter(reminderTime, now)) {
            displayTime = reminderTime;
            isReminder = true;
          }
        }
        
        return {
          ...schedule,
          display_time: displayTime,
          is_reminder: isReminder,
          original_start_time: startTime
        };
      });

      const upcoming = schedulesWithDisplayTime.filter(schedule => {
        return isAfter(schedule.display_time, now);
      });
      
      console.log('Upcoming schedules (not started):', upcoming);
      
      if (upcoming.length > 0) {
        const sorted = upcoming.sort((a, b) => {
          return a.display_time.getTime() - b.display_time.getTime();
        });
        
        const nearest = sorted[0];
        setNearestSchedule(nearest);
        
        const updateCountdown = () => {
          const now = new Date();
          const displayTime = nearest.display_time;
          const diffMinutes = differenceInMinutes(displayTime, now);
          
          if (diffMinutes <= 0) {
            setUpcomingScheduleTime('Đã bắt đầu');
            setTimeout(() => refreshUpcomingSchedules(), 1000);
          } else {
            const diffHours = Math.floor(diffMinutes / 60);
            const remainingMinutes = diffMinutes % 60;
            
            let timeString = '';
            if (diffHours > 0) {
              timeString = `${diffHours} giờ ${remainingMinutes > 0 ? `${remainingMinutes} phút` : ''}`;
            } else {
              timeString = `${diffMinutes} phút`;
            }
            
            setUpcomingScheduleTime(timeString.trim());
            
            if (diffMinutes <= 15 && !showNotification && !showNotificationPanel) {
              setShowNotification(true);
            }
          }
        };
        
        updateCountdown();
        
        if (notificationTimerRef.current) {
          clearInterval(notificationTimerRef.current);
        }
        
        notificationTimerRef.current = setInterval(updateCountdown, 60000);
      } else {
        setNearestSchedule(null);
        setUpcomingScheduleTime('');
      }
    } else {
      setNearestSchedule(null);
      setUpcomingScheduleTime('');
    }
    
    return () => {
      if (notificationTimerRef.current) {
        clearInterval(notificationTimerRef.current);
      }
    };
  }, [upcomingSchedules, showNotification, showNotificationPanel]);

  const formatLastChecked = () => {
    if (!lastChecked) return 'Chưa kiểm tra';
    
    try {
      const now = new Date();
      const diffMinutes = differenceInMinutes(now, lastChecked);
      
      if (diffMinutes < 1) return 'Vừa xong';
      if (diffMinutes < 60) return `${diffMinutes} phút trước`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      return `${diffHours} giờ trước`;
    } catch (error) {
      return 'Không xác định';
    }
  };

  const getScheduleStatusColor = (schedule: any) => {
    const now = new Date();
    const displayTime = schedule.display_time || new Date(schedule.start_time);
    const diffMinutes = differenceInMinutes(displayTime, now);
    
    if (schedule.is_reminder) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    
    if (diffMinutes <= 0) return 'bg-gray-100 text-gray-800';
    if (diffMinutes <= 15) return 'bg-red-100 text-red-800';
    if (diffMinutes <= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getScheduleStatusText = (schedule: any) => {
    const now = new Date();
    const displayTime = schedule.display_time || new Date(schedule.start_time);
    const diffMinutes = differenceInMinutes(displayTime, now);
    
    if (schedule.is_reminder) {
      return `Nhắc trước (còn ${diffMinutes} phút)`;
    }
    
    if (diffMinutes <= 0) return 'Đã bắt đầu';
    return `Còn ${diffMinutes} phút`;
  };

  const getDisplayTimeText = (schedule: any) => {
    if (schedule.is_reminder && schedule.reminder_minutes) {
      const startTime = schedule.original_start_time || new Date(schedule.start_time);
      return `Nhắc nhở: ${schedule.reminder_minutes} phút trước khi bắt đầu (${format(startTime, 'HH:mm')})`;
    }
    return null;
  };

  const handleDismissSchedule = (scheduleId: number) => {
    dismissSchedule(scheduleId);
    if (upcomingSchedules.length === 1) {
      closeNotification();
    }
  };

  const handleCloseNotification = () => {
    if (nearestSchedule) {
      handleDismissSchedule(nearestSchedule.id);
    }
    closeNotification();
  };

  const handleLogout = async () => {
    localStorage.clear();
    window.location.href = '/auth/login';
  };

  const getInitials = () => {
    if (!user?.fullname) return 'U';
    const names = user.fullname.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return user.fullname[0]?.toUpperCase() || 'U';
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: vi });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <header className="h-[70px] bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 w-full z-50">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Trợ lý Lịch trình
              </h1>
              <p className="text-gray-600 text-sm">
                Quản lý lịch trình thông minh với AI
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Dialog open={showNotificationPanel} onOpenChange={setShowNotificationPanel}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={() => {
                    if (showNotification) {
                      closeNotification();
                    }
                    refreshUpcomingSchedules();
                  }}
                >
                  <Bell className="h-5 w-5" />
                  {upcomingSchedules.length > 0 && (
                    <Badge 
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-red-500 text-white"
                      variant="destructive"
                    >
                      {upcomingSchedules.length}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>Thông báo lịch trình</span>
                    <Badge variant="outline">
                      {upcomingSchedules.length} lịch sắp tới
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="h-[400px] pr-4">
                  {upcomingSchedules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                      <Bell className="h-12 w-12 mb-2 opacity-20" />
                      <p>Không có thông báo nào</p>
                      <p className="text-sm">Tất cả lịch trình đã được xử lý</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingSchedules.map((schedule, index) => {
                        const startTime = new Date(schedule.start_time);
                        const endTime = schedule?.end_time ? new Date(schedule.end_time) : null;
                        const isReminder = schedule.reminder_minutes && schedule.reminder_minutes > 0;
                        
                        return (
                          <div 
                            key={schedule.id} 
                            className={`p-4 rounded-lg border ${isReminder ? 'border-orange-200 bg-orange-50' : index === 0 ? 'bg-primary-50 border-primary-200' : 'bg-white'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">
                                  {schedule.event}
                                </h3>
                                {isReminder && (
                                  <AlertCircle className="h-4 w-4 text-orange-500" />
                                )}
                              </div>
                              <Badge 
                                className={`${getScheduleStatusColor(schedule)} text-xs`}
                              >
                                {getScheduleStatusText(schedule)}
                              </Badge>
                            </div>
                            
                            {getDisplayTimeText(schedule) && (
                              <p className="text-sm text-orange-600 mb-2">
                                {getDisplayTimeText(schedule)}
                              </p>
                            )}
                            
                            {schedule.description && (
                              <p className="text-sm text-gray-600 mb-3">
                                {schedule.description}
                              </p>
                            )}
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center text-gray-600">
                                <span className="font-medium mr-2">Thể loại:</span>
                                <Badge variant="outline" className="text-xs">
                                  {schedule.category || 'Chung'}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center text-gray-600">
                                <span className="font-medium mr-2">Ưu tiên:</span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    schedule.priority === 'high' 
                                      ? 'border-red-200 text-red-700' 
                                      : schedule.priority === 'medium'
                                      ? 'border-yellow-200 text-yellow-700'
                                      : 'border-blue-200 text-blue-700'
                                  }`}
                                >
                                  {schedule.priority === 'high' ? 'Cao' : 
                                   schedule.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="mt-3 text-sm text-gray-500 space-y-2">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                <span>
                                  {format(startTime, 'HH:mm')} 
                                  {endTime && ` - ${format(endTime, 'HH:mm')}`}
                                </span>
                                <span className="mx-2">•</span>
                                <span>
                                  {format(startTime, 'dd/MM/yyyy', { locale: vi })}
                                </span>
                              </div>
                              
                              {schedule.location && (
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2" />
                                  <span>{schedule.location}</span>
                                </div>
                              )}
                              
                              {schedule.reminder_minutes && (
                                <div className="flex items-center text-orange-600">
                                  <Bell className="h-4 w-4 mr-2" />
                                  <span>Nhắc trước {schedule.reminder_minutes} phút</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-4 flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDismissSchedule(schedule.id)}
                                className={isReminder ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" : "text-red-600 hover:text-red-700 hover:bg-red-50"}
                              >
                                Bỏ qua thông báo
                              </Button>
                            </div>
                            
                            {index < upcomingSchedules.length - 1 && (
                              <Separator className="mt-4" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-xs text-gray-500">
                    Cập nhật: {formatLastChecked()}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={refreshUpcomingSchedules}
                  >
                    Làm mới
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            {nearestSchedule && upcomingScheduleTime && (
              <div className="text-sm text-gray-700 hidden md:block">
                <span className="font-medium">
                  {nearestSchedule.is_reminder ? 'Nhắc nhở: ' : 'Lịch tiếp theo: '}
                </span>
                <span className={`${nearestSchedule.is_reminder ? 'text-orange-600' : 'text-primary-600'}`}>
                  {nearestSchedule.event} ({upcomingScheduleTime})
                </span>
              </div>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={user?.fullname || "User"} />
                    <AvatarFallback className="bg-primary-100 text-primary-600">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.fullname || 'Demo User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || 'demo@example.com'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowUserDialog(true)}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Thông tin tài khoản</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span>Lịch trình của tôi</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Đăng xuất</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Thông tin tài khoản
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" alt={user?.fullname || "User"} />
                <AvatarFallback className="text-2xl bg-primary-100 text-primary-600">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-xl font-semibold">
                  {user?.fullname || 'Demo User'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Người dùng hệ thống
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium text-gray-500">Email:</span>
                  </div>
                  <p className="text-sm pl-6">{user?.email || 'demo@example.com'}</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium text-gray-500">ID:</span>
                  </div>
                  <p className="text-sm pl-6">{user?.id || '1'}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium text-gray-500">Ngày tạo:</span>
                </div>
                <p className="text-sm pl-6">
                  {user?.created_at ? formatDate(user.created_at) : 'Không xác định'}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="font-medium text-gray-500">Cập nhật lần cuối:</span>
                </div>
                <p className="text-sm pl-6">
                  {user?.updated_at ? formatDate(user.updated_at) : 'Không xác định'}
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUserDialog(false)}
                >
                  Đóng
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showNotification && nearestSchedule && !showNotificationPanel && (
        <div className="fixed top-20 right-4 z-40 animate-in slide-in-from-right-80 duration-300">
          <div className={`bg-white rounded-lg shadow-lg border p-4 max-w-sm ${nearestSchedule.is_reminder ? 'border-orange-200' : 'border-gray-200'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">
                  {nearestSchedule.is_reminder ? '⏰ Nhắc nhở' : '⏰ Lịch trình sắp bắt đầu'}
                </h3>
                {nearestSchedule.is_reminder && (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCloseNotification}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="mb-3">
              <h4 className={`font-medium mb-1 ${nearestSchedule.is_reminder ? 'text-orange-600' : 'text-primary-600'}`}>
                {nearestSchedule.event}
              </h4>
              <p className="text-sm text-gray-600">
                {nearestSchedule.is_reminder ? 'Nhắc nhở sau' : 'Bắt đầu sau'} {upcomingScheduleTime}
              </p>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex items-center">
                  <span className="font-medium mr-2">Thể loại:</span>
                  <span className="text-gray-600">{nearestSchedule.category || 'Chung'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium mr-2">Thời gian:</span>
                  <span className="text-gray-600">
                    {format(new Date(nearestSchedule.original_start_time || nearestSchedule.start_time), 'HH:mm dd/MM', { locale: vi })}
                  </span>
                </div>
                {nearestSchedule.reminder_minutes && (
                  <div className="flex items-center text-orange-600">
                    <Bell className="h-4 w-4 mr-2" />
                    <span>Nhắc trước {nearestSchedule.reminder_minutes} phút</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseNotification}
                className="text-gray-500"
              >
                Tắt thông báo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNotificationPanel(true);
                  closeNotification();
                }}
              >
                Xem tất cả ({upcomingSchedules.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};