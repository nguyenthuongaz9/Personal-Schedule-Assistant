import { Schedule, User } from ".";

export interface ChatRequest {
  user_id?: number;
  message: string;
}

export interface ScheduleRequest {
  user_id?: number;
  event: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location:string;
  reminder_minutes?:number;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
}
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  schedules?: Schedule[];
}
export interface AIResponse {
  success: boolean;
  message: string;
  response?: string;
  intent?: string;
  schedule?: any;
  [key: string]: any;
}
export interface ScheduleListResponse {
  success: boolean;
  schedules: Schedule[];
  count: number;
  [key: string]: any;
}
export interface HealthResponse {
  status: string;
  service: string;
  database: string;
  ollama: string;
  ollama_model: string;
  version: string;
  authentication: string;
}

export interface EmailCheckResponse {
  success: boolean;
  available: boolean;
  message: string;
}


export interface LoginCredentials {
  email: string;
  password: string;
}


export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in?: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}
export interface ApiError {
  detail: string;
  status_code: number;
  errors?: Record<string, string[]>;
}

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: ApiError | null;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface VerifyTokenResponse {
  valid: boolean;
  user_id?: string;
}
export interface UpcomingScheduleResponse {
  success: boolean;
  schedules: Schedule[];
  count: number;
  timeframe_hours: number;
  message?: string;
}
