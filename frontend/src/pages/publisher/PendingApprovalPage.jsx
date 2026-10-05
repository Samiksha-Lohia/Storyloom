import React from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Logo } from '../../components/common/Logo';
import { APP_NAME } from '../../constants/app';

export function PendingApprovalPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-paper flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-lg bg-paper rounded border border-rule p-8 text-center">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>

        <div className="w-12 h-12 mx-auto mb-4 border border-rule rounded flex items-center justify-center text-muted">
          <Clock className="w-5 h-5" />
        </div>

        <span className="inline-block px-2.5 py-0.5 border border-rule text-muted text-xs font-bold rounded mb-3 uppercase tracking-wider">
          Status: Pending Review
        </span>

        <h1 className="font-calligraphy text-2xl sm:text-3xl font-normal text-ink mb-3">
          Publisher Account Submitted
        </h1>

        <p className="text-muted text-xs leading-relaxed mb-6">
          Thank you for applying to the {APP_NAME} Publisher Network,{' '}
          <strong className="text-ink">{user?.name || 'Partner'}</strong>. To protect our community of writers and maintain high editorial integrity, our moderation team manually reviews publisher credentials and company affiliations.
        </p>

        <div className="bg-paper border border-rule rounded p-4 text-left mb-6 text-xs text-muted space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted">Applicant:</span>
            <span className="font-semibold text-ink">{user?.email}</span>
          </div>
          {user?.publisherMetadata?.company && (
            <div className="flex items-center justify-between">
              <span className="text-muted">Company:</span>
              <span className="font-semibold text-ink">{user.publisherMetadata.company}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted">Turnaround:</span>
            <span className="font-semibold text-ink">Typically within 24-48 business hours</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button variant="secondary" size="md" className="w-full sm:w-auto">
              Explore {APP_NAME} Home
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="md"
            className="w-full sm:w-auto text-muted hover:text-ink"
            onClick={logout}
          >
            Sign out
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted mt-8 text-center">
        Need expedited review? Reach out to{' '}
        <a href="mailto:publishers@storyloom.app" className="underline hover:text-ink">
          publishers@storyloom.app
        </a>
      </p>
    </div>
  );
}
