import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/common/Button';

export function PlaceholderPage({ title, phase, description }) {
  const location = useLocation();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="w-16 h-16 bg-[#FFF0E8] text-[#FF500A] rounded-2xl flex items-center justify-center text-2xl font-bold mb-4 shadow-xs">
        🚧
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-[#FF500A] bg-[#FFF0E8] px-3 py-1 rounded-full mb-3">
        {phase || 'Phase 3 Feature'}
      </span>

      <h1 className="font-heading text-3xl font-extrabold text-stone-900 tracking-tight mb-2">
        {title || 'Under Construction'}
      </h1>

      <p className="text-stone-600 text-sm max-w-md mx-auto leading-relaxed mb-4">
        {description || 'This section of SceneCraft is scheduled for implementation in an upcoming phase per the platform roadmap.'}
      </p>

      <div className="bg-stone-100 text-stone-500 font-mono text-xs px-3 py-1.5 rounded-lg mb-6">
        Route: {location.pathname}
      </div>

      <div className="flex gap-3">
        <Link to="/">
          <Button variant="secondary" size="md">
            Return to Home
          </Button>
        </Link>
        <Link to="/browse">
          <Button variant="primary" size="md">
            Browse Stories
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <div className="w-20 h-20 bg-stone-100 text-stone-400 rounded-3xl flex items-center justify-center text-3xl font-bold mb-4">
        404
      </div>
      <h1 className="font-heading text-3xl font-black text-stone-900 tracking-tight mb-2">
        Page Not Found
      </h1>
      <p className="text-stone-600 text-sm max-w-sm mx-auto mb-6">
        The page you are looking for doesn't exist, has been removed, or has moved to a new destination.
      </p>
      <Link to="/">
        <Button variant="primary" size="md">
          Back to Safety
        </Button>
      </Link>
    </div>
  );
}
