import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { APP_NAME } from '../constants/app';

export function PlaceholderPage({ title, phase, description }) {
  const location = useLocation();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="w-12 h-12 bg-paper border border-rule text-ink rounded flex items-center justify-center text-sm font-bold mb-4">
        {phase ? 'TBD' : '...'}
      </div>

      <span className="text-[10px] font-bold uppercase tracking-wider text-muted border border-rule px-2.5 py-0.5 rounded mb-3">
        {phase || 'Phase 3 Feature'}
      </span>

      <h1 className="font-calligraphy text-3xl font-normal text-ink mb-2">
        {title || 'Under Construction'}
      </h1>

      <p className="text-muted text-xs max-w-md mx-auto leading-relaxed mb-4">
        {description || `This section of ${APP_NAME} is scheduled for implementation in an upcoming phase per the platform roadmap.`}
      </p>

      <div className="bg-paper border border-rule text-muted font-mono text-[10px] px-2.5 py-1 rounded mb-6">
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
      <div className="w-16 h-16 bg-paper border border-rule text-muted rounded flex items-center justify-center text-xl font-bold mb-4">
        404
      </div>
      <h1 className="font-calligraphy text-3xl font-normal text-ink mb-2">
        Page Not Found
      </h1>
      <p className="text-muted text-xs max-w-sm mx-auto mb-6">
        The page you are looking for doesn&apos;t exist, has been removed, or has moved to a new destination.
      </p>
      <Link to="/">
        <Button variant="primary" size="md">
          Back to Safety
        </Button>
      </Link>
    </div>
  );
}
