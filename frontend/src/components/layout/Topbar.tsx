import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import CreatePostModal from '@/components/posts/CreatePostModal';
import { Menu, Plus } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/feed':          'Loop',
  '/archive':       'Memory Archive',
  '/notifications': 'Notifications',
  '/profile':       'My contributions',
  '/admin/roles':          'Role Management',
  '/admin/loop-health':    'Loop health',
  '/admin/section-owners': 'Section owners',
  '/admin/kb-sweep':       'KB sweep',
  '/admin/campaigns':      'Manage campaigns',
  '/campaigns':            'Campaigns',
};

interface TopbarProps {
  onMenuClick?: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const { pathname } = useLocation();
  const [modalOpen, setModalOpen] = useState(false);

  const title = PAGE_TITLES[pathname] ?? 'Athwart Loop';

  return (
    <>
      <header className="h-[84px] flex items-center justify-between px-5 md:px-8 bg-white border-b
                         border-gray-100 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick} 
            className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">{title}</h1>
        </div>
        <button
          id="create-post-btn"
          onClick={() => setModalOpen(true)}
          className="btn-primary group"
        >
          <Plus size={18} className="transition-transform group-hover:rotate-90" />
          <span className="hidden md:inline-block ml-1">New Post</span>
        </button>
      </header>

      <CreatePostModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};

export default Topbar;
