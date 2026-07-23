'use client';

import Sidebar from '@/components/layout/sidebar';
import TopHeader from '@/components/layout/top-header';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex' }}>
      <Sidebar />
      {/* Main area — offset by sidebar on desktop only */}
      <div
        className="lg:ml-[268px]"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          minWidth: 0,
        }}
      >
        <TopHeader />
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
    </AuthGuard>
  );
}
