import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon = '📭', title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
    <span className="text-5xl">{icon}</span>
    <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
    {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export default EmptyState;
