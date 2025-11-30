'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAppStore } from '@/hooks/app-store';
import { ScheduleItem } from './schedule-item';

export const ScheduleList: React.FC = () => {
  const { schedules, selectedDate } = useAppStore();

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE, dd MMMM yyyy', { locale: vi });
  };

  const filteredSchedules = schedules.filter(schedule => {
    const scheduleDate = new Date(schedule.start_time).toISOString().split('T')[0];
    return scheduleDate === selectedDate;
  });

  if (schedules.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Chưa có lịch trình nào
        </h3>
        <p className="text-gray-600">
          Hãy thử nói chuyện với trợ lý ảo để tạo lịch trình mới
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Lịch trình {formatDate(selectedDate)}
        </h2>
        <span className="text-sm text-gray-500">
          {filteredSchedules.length} lịch trình
        </span>
      </div>

      {filteredSchedules.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            Không có lịch trình nào cho ngày này
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSchedules.map((schedule) => (
            <ScheduleItem key={schedule.id} schedule={schedule} />
          ))}
        </div>
      )}
    </div>
  );
};
