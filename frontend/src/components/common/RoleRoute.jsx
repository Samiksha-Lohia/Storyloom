import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Clock, ShieldAlert } from 'lucide-react';
import Button from './Button';

export default function RoleRoute({ children, allowedRoles = [] }) {
  const { user, role, status, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 bg-paper text-ink">
        <p className="text-sm font-bold text-muted">Loading…</p>
      </div>
    );
  }

  // If not logged in, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If pending publisher, render the waiting for approval screen
  if (role === 'publisher' && status === 'pending') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto bg-paper text-ink">
        <div className="w-10 h-10 rounded border border-rule flex items-center justify-center mb-4 text-ink">
          <Clock className="w-4 h-4" />
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">
          Publisher Application Under Review
        </h2>
        <p className="text-sm text-muted leading-relaxed mb-6 font-body">
          Thank you for applying as a verified publisher. An administrator is currently reviewing
          your company details ({user.publisherProfile?.company || 'Publisher'}). You will be able
          to browse catalogue pitch views and send publishing requests once approved.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => (window.location.href = '/')}>
            Browse as Reader
          </Button>
        </div>
      </div>
    );
  }

  // If role is restricted and user does not have an allowed role
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto bg-paper text-ink">
        <div className="w-10 h-10 rounded border border-danger text-danger flex items-center justify-center mb-4">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <h2 className="text-xl font-bold text-ink mb-2">
          Access Restricted
        </h2>
        <p className="text-sm text-muted mb-6 font-body">
          This area is designated for {allowedRoles.join(', ')} roles. Your current account role is{' '}
          <span className="font-bold text-ink capitalize">{role}</span>.
        </p>
        <Button variant="primary" onClick={() => (window.location.href = '/')}>
          Return to Home
        </Button>
      </div>
    );
  }

  return children;
}

export { RoleRoute };
