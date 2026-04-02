'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminShell from './AdminShell';

interface Props {
  children: React.ReactNode;
  lowStockCount: number;
  newOrdersCount: number;
}

export default function AdminLayoutWrapper({
  children,
  lowStockCount,
  newOrdersCount,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
        setUserRole(decoded.role);
        setIsAuthed(true);
      } catch (e) {
        localStorage.removeItem('auth_token');
        console.error('Invalid token');
      }
    }
    setIsLoading(false);
  }, []);

  // Redirect to login if not authenticated and trying to access admin pages
  useEffect(() => {
    if (!isLoading && !isAuthed && pathname.startsWith('/admin') && pathname !== '/admin/dashboard') {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthed, pathname, router]);

  // Don't render AdminShell for auth routes
  if (pathname.startsWith('/auth')) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block animate-spin rounded-full border-4 border-gray-300 border-t-rose-600 h-12 w-12"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to access this page.</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="rounded-lg bg-rose-600 px-6 py-2 text-white font-semibold hover:bg-rose-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminShell lowStockCount={lowStockCount} newOrdersCount={newOrdersCount}>
      {children}
    </AdminShell>
  );
}
