import React from 'react';

interface EmptyStateProps {
  /** Either a Lucide icon element or a legacy emoji string. */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
    {icon !== undefined && (
      <div className="w-14 h-14 rounded-full bg-brand-light/50 flex items-center justify-center mb-1">
        {typeof icon === 'string' ? <span className="text-2xl">{icon}</span> : icon}
      </div>
    )}
    <h3 className="text-base font-semibold text-gray-800 font-heading">{title}</h3>
    {description && <p className="text-sm text-gray-500 max-w-sm leading-relaxed">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export default EmptyState;
