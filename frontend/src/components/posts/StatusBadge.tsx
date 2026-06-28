import React from 'react';
import { PostStatus } from '@/types';

const config: Record<string, { label: string; className: string }> = {
  OPEN:       { label: 'Open',       className: 'bg-transparent text-[#2ac25d] border-[#2ac25d]' },
  DISCUSSING: { label: 'Discussing', className: 'bg-transparent text-[#fec530] border-[#fec530]' },
  RESOLVED:   { label: 'Resolved',   className: 'bg-transparent text-[#0a6dd8] border-[#0a6dd8]' },
};

const StatusBadge: React.FC<{ status: PostStatus }> = ({ status }) => {
  const { label, className } = config[status] ?? config.OPEN;
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${className}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
