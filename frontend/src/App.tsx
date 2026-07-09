import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from '@/routes/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import FeedPage from '@/pages/FeedPage';
import ArchivePage from '@/pages/ArchivePage';
import NotificationsPage from '@/pages/NotificationsPage';
import ProfilePage from '@/pages/ProfilePage';
import PostDetailPage from '@/pages/PostDetailPage';
import RoleManagementPage from '@/pages/RoleManagementPage';
import AdminLoopHealthPage from '@/pages/AdminLoopHealthPage';
import AdminSectionOwnersPage from '@/pages/AdminSectionOwnersPage';
import AdminKbSweepPage from '@/pages/AdminKbSweepPage';
import AdminCampaignsPage from '@/pages/AdminCampaignsPage';
import CampaignsPage from '@/pages/CampaignsPage';
import CampaignDetailPage from '@/pages/CampaignDetailPage';

const App: React.FC = () => (
  <>
    <Toaster position="bottom-right" />
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Landing = the Board (search-first, per handbook + redesign audit) */}
          <Route index element={<Navigate to="/feed" replace />} />
          <Route path="/feed" element={<FeedPage />} />
          {/* Legacy destinations kept as redirects so old bookmarks still resolve. */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/post/:id" element={<PostDetailPage />} />
          <Route path="/admin/roles" element={<RoleManagementPage />} />
          <Route path="/admin/loop-health"    element={<AdminLoopHealthPage />} />
          <Route path="/admin/section-owners" element={<AdminSectionOwnersPage />} />
          <Route path="/admin/kb-sweep"       element={<AdminKbSweepPage />} />
          <Route path="/admin/campaigns"      element={<AdminCampaignsPage />} />
          <Route path="/campaigns"            element={<CampaignsPage />} />
          <Route path="/campaigns/:id"        element={<CampaignDetailPage />} />
        </Route>
      </Route>

      {/* Catch-all lands on the board too */}
      <Route path="*" element={<Navigate to="/feed" replace />} />
    </Routes>
  </>
);

export default App;
