import axios from 'axios';
import { ChatRequest, ScheduleRequest, ApiResponse, AIResponse, Schedule } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Tạo axios instance với timeout dài
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 320000, // 320 giây (5 phút 20 giây) - dài hơn backend 10 giây
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    console.log(`Timeout setting: ${config.timeout}ms`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - Server is taking too long to respond');
      }
      if (error.response) {
        // Server responded with error status
        throw new Error(error.response.data?.message || `Server error: ${error.response.status}`);
      } else if (error.request) {
        // Network error
        throw new Error('Network error - Cannot connect to server');
      }
    }

    throw new Error(error.message || 'Unknown error occurred');
  }
);

export const chatAPI = {
  sendMessage: (data: ChatRequest): Promise<AIResponse> =>
    api.post('/api/chat', data),
};

export const scheduleAPI = {
  getSchedules: (userId: number, date?: string): Promise<ApiResponse<Schedule[]>> =>
    api.get('/api/schedules', { params: { user_id: userId, date } }),

  getUpcomingSchedules: (userId: number, hours: number = 24): Promise<ApiResponse<Schedule[]>> =>
    api.get('/api/schedules/upcoming', { params: { user_id: userId, hours } }),

  createSchedule: (data: ScheduleRequest): Promise<ApiResponse> =>
    api.post('/api/schedules', data),
};

export const healthAPI = {
  check: (): Promise<{ status: string; service: string }> =>
    api.get('/api/health'),
};

export default api;
