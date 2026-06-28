import React, { useState } from 'react';
import api from '@/api/axios';

interface Props {
  postId: number;
  initialSummary?: {
    summary: string;
    keyPoints: string[];
    risks: string[];
    nextActions: string[];
  } | null;
  isLocked?: boolean;
}

const AISummary: React.FC<Props> = ({ postId, initialSummary, isLocked }) => {
  const [loading, setLoading] = useState(false);
  // initialSummary is passed via WebSocket or feed fetch. We can rely on it if present.
  
  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Trigger async job. The WebSocket will return the actual summary on success.
      await api.post(`/intelligence/summary/${postId}`);
    } catch (err) {
      console.error('Failed to trigger summary', err);
      setLoading(false); // only reset loading if it fails instantly. Otherwise wait for ws.
    }
  };

  // If we have a summary, we render it
  if (initialSummary) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100 shadow-sm animate-in">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">✨</span>
          <h4 className="font-semibold text-indigo-900">AI-Generated Summary</h4>
        </div>
        
        <p className="text-sm text-indigo-800 mb-4 leading-relaxed">
          {initialSummary.summary}
        </p>

        {initialSummary.keyPoints?.length > 0 && (
          <div className="mb-4">
            <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">Key Points</h5>
            <ul className="space-y-1 text-sm text-indigo-800">
              {initialSummary.keyPoints.map((kp, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-indigo-400">•</span>
                  <span>{kp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {initialSummary.risks?.length > 0 && (
            <div className="bg-white/60 rounded-lg p-3 border border-red-100">
              <h5 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span>⚠️</span> Risks
              </h5>
              <ul className="space-y-1 text-xs text-red-900">
                {initialSummary.risks.map((r, i) => <li key={i}>- {r}</li>)}
              </ul>
            </div>
          )}
          
          {initialSummary.nextActions?.length > 0 && (
            <div className="bg-white/60 rounded-lg p-3 border border-green-100">
              <h5 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span>🎯</span> Next Actions
              </h5>
              <ul className="space-y-1 text-xs text-green-900">
                {initialSummary.nextActions.map((a, i) => <li key={i}>- {a}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl">
          ✨
        </div>
        <div>
          <h4 className="font-medium text-gray-900">Workflow Summary</h4>
          <p className="text-xs text-gray-500">Too long to read? Let AI summarize it.</p>
        </div>
      </div>
      
      <button 
        onClick={handleGenerate} 
        disabled={loading || isLocked}
        className={`btn-primary py-2 px-4 transition-colors ${
          loading || isLocked 
            ? 'opacity-50 cursor-not-allowed' 
            : ''
        }`}
      >
        {loading ? 'Generating...' : isLocked ? 'Locked' : 'Generate Summary'}
      </button>
    </div>
  );
};

export default AISummary;
