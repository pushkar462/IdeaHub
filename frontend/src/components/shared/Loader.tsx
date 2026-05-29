import React from 'react';

const Loader: React.FC<{ text?: string }> = ({ text = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
    <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
    <span className="text-sm">{text}</span>
  </div>
);

export default Loader;
