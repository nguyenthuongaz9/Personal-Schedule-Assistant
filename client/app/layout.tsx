import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'
import { ToastProvider } from '@/components/provider/toast-provider';
import { AuthProvider } from '@/context/auth-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Trợ lý Lịch trình - Quản lý lịch trình thông minh với AI',
  description: 'Ứng dụng quản lý lịch trình cá nhân tích hợp trợ lý ảo AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi"
    suppressHydrationWarning={true}
                         data-lt-installed="true"
    >
      <body className={inter.className}>
        <ToastProvider />
        <AuthProvider>
        {children}   
        </AuthProvider>
      </body>
    </html>
  );
}