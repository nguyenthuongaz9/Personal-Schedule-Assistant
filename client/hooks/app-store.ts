import { create } from 'zustand';
import { Schedule, ChatMessage, ViewType } from '@/types';
import { apiClient } from '@/lib/axios-client';

interface AppState {
  chatHistory: ChatMessage[];
  schedules: Schedule[];
  isLoading: boolean;
  activeView: ViewType;
  selectedDate: string;
  
}

interface AppStore extends AppState {
  setLoading: (loading: boolean) => void;
  addChatMessage: (message: ChatMessage) => void;
  setActiveView: (view: ViewType) => void;
  setSelectedDate: (date: string) => void;
  clearChatHistory: () => void;
  goToNextMonth: () => void;
  goToPrevMonth: () => void;
  goToToday: () => void;
  loadMonthSchedules: (monthStart: string, monthEnd:string) => void;
  fetchSchedulesByDate: (date: string) => Promise<void>;
}

const initialState: Omit<AppState, 'user'> = {
  chatHistory: [],
  schedules: [],
  isLoading: false,
  activeView: 'chat',
  selectedDate: new Date().toISOString().split('T')[0],
};

export const useAppStore = create<AppStore>((set, get) => ({
  
  ...initialState,

  

  setLoading: (loading) => set({ isLoading: loading }),

 

  

  

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
  

  fetchSchedulesByDate: async (date: string) => {
    try {
      set({ isLoading: true });
      const result = await apiClient.getSchedules(date);
      
      if (result.success && result.data) {
        const existingSchedules = get().schedules.filter(s => {
          const scheduleDate = new Date(s.start_time).toISOString().split('T')[0];
          return scheduleDate !== date;
        });
        
        const newSchedules = result.data;
        set({ schedules: [...existingSchedules, ...newSchedules] });
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  loadMonthSchedules: async (monthStart: string, monthEnd: string) => {
  try {
    set({ isLoading: true });
    const result = await apiClient.getSchedulesInRange(monthStart, monthEnd);
    
    console.log("result in store", result)
    if (result.success && result.data) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('Error loading month schedules:', error);
    return [];
  } finally {
    set({ isLoading: false });
  }
},
}));