import { Schedule } from ".";

export interface ChatRequest {
  user_id: number;
  message: string;
}

export interface ScheduleRequest {
  user_id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  schedules?: Schedule[];
}
