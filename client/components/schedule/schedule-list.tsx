'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Loader2, Plus, Edit, Trash2, Clock, MapPin, Bell, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAppStore } from '@/hooks/app-store';
import { Schedule } from '@/types';
import { apiClient } from '@/lib/axios-client';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface PaginationInfo {
  next_cursor: number | null;
  prev_cursor: number | null;
  limit: number;
  direction: string;
  has_more: boolean;
}

interface ScheduleFormData {
  event: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  reminder_minutes: number | undefined;
  priority: 'low' | 'medium' | 'high';
  category: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export const ScheduleList: React.FC = () => {
  const { selectedDate } = useAppStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [filterDate, setFilterDate] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState<ScheduleFormData>({
    event: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    reminder_minutes: undefined,
    priority: 'medium',
    category: 'general',
    status: 'scheduled'
  });
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE, dd MMMM yyyy', { locale: vi });
  };

  const formatTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      return format(date, 'HH:mm');
    } catch (error) {
      return '--:--';
    }
  };

  const formatTimeForInput = (dateString: string) => {
    return new Date(dateString).toISOString().slice(0, 16);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'destructive';
      case 'scheduled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Đã lên lịch';
      case 'completed':
        return 'Hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
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

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Cao';
      case 'medium':
        return 'Trung bình';
      case 'low':
        return 'Thấp';
      default:
        return priority;
    }
  };

  const fetchSchedules = useCallback(async (cursor?: number | null, direction: 'older' | 'newer' = 'older') => {
    const isLoadingMore = !!cursor;
    
    if (isLoadingMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = {
        limit: 10,
        direction,
        cursor: cursor || undefined,
        date: filterDate || undefined
      };
      
      console.log('Fetching schedules with params:', params);
      
      const response = await apiClient.getSchedulesByCursor(params);
      
      console.log('API Response:', response);
      
      if (response.success && response.data) {
        const schedulesData = response.data.schedules || response.data.data || [];
        const transformedSchedules: Schedule[] = schedulesData.map((schedule: any) => ({
          id: schedule.id,
          user_id: schedule.user_id || 1,
          event: schedule.event || schedule.title || '',
          description: schedule.description || '',
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          location: schedule.location || '',
          reminder_minutes: schedule.reminder_minutes,
          status: schedule.status || 'scheduled',
          priority: schedule.priority || 'medium',
          category: schedule.category || 'general',
          created_at: schedule.created_at || new Date().toISOString(),
          updated_at: schedule.updated_at || new Date().toISOString(),
        }));

        if (direction === 'older' && isLoadingMore) {
          setSchedules(prev => [...prev, ...transformedSchedules]);
        } else {
          setSchedules(transformedSchedules);
        }
        
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        } else {
          setPagination({
            next_cursor: null,
            prev_cursor: null,
            limit: 10,
            direction: 'older',
            has_more: transformedSchedules.length >= 10
          });
        }
      } else {
        if (response.message?.includes('Not Found') || response.message?.includes('404')) {
          console.log('Cursor endpoint not found, trying regular schedules endpoint');
          const regularResponse = await apiClient.getSchedules(filterDate || undefined);
          
          if (regularResponse.success && regularResponse.data) {
            const schedulesData = regularResponse.data as Schedule[];
            setSchedules(schedulesData);
            setPagination({
              next_cursor: null,
              prev_cursor: null,
              limit: 10,
              direction: 'older',
              has_more: false
            });
          } else {
            throw new Error(regularResponse.message || 'Failed to fetch schedules');
          }
        } else {
          throw new Error(response.message || 'Failed to fetch schedules');
        }
      }
    } catch (err: any) {
      console.error('Fetch schedules error:', err);
      
      if (err.response?.status === 401) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setError('Không thể tải lịch trình. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterDate]);

  useEffect(() => {
    setSchedules([]);
    fetchSchedules();
  }, [fetchSchedules, filterDate]);

  const loadMore = useCallback(() => {
    if (pagination?.has_more && !loadingMore && pagination.next_cursor) {
      fetchSchedules(pagination.next_cursor, 'older');
    }
  }, [pagination, loadingMore, fetchSchedules]);

  const refresh = useCallback(() => {
    setSchedules([]);
    fetchSchedules();
  }, [fetchSchedules]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDate(e.target.value);
  };

  const clearFilter = () => {
    setFilterDate('');
  };

  const openAddModal = () => {
    const now = new Date();
    const defaultStart = new Date(now.getTime() + 60 * 60 * 1000); 
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000); 

    setFormData({
      event: '',
      description: '',
      start_time: formatTimeForInput(defaultStart.toISOString()),
      end_time: formatTimeForInput(defaultEnd.toISOString()),
      location: '',
      reminder_minutes: undefined,
      priority: 'medium',
      category: 'general',
      status: 'scheduled'
    });
    setShowAddModal(true);
  };

  const openEditModal = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      event: schedule.event,
      description: schedule.description || '',
      start_time: formatTimeForInput(schedule.start_time),
      end_time: schedule.end_time ? formatTimeForInput(schedule.end_time) : '',
      location: schedule.location || '',
      reminder_minutes: schedule.reminder_minutes || undefined,
      priority: schedule.priority,
      category: schedule.category,
      status: schedule.status
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setShowDeleteModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedSchedule(null);
    setFormData({
      event: '',
      description: '',
      start_time: '',
      end_time: '',
      location: '',
      reminder_minutes: undefined,
      priority: 'medium',
      category: 'general',
      status: 'scheduled'
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? undefined : parseInt(value, 10)
    }));
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const response = await apiClient.createSchedule({
        event: formData.event,
        description: formData.description,
        start_time: formData.start_time,
        end_time: formData.end_time || null,
        location: formData.location || null,
        reminder_minutes: formData.reminder_minutes || null,
        priority: formData.priority,
        category: formData.category,
        status: formData.status
      });
      
      if (response.success) {
        closeModals();
        refresh(); 
      } else {
        throw new Error(response.message || 'Failed to create schedule');
      }
    } catch (err: any) {
      console.error('Add schedule error:', err);
      setError(err.message || 'Không thể tạo lịch trình. Vui lòng thử lại.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    setFormLoading(true);

    try {
      const response = await apiClient.updateSchedule(selectedSchedule.id, {
        event: formData.event,
        description: formData.description,
        start_time: formData.start_time,
        end_time: formData.end_time || null,
        location: formData.location || null,
        reminder_minutes: formData.reminder_minutes || null,
        priority: formData.priority,
        category: formData.category,
        status: formData.status
      });
      
      if (response.success) {
        closeModals();
        refresh(); 
      } else {
        throw new Error(response.message || 'Failed to update schedule');
      }
    } catch (err: any) {
      console.error('Edit schedule error:', err);
      setError(err.message || 'Không thể cập nhật lịch trình. Vui lòng thử lại.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedSchedule) return;

    setFormLoading(true);

    try {
      const response = await apiClient.deleteSchedule(selectedSchedule.id);
      
      if (response.success) {
        closeModals();
        refresh(); 
      } else {
        throw new Error(response.message || 'Failed to delete schedule');
      }
    } catch (err: any) {
      console.error('Delete schedule error:', err);
      setError(err.message || 'Không thể xóa lịch trình. Vui lòng thử lại.');
    } finally {
      setFormLoading(false);
    }
  };

  const displaySchedules = schedules;

  return (
    <div className="space-y-6 p-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {filterDate ? `Lịch trình ${formatDate(filterDate)}` : 'Tất cả lịch trình'}
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {displaySchedules.length} lịch trình
          </span>
          <Button
            onClick={openAddModal}
            className="px-4 py-2"
          >
            <Plus className="h-4 w-4" />
            Thêm mới
          </Button>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <label htmlFor="date-filter" className="text-sm font-medium text-gray-700">
            Lọc theo ngày:
          </label>
          <input
            id="date-filter"
            type="date"
            value={filterDate}
            onChange={handleDateChange}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {filterDate && (
          <Button
            onClick={clearFilter}
            variant="outline"
            className="px-3 py-2"
          >
            Xóa lọc
          </Button>
        )}
        <Button
          onClick={refresh}
          variant="outline"
          className="px-3 py-2 text-sm gap-2"
        >
          <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Thử lại
          </button>
        </div>
      )}

      {loading && schedules.length === 0 && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {displaySchedules.length > 0 && (
        <div className="space-y-3">
          {displaySchedules.map((schedule) => (
            <div key={schedule.id} className="group relative">
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className="font-medium text-gray-900 text-base truncate">
                        {schedule.event}
                      </h4>
                      <Badge 
                        variant={getPriorityBadgeVariant(schedule.priority)} 
                        className="text-xs"
                      >
                        {getPriorityText(schedule.priority)}
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
                    
                    <div className="space-y-2">
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
                      </div>
                      
                      {schedule.reminder_minutes && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Bell className="h-4 w-4" />
                          <span>Nhắc trước {schedule.reminder_minutes} phút</span>
                        </div>
                      )}
                      
                      {schedule.category && schedule.category !== 'general' && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <AlertCircle className="h-4 w-4" />
                          <span>Danh mục: {schedule.category}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(schedule)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(schedule)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && displaySchedules.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
            <Calendar className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Chưa có lịch trình
          </h3>
          <p className="text-gray-500 mb-4">
            {filterDate 
              ? `Không có lịch trình nào cho ngày ${formatDate(filterDate)}` 
              : 'Bạn chưa có lịch trình nào'}
          </p>
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo lịch trình đầu tiên
          </Button>
        </div>
      )}

      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      )}

      {!pagination?.has_more && displaySchedules.length > 0 && (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">
            Đã hiển thị tất cả lịch trình
          </p>
        </div>
      )}

      {pagination?.has_more && !loadingMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tải thêm lịch trình
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Thêm lịch trình mới</h3>
              <form onSubmit={handleAddSchedule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sự kiện <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="event"
                    value={formData.event}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời gian bắt đầu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời gian kết thúc (tùy chọn)
                    </label>
                    <input
                      type="datetime-local"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Địa điểm (tùy chọn)
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhắc nhở trước (phút)
                  </label>
                  <input
                    type="number"
                    name="reminder_minutes"
                    value={formData.reminder_minutes || ''}
                    onChange={handleNumberChange}
                    min="1"
                    max="1440"
                    placeholder="Số phút nhắc trước (VD: 15)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Độ ưu tiên
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Danh mục
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">Chung</option>
                      <option value="work">Công việc</option>
                      <option value="personal">Cá nhân</option>
                      <option value="meeting">Họp</option>
                      <option value="alarm">Báo thức</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="scheduled">Đã lên lịch</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Thêm lịch trình
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Sửa lịch trình</h3>
              <form onSubmit={handleEditSchedule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sự kiện <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="event"
                    value={formData.event}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời gian bắt đầu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời gian kết thúc (tùy chọn)
                    </label>
                    <input
                      type="datetime-local"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Địa điểm (tùy chọn)
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nhắc nhở trước (phút)
                  </label>
                  <input
                    type="number"
                    name="reminder_minutes"
                    value={formData.reminder_minutes || ''}
                    onChange={handleNumberChange}
                    min="1"
                    max="1440"
                    placeholder="Số phút nhắc trước (VD: 15)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Độ ưu tiên
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Danh mục
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">Chung</option>
                      <option value="work">Công việc</option>
                      <option value="personal">Cá nhân</option>
                      <option value="meeting">Họp</option>
                      <option value="alarm">Báo thức</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trạng thái
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="scheduled">Đã lên lịch</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Cập nhật
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Xóa lịch trình</h3>
              <p className="text-gray-600 mb-6">
                Bạn có chắc chắn muốn xóa lịch trình "{selectedSchedule.event}"? 
                Hành động này không thể hoàn tác.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModals}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDeleteSchedule}
                  disabled={formLoading}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};