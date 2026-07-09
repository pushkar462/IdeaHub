import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import Avatar from '@/components/shared/Avatar';
import {
  LayoutList,
  User as UserIcon,
  Bell,
  Megaphone,
  Shield,
  Activity,
  Users,
  BookOpen,
  ChevronDown,
  LogOut,
  X,
} from 'lucide-react';

// Handbook + redesign IA: one canonical Board; sections are a secondary
// browse axis, not their own destinations.
const PRIMARY = [
  { to: '/feed',          icon: LayoutList, label: 'Board' },
  { to: '/campaigns',     icon: Megaphone,  label: 'Campaigns' },
  { to: '/profile',       icon: UserIcon,   label: 'My contributions' },
  { to: '/notifications', icon: Bell,       label: 'Notifications' },
];

// The nine business sections plus General. Clicking a section jumps to the
// board pre-filtered by that section.
const SECTIONS: Array<{ id: string; label: string }> = [
  { id: 'BILLS',      label: 'Bills'      },
  { id: 'INVOICING',  label: 'Invoicing'  },
  { id: 'PATIENTS',   label: 'Patients'   },
  { id: 'CASES',      label: 'Cases'      },
  { id: 'PARTNERS',   label: 'Partners'   },
  { id: 'HOSPITALS',  label: 'Hospitals'  },
  { id: 'DOCTORS',    label: 'Doctors'    },
  { id: 'WHATSAPP',   label: 'WhatsApp'   },
  { id: 'PLATFORM',   label: 'Platform'   },
  { id: 'GENERAL',    label: 'General'    },
];

const ADMIN_NAV = [
  { to: '/admin/loop-health',    icon: Activity,  label: 'Loop health'      },
  { to: '/admin/section-owners', icon: Users,     label: 'Section owners'   },
  { to: '/admin/kb-sweep',       icon: BookOpen,  label: 'KB sweep'         },
  { to: '/admin/campaigns',      icon: Megaphone, label: 'Manage campaigns' },
  { to: '/admin/roles',          icon: Shield,    label: 'Role Management'  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'FOUNDER' || user?.role === 'ADMIN';
  const [sectionsOpen, setSectionsOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:translate-x-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
      w-64 flex-shrink-0 h-screen bg-white border-r border-surface-border
      flex flex-col overflow-y-auto shadow-sm
    `}>
      {/* Logo */}
      <div className="px-6 h-[84px] border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-brand-primary">
            <svg viewBox="0 0 100 100" className="w-8 h-8 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M40.5,15.5 C45,5 55,5 59.5,15.5 L80,62 C85,73 70,80 62.5,70 L55,58 L45,58 C35,58 20,70 15,60 L20,48 Z" />
              <circle cx="70" cy="50" r="8" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="font-bold text-gray-900 text-[20px] tracking-tight leading-none">athwart</p>
            <p className="font-heading italic text-brand-primary text-[15px] leading-none">Loop</p>
          </div>
        </div>
        <button className="md:hidden text-gray-400 hover:text-gray-900 p-1 rounded transition-colors" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-4 py-5 space-y-1">
        {PRIMARY.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            end={to === '/feed'}
            className={({ isActive }) => `nav-link group ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} className="opacity-80 transition-transform duration-300 group-hover:scale-110 group-hover:text-brand-primary" />
            <span className="flex-1 tracking-wide">{label}</span>
            {to === '/notifications' && unreadCount > 0 && (
              <span className="ml-auto bg-brand-primary text-white text-[10px] rounded-full px-2 py-0.5 flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}

        {/* Browse by section */}
        <div className="pt-5">
          <button
            onClick={() => setSectionsOpen((v) => !v)}
            className="flex items-center gap-1 px-4 pb-2 text-[10px] font-bold tracking-[0.14em] uppercase text-gray-400 hover:text-gray-600 transition-colors w-full"
          >
            <span>Browse by section</span>
            <ChevronDown size={12} className={`ml-auto transition-transform ${sectionsOpen ? '' : '-rotate-90'}`} />
          </button>
          {sectionsOpen && (
            <ul className="space-y-0.5">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <NavLink
                    to={`/feed?section=${s.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-1.5 rounded-lg text-[13px] text-gray-600 hover:bg-brand-light hover:text-brand-primary transition-colors"
                  >
                    <span className="inline-block w-1 h-1 rounded-full bg-gray-300"></span>
                    {s.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Admin group */}
        {isAdmin && (
          <div className="pt-5">
            <p className="px-4 pb-2 text-[10px] font-bold tracking-[0.14em] uppercase text-gray-400">
              Admin
            </p>
            {ADMIN_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) => `nav-link group ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} className="opacity-80 transition-transform duration-300 group-hover:scale-110 group-hover:text-brand-primary" />
                <span className="flex-1 tracking-wide">{label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="px-5 py-5 border-t border-surface-border/50 bg-gray-50/50">
        {user && (
          <div className="flex items-center gap-3 mb-4">
            <div className="ring-2 ring-brand-primary/20 rounded-full p-0.5">
              <Avatar user={user} size="sm" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate font-medium uppercase tracking-wider">{user.role?.replace('_', '/')}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-brand-primary hover:bg-brand-light transition-all px-3 py-2 rounded-xl font-medium"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
