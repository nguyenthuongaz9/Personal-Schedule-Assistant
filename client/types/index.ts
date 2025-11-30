export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: number;
  user_id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  category: string;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  type: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  data?: any;
  isError?: boolean;
}

export interface AIResponse {
  success: boolean;
  message: string;
  type?: string;
  schedules?: Schedule[];
  schedule_id?: number;
}

export interface AppState {
  user: User;
  schedules: Schedule[];
  chatHistory: ChatMessage[];
  isLoading: boolean;
  activeView: 'chat' | 'calendar' | 'list';
  selectedDate: string;
}
export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  schedules: Schedule[];
}

export interface SuggestedMessage {
  id: number;
  text: string;
  category: 'schedule' | 'query' | 'update' | 'delete';
}
export type ViewType = 'chat' | 'calendar' | 'list';
