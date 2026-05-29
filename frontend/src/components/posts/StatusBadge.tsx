import React from 'react';
import { PostStatus } from '@/types';

const config: Record<PostStatus, { label: string; className: string }> = {
  OPEN:        { label: 'Open',        className: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-700' },
  RESOLVED:    { label: 'Resolved',    className: 'bg-green-100 text-green-700' },
  ARCHIVED:    { label: 'Archived',    className: 'bg-gray-100 text-gray-500' },
};

const StatusBadge: React.FC<{ status: PostStatus }> = ({ status }) => {
  const { label, className } = config[status] ?? config.OPEN;
  return <span className={`badge ${className}`}>{label}</span>;
};

export default StatusBadge;
