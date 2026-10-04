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
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
        <div className="w-8 h-8 rounded-full border-3 border-[#FF500A] border-t-transparent animate-spin" />
        <p className="mt-3 text-sm text-[#6B6B6B]">Loading your account...</p>
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-serif text-[#121212] mb-2">
          Publisher Application Under Review
        </h2>
        <p className="text-sm text-[#6B6B6B] leading-relaxed mb-6">
          Thank you for applying as a verified publisher. An administrator is currently reviewing
          your company details ({user.publisherProfile?.company || 'Publisher'}). You will be able
          to browse catalogue pitch views and send publishing requests once approved.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => (window.location.href = '/')}>
            Browse as Reader
          </Button>
        </div>
      </div>
    );
  }

  // If role is restricted and user does not have an allowed role
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-50 text-[#D63B2F] flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-serif text-[#121212] mb-2">
          Access Restricted
        </h2>
        <p className="text-sm text-[#6B6B6B] mb-6">
          This area is designated for {allowedRoles.join(', ')} roles. Your current account role is{' '}
          <span className="font-semibold text-[#121212] capitalize">{role}</span>.
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

