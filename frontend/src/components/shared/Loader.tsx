import React from 'react';

interface LoaderProps {
  text?: string;
  size?: number;
}

const Loader: React.FC<LoaderProps> = ({ text = 'Loading…', size = 32 }) => (
  <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-400">
    <div 
      className="border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" 
      style={{ width: size, height: size }}
    />
    {text && <span className="text-sm font-medium">{text}</span>}
  </div>
);

export default Loader;
