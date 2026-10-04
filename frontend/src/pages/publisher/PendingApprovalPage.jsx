import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Logo } from '../../components/common/Logo';

export function PendingApprovalPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>

        <div className="w-16 h-16 mx-auto mb-6 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full mb-3 uppercase tracking-wider">
          Status: Pending Review
        </span>

        <h1 className="font-heading text-2xl font-bold text-stone-900 mb-3">
          Publisher Account Submitted
        </h1>

        <p className="text-stone-600 text-sm leading-relaxed mb-6">
          Thank you for applying to the SceneCraft Publisher Network,{' '}
          <strong className="text-stone-800">{user?.name || 'Partner'}</strong>. To protect our community of writers and maintain high editorial integrity, our moderation team manually reviews publisher credentials and company affiliations.
        </p>

        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-left mb-6 text-xs text-stone-600 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Applicant:</span>
            <span className="font-semibold text-stone-800">{user?.email}</span>
          </div>
          {user?.publisherMetadata?.company && (
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Company:</span>
              <span className="font-semibold text-stone-800">{user.publisherMetadata.company}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Turnaround:</span>
            <span className="font-semibold text-stone-800">Typically within 24-48 business hours</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button variant="secondary" size="md" className="w-full sm:w-auto">
              Explore SceneCraft Home
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="md"
            className="w-full sm:w-auto text-stone-500 hover:text-stone-800"
            onClick={logout}
          >
            Sign out
          </Button>
        </div>
      </div>

      <p className="text-xs text-stone-400 mt-8 text-center">
        Need expedited review? Reach out to{' '}
        <a href="mailto:publishers@scenecraft.local" className="underline hover:text-stone-600">
          publishers@scenecraft.local
        </a>
      </p>
    </div>
  );
}
