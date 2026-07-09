import React from 'react';
import { Navigate } from 'react-router-dom';

// Handbook + redesign IA: the Archive is no longer a separate destination.
// It's just the Board with a Resolved filter. Existing bookmarks still work.
const ArchivePage: React.FC = () => <Navigate to="/feed?status=RESOLVED" replace />;

export default ArchivePage;
