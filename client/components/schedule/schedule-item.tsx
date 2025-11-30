import React from 'react';
import { Clock, MapPin, Tag, MoreVertical, AlertCircle, CheckCircle } from 'lucide-react';
import { Schedule } from '@/types';
import { Card } from '@/components/ui/card';
import { formatScheduleTime } from '@/lib/utils';

interface ScheduleItemProps {
  schedule: Schedule;
}

export const ScheduleItem: React.FC<ScheduleItemProps> = ({ schedule }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            {getStatusIcon(schedule.status)}
            <h3 className="font-semibold text-gray-900 text-lg">
              {schedule.title}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(schedule.priority)}`}>
              {schedule.priority === 'high' ? 'Quan trọng' : 
               schedule.priority === 'medium' ? 'Bình thường' : 'Thấp'}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
              {schedule.status === 'scheduled' ? 'Đã lên lịch' :
               schedule.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
            </span>
          </div>

          {schedule.description && (
            <p className="text-gray-600 mb-3">{schedule.description}</p>
          )}

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{formatScheduleTime(schedule.start_time)}</span>
            </div>
            
            {schedule.category && (
              <div className="flex items-center space-x-1">
                <Tag className="h-4 w-4" />
                <span>{schedule.category}</span>
              </div>
            )}
          </div>
        </div>

        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
};
