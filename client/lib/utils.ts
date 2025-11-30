import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { vi } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScheduleTime(dateTimeString: string): string {
  const date = parseISO(dateTimeString);
  
  if (isToday(date)) {
    return `Hôm nay, ${format(date, 'HH:mm', { locale: vi })}`;
  } else if (isTomorrow(date)) {
    return `Ngày mai, ${format(date, 'HH:mm', { locale: vi })}`;
  } else if (isThisWeek(date)) {
    return `${format(date, 'EEEE, HH:mm', { locale: vi })}`;
  } else {
    return format(date, 'dd/MM/yyyy, HH:mm', { locale: vi });
  }
}

export function getVietnameseDay(date: Date): string {
  const days: { [key: string]: string } = {
    'Monday': 'Thứ Hai',
    'Tuesday': 'Thứ Ba',
    'Wednesday': 'Thứ Tư',
    'Thursday': 'Thứ Năm',
    'Friday': 'Thứ Sáu',
    'Saturday': 'Thứ Bảy',
    'Sunday': 'Chủ Nhật'
  };
  
  const englishDay = format(date, 'EEEE');
  return days[englishDay] || englishDay;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  
  return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
}
