'use client';

import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/layout';
import { ChatInterface } from '@/components/chat/chat-interface';
import { ScheduleList } from '@/components/schedule/schedule-list';
import { CalendarView } from '@/components/schedule/calendar-view';
import { useAppStore } from '@/hooks/app-store';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';



export default function Home() {
  const { activeView } = useAppStore();
  const { isAuthenticated} = useAuth()
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  useEffect(()=>{ setIsMounted(true)},[])

 
  if (!isAuthenticated && isMounted) {
      router.push("/auth/login");
    }

  const renderContent = () => {
    switch (activeView) {
      case 'chat':
        return <ChatInterface />;
      case 'calendar':
        return <CalendarView />;
      case 'list':
        return <ScheduleList />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-80px)]">
        {renderContent()}
      </div>
    </Layout>
  );
}