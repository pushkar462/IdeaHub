import React from 'react';
import { PostStatus } from '@/types';

const config: Record<PostStatus, { label: string; className: string }> = {
  BACKLOG:     { label: 'Backlog',     className: 'bg-gray-100 text-gray-700' },
  TODO:        { label: 'To Do',       className: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
  IN_REVIEW:   { label: 'In Review',   className: 'bg-purple-100 text-purple-700' },
  BLOCKED:     { label: 'Blocked',     className: 'bg-red-100 text-red-700' },
  DONE:        { label: 'Done',        className: 'bg-green-100 text-green-800' },
};

const StatusBadge: React.FC<{ status: PostStatus }> = ({ status }) => {
  const { label, className } = config[status] ?? config.TODO;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
