import { Schedule, User } from '@/types';
import {
  ApiResponse,
  AuthResponse,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
  ChatRequest,
  AIResponse,
  ScheduleRequest,
  HealthResponse,
  EmailCheckResponse,
  UpcomingScheduleResponse
} from '@/types/api';
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';

class ApiClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private failedRequests: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    this.instance = axios.create({
      baseURL,
      timeout: 3000000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  public setTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;

    if (tokens.access_token) {
      localStorage.setItem('access_token', tokens.access_token);
    }
    if (tokens.refresh_token) {
      localStorage.setItem('refresh_token', tokens.refresh_token);
    }
    if (tokens.token_type) {
      localStorage.setItem('token_type', tokens.token_type);
    }

    if (tokens.expires_in) {
      const expiresAt = new Date().getTime() + tokens.expires_in * 1000;
      localStorage.setItem('token_expires_at', expiresAt.toString());
    }
  }

  public setUser(user: User): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('user', JSON.stringify(user));
  }

  public getUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  }

  public clearTokens(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('user');
  }

  private setupInterceptors(): void {
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log('API Response:', {
          url: response.config.url,
          status: response.status,
          data: response.data
        });
        return response;
      },
      async (error) => {
        console.error('API Error:', {
          url: error.config?.url,
          status: error.response?.status,
          error: error.response?.data
        });

        if (error.response?.status === 401) {
          console.log('Unauthorized, clearing tokens');
          this.clearTokens();

          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  public async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.instance(config);


      const responseData = response.data;

      return {
        success: responseData.success !== false,
        message: responseData.message,
        data: responseData.data || responseData,
        ...responseData
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string; detail?: string }>;

        return {
          success: false,
          message: axiosError.response?.data?.message ||
            axiosError.response?.data?.detail ||
            axiosError.message,
        };
      }

      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
      };
    }
  }

  public async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await this.instance.post('/api/auth/login', credentials);

      const responseData = response.data;

      if (responseData.success && responseData.token && responseData.user) {
        this.setTokens({
          access_token: responseData.token,
          token_type: 'bearer'
        });
        this.setUser(responseData.user);
      }

      return {
        success: responseData.success || false,
        message: responseData.message,
        data: responseData
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async register(credentials: Omit<RegisterCredentials, 'confirm_password'>): Promise<ApiResponse<AuthResponse>> {
    try {
      const response = await this.instance.post('/api/auth/register', credentials);

      const responseData = response.data;

      if (responseData.success && responseData.token && responseData.user) {
        this.setTokens({
          access_token: responseData.token,
          token_type: 'bearer'
        });
        this.setUser(responseData.user);
      }

      return {
        success: responseData.success || false,
        message: responseData.message,
        data: responseData
      };
    } catch (error: any) {
      console.error('Register error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async logout(): Promise<any> {
    try {
      // const response = await this.instance.post('/api/auth/logout');
      this.clearTokens();

      // return {
      //   success: response.data.success || false,
      //   message: response.data.message,
      // };
    } catch (error: any) {
      console.error('Logout error:', error);
      this.clearTokens();
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await this.instance.get('/api/auth/me');
      const responseData = response.data;

      if (responseData.success && responseData.user) {
        this.setUser(responseData.user);
      }

      return {
        success: responseData.success || false,
        message: responseData.message,
        data: responseData.user
      };
    } catch (error: any) {
      console.error('Get current user error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async updateProfile(userData: Partial<User & { current_password?: string; new_password?: string }>): Promise<ApiResponse<User>> {
    try {
      const response = await this.instance.put('/api/auth/update-profile', userData);
      const responseData = response.data;

      if (responseData.success && responseData.user) {
        this.setUser(responseData.user);
      }

      return {
        success: responseData.success || false,
        message: responseData.message,
        data: responseData.user
      };
    } catch (error: any) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async checkEmail(email: string): Promise<ApiResponse<EmailCheckResponse>> {
    try {
      const response = await this.instance.post('/api/auth/check-email', { email });

      return {
        success: response.data.success || false,
        message: response.data.message,
        data: response.data
      };
    } catch (error: any) {
      console.error('Check email error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async sendChatMessage(data: ChatRequest): Promise<ApiResponse<AIResponse>> {
    try {
      const response = await this.instance.post('/api/chat', data);

      return {
        success: response.data.success || false,
        message: response.data.message,
        data: response.data
      };
    } catch (error: any) {
      console.error('Chat error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async getSchedules(date?: string): Promise<ApiResponse<Schedule[]>> {
    try {
      const params = date ? { date } : {};
      const response = await this.instance.get('/api/schedules', { params });

      return {
        success: response.data.success || false,
        message: response.data.message,
        data: response.data.schedules || []
      };
    } catch (error: any) {
      console.error('Get schedules error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async getUpcomingSchedules(hours: number = 24): Promise<ApiResponse<Schedule[]>> {
    try {
      const response = await this.instance.get('/api/schedules/upcoming', {
        params: { hours }
      });

      console.log("api client respose", response)

      return {
        success: response.data.success || false,
        message: response.data.message,
        data: response.data.schedules || []
      };
    } catch (error: any) {
      console.error('Get upcoming schedules error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async createSchedule(data: Schedule): Promise<ApiResponse<any>> {
    try {
      const response = await this.instance.post('/api/schedules', data);

      return {
        success: response.data.success || false,
        message: response.data.message,
        data: response.data
      };
    } catch (error: any) {
      console.error('Create schedule error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async updateSchedule(scheduleId: number, data: ScheduleRequest): Promise<ApiResponse<any>> {
    try {
      const response = await this.instance.put(`/api/schedules/${scheduleId}`, data);

      return {
        success: response.data.success || false,
        message: response.data.message,
        data: response.data
      };
    } catch (error: any) {
      console.error('Update schedule error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async deleteSchedule(scheduleId: number): Promise<ApiResponse<any>> {
    try {
      const response = await this.instance.delete(`/api/schedules/${scheduleId}`);

      return {
        success: response.data.success || false,
        message: response.data.message,
        data: response.data
      };
    } catch (error: any) {
      console.error('Delete schedule error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async getSchedulesByCursor(params: {
    cursor?: number;
    limit?: number;
    date?: string;
    direction?: 'older' | 'newer';
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.instance.get('/api/schedules/cursor', { params });

      return {
        success: response.data.success || false,
        message: response.data.message,
        data: response.data
      };
    } catch (error: any) {
      console.error('Get schedules by cursor error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async healthCheck(): Promise<ApiResponse<HealthResponse>> {
    try {
      const response = await this.instance.get('/api/health');

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Health check error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }


  public async testOllama(message: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.instance.post('/api/test/ollama', { message });

      return {
        success: response.data.success || false,
        message: response.data.message,
        data: response.data
      };
    } catch (error: any) {
      console.error('Test Ollama error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public async debugOllamaPrompt(message: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.instance.post('/api/debug/ollama-prompt', { message });

      return {
        success: response.data.success || false,
        message: response.data.message,
        data: response.data
      };
    } catch (error: any) {
      console.error('Debug Ollama prompt error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message,
      };
    }
  }

  public isTokenExpired(): boolean {
    if (typeof window === 'undefined') return false;

    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return false;

    return Date.now() >= parseInt(expiresAt, 10);
  }
  public async getSchedulesInRange(startDate: string, endDate: string): Promise<any> {
    const response = this.request({
      method: 'GET',
      url: '/api/schedules/range',
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });

    return response;

  }

}

export const apiClient = new ApiClient();