import React from 'react';
import { User } from '@/types';

interface AvatarProps {
  user?: Partial<User>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };

const roleColors: Record<string, string> = {
  ADMIN:    'bg-red-100 text-red-700',
  FOUNDER:  'bg-purple-100 text-purple-700',
  FRONTEND: 'bg-blue-100 text-blue-700',
  BACKEND:  'bg-green-100 text-green-700',
  DEVOPS:   'bg-orange-100 text-orange-700',
  AI_ML:    'bg-pink-100 text-pink-700',
};

const Avatar: React.FC<AvatarProps> = ({ user, size = 'md', className = '' }) => {
  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const colorClass = roleColors[user?.role ?? ''] ?? 'bg-gray-100 text-gray-600';
  const sizeClass = sizes[size];

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center
                  font-semibold flex-shrink-0 ${className}`}
    >
      {initials}
    </div>
  );
};

export default Avatar;
