import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import CreatePostModal from '@/components/posts/CreatePostModal';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/feed':          'Product Feed',
  '/ideas':         'Ideas Space',
  '/archive':       'Memory Archive',
  '/notifications': 'Notifications',
  '/profile':       'Profile',
};

const Topbar: React.FC = () => {
  const { pathname } = useLocation();
  const [modalOpen, setModalOpen] = useState(false);

  const title = PAGE_TITLES[pathname] ?? 'CollabHub';

  return (
    <>
      <header className="h-14 flex items-center justify-between px-6 bg-white border-b
                         border-surface-border sticky top-0 z-30">
        <h1 className="text-base font-semibold text-gray-800">{title}</h1>
        <button
          id="create-post-btn"
          onClick={() => setModalOpen(true)}
          className="btn-primary"
        >
          <span className="text-base leading-none">+</span>
          New Post
        </button>
      </header>

      <CreatePostModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default Topbar;
