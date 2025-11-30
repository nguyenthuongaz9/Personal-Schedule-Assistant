import { create } from 'zustand';
import { AppState, Schedule, ChatMessage, ViewType } from '@/types';

interface AppStore extends AppState {
  // Actions
  setLoading: (loading: boolean) => void;
  setSchedules: (schedules: Schedule[]) => void;
  addSchedule: (schedule: Schedule) => void;
  updateSchedule: (id: number, updates: Partial<Schedule>) => void;
  deleteSchedule: (id: number) => void;
  addChatMessage: (message: ChatMessage) => void;
  setActiveView: (view: ViewType) => void;
  setSelectedDate: (date: string) => void;
  clearChatHistory: () => void;
  goToNextMonth: () => void;
  goToPrevMonth: () => void;
  goToToday: () => void;
}

const initialState: Omit<AppState, 'user'> = {
  schedules: [],
  chatHistory: [],
  isLoading: false,
  activeView: 'chat',
  selectedDate: new Date().toISOString().split('T')[0],
};

export const useAppStore = create<AppStore>((set, get) => ({
  user: {
    id: 1,
    username: 'demo_user',
    email: 'demo@example.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  ...initialState,

  setLoading: (loading) => set({ isLoading: loading }),

  setSchedules: (schedules) => set({ schedules }),

  addSchedule: (schedule) => 
    set((state) => ({ 
      schedules: [...state.schedules, schedule] 
    })),

  updateSchedule: (id, updates) =>
    set((state) => ({
      schedules: state.schedules.map(schedule =>
        schedule.id === id ? { ...schedule, ...updates } : schedule
      ),
    })),

  deleteSchedule: (id) =>
    set((state) => ({
      schedules: state.schedules.filter(schedule => schedule.id !== id),
    })),

  addChatMessage: (message) =>
    set((state) => ({
      chatHistory: [...state.chatHistory, message],
    })),

  setActiveView: (view) => set({ activeView: view }),

  setSelectedDate: (date) => set({ selectedDate: date }),

  clearChatHistory: () => set({ chatHistory: [] }),
  goToNextMonth: () => {
      const currentMonth = new Date(get().selectedDate);
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      set({ selectedDate: currentMonth.toISOString().split('T')[0] });
    },
    
  goToPrevMonth: () => {
    const currentMonth = new Date(get().selectedDate);
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    set({ selectedDate: currentMonth.toISOString().split('T')[0] });
  },
  
  goToToday: () => {
    set({ selectedDate: new Date().toISOString().split('T')[0] });
  },
}));
