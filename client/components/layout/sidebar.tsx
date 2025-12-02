'use client';

import React from 'react';
import { MessageSquare, Calendar, List, Settings } from 'lucide-react';
import { ViewType } from '@/types';
import { useAppStore } from '@/hooks/app-store';

const menuItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Trò chuyện', icon: MessageSquare },
  { id: 'calendar', label: 'Lịch', icon: Calendar },
  { id: 'list', label: 'Danh sách', icon: List },
];

export const Sidebar: React.FC = () => {
  const { activeView, setActiveView } = useAppStore();

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border border-primary-600 shadow-2xl'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        
        <div className="mt-8 pt-8 border-t border-gray-200">
          <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors">
            <Settings className="h-5 w-5" />
            <span className="font-medium">Cài đặt</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};
