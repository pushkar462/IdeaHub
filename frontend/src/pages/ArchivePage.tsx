import React, { useEffect, useState } from 'react';
import api from '@/api/axios';
import { Post } from '@/types';
import ArchiveCard from '@/components/archive/ArchiveCard';
import Loader from '@/components/shared/Loader';
import EmptyState from '@/components/shared/EmptyState';

const TYPES = ['QUESTION', 'PROBLEM', 'IDEA'];
const SECTIONS = ['BILLS', 'INVOICING', 'PATIENTS', 'CASES', 'PARTNERS', 'HOSPITALS', 'DOCTORS', 'WHATSAPP', 'PLATFORM', 'GENERAL'];

const ArchivePage: React.FC = () => {
  const [archive, setArchive] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [section, setSection] = useState('');

  const fetchArchive = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/archive', { params: { search, type, section } });
      setArchive(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchArchive, 300);
    return () => clearTimeout(timer);
  }, [search, type, section]);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="card p-5 bg-gradient-to-r from-gray-700 to-gray-900 text-white border-0">
        <h2 className="text-xl font-bold">🗄️ Memory Archive</h2>
        <p className="text-sm opacity-80 mt-1">
          Search past discussions, solved bugs, and approved ideas.
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <input
          className="input flex-1"
          placeholder="🔍 Search archive by title or content…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input sm:w-36"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All Types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          className="input sm:w-40"
          value={section}
          onChange={(e) => setSection(e.target.value)}
        >
          <option value="">All Sections</option>
          {SECTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : archive.length === 0 ? (
        <EmptyState
          icon="📦"
          title="Archive empty"
          description="No archived items match your search."
        />
      ) : (
        <div className="space-y-4">
          {archive.map((post) => (
            <ArchiveCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ArchivePage;
