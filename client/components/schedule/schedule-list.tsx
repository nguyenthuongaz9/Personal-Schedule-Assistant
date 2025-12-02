'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAppStore } from '@/hooks/app-store';
import { ScheduleItem } from './schedule-item';
import { Schedule } from '@/types';
import { apiClient } from '@/lib/axios-client';
import { Button } from '../ui/button';

interface PaginationInfo {
  next_cursor: number | null;
  prev_cursor: number | null;
  limit: number;
  direction: string;
  has_more: boolean;
}

interface ScheduleFormData {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  priority: string;
  category: string;
}

export const ScheduleList: React.FC = () => {
  const { selectedDate } = useAppStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [filterDate, setFilterDate] = useState<string>(() => {
    return '2025-12-01';
  });

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState<ScheduleFormData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    priority: 'medium',
    category: 'general'
  });

  // Format date function
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE, dd MMMM yyyy', { locale: vi });
  };

  // Format time for input
  const formatTimeForInput = (dateString: string) => {
    return new Date(dateString).toISOString().slice(0, 16);
  };

  // Fetch schedules function
  const fetchSchedules = useCallback(async (cursor?: number | null, direction: 'older' | 'newer' = 'older') => {
    const isLoadingMore = !!cursor;
    
    if (isLoadingMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params: any = {
        limit: 10,
        direction
      };
      
      if (cursor) {
        params.cursor = cursor;
      }
      
      if (filterDate && filterDate !== '') {
        params.date = filterDate;
      }
      
      const response = await apiClient.getSchedulesByCursor(params);
      
      console.log('API Response:', response);
      
      if (response.success && response.data) {
        const transformedSchedules: Schedule[] = response.data.schedules.map((schedule: any) => ({
          id: schedule.id,
          user_id: 1, // TODO: Lấy từ authentication
          title: schedule.title,
          description: schedule.description || '',
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          status: 'pending',
          priority: schedule.priority || 'medium',
          category: schedule.category || 'general',
          created_at: schedule.created_at || new Date().toISOString(),
          updated_at: schedule.updated_at || new Date().toISOString(),
          is_completed: false
        }));

        if (direction === 'older' && isLoadingMore) {
          setSchedules(prev => [...prev, ...transformedSchedules]);
        } else {
          setSchedules(transformedSchedules);
        }
        
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        throw new Error(response.message || 'Failed to fetch schedules');
      }
    } catch (err: any) {
      console.error('Fetch schedules error:', err);
      
      // Kiểm tra nếu là lỗi 401 (Unauthorized)
      if (err.response?.status === 401) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        // Có thể redirect đến trang login ở đây
        // if (typeof window !== 'undefined') {
        //   window.location.href = '/login';
        // }
      } else {
        setError('Không thể tải lịch trình. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterDate]);

  // Initial load and when filterDate changes
  useEffect(() => {
    setSchedules([]);
    fetchSchedules();
  }, [fetchSchedules, filterDate]);

  // Load more function
  const loadMore = useCallback(() => {
    if (pagination?.has_more && pagination.next_cursor && !loadingMore) {
      fetchSchedules(pagination.next_cursor, 'older');
    }
  }, [pagination, loadingMore, fetchSchedules]);

  // Refresh function
  const refresh = useCallback(() => {
    setSchedules([]);
    fetchSchedules();
  }, [fetchSchedules]);

  // Handle date filter change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterDate(e.target.value);
  };

  // Clear date filter
  const clearFilter = () => {
    setFilterDate('');
  };

  // Modal handlers
  const openAddModal = () => {
    const now = new Date();
    const defaultStart = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000); // 2 hours from now

    setFormData({
      title: '',
      description: '',
      start_time: formatTimeForInput(defaultStart.toISOString()),
      end_time: formatTimeForInput(defaultEnd.toISOString()),
      priority: 'medium',
      category: 'general'
    });
    setShowAddModal(true);
  };

  const openEditModal = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      title: schedule.title,
      description: schedule.description || '',
      start_time: formatTimeForInput(schedule.start_time),
      end_time: formatTimeForInput(schedule.end_time),
      priority: schedule.priority || 'medium',
      category: schedule.category || 'general'
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
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      priority: 'medium',
      category: 'general'
    });
  };

  // Form handlers
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit handlers
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const response = await apiClient.createSchedule({
        title: formData.title,
        description: formData.description,
        start_time: formData.start_time,
        end_time: formData.end_time,
        category: formData.category,
        priority: formData.priority,
      });
      
      if (response.success) {
        closeModals();
        refresh(); // Refresh the list
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
        title: formData.title,
        description: formData.description,
        start_time: formData.start_time,
        end_time: formData.end_time,
        category: formData.category,
        priority: formData.priority,
      });
      
      if (response.success) {
        closeModals();
        refresh(); // Refresh the list
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
        refresh(); // Refresh the list
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
      {/* Header với filter và button thêm */}
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

      {/* Date Filter */}
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
            className="px-3 py-2 "
          >
            Xóa lọc
          </Button>
        )}
        <Button
          onClick={refresh}
          className="px-3 py-2 text-sm gap-2"
        >
          <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Error State */}
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

      {/* Loading State */}
      {loading && schedules.length === 0 && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Schedules List */}
      {displaySchedules.length > 0 && (
        <div className="space-y-3">
          {displaySchedules.map((schedule) => (
            <div key={schedule.id} className="group relative">
              <ScheduleItem schedule={schedule} />
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={() => openEditModal(schedule)}
                  className="p-2 rounded-lg"
                  title="Sửa"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  onClick={() => openDeleteModal(schedule)}
                  className="p-2 rounded-lg"
                  variant="destructive"
                  title="Xóa"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
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

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Thêm lịch trình mới</h3>
              <form onSubmit={handleAddSchedule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiêu đề *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
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
                      Thời gian bắt đầu *
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
                      Thời gian kết thúc *
                    </label>
                    <input
                      type="datetime-local"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
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
                      <option value="health">Sức khỏe</option>
                    </select>
                  </div>
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

      {/* Edit Schedule Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Sửa lịch trình</h3>
              <form onSubmit={handleEditSchedule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiêu đề *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
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
                      Thời gian bắt đầu *
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
                      Thời gian kết thúc *
                    </label>
                    <input
                      type="datetime-local"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
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
                      <option value="health">Sức khỏe</option>
                    </select>
                  </div>
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

      {/* Delete Schedule Modal */}
      {showDeleteModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Xóa lịch trình</h3>
              <p className="text-gray-600 mb-6">
                Bạn có chắc chắn muốn xóa lịch trình "{selectedSchedule.title}"? 
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