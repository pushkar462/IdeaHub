import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

const ProtectedRoute: React.FC = () => {
  const { token, user, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token && !user) fetchMe();
  }, [token, user, fetchMe]);

  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export default ProtectedRoute;
