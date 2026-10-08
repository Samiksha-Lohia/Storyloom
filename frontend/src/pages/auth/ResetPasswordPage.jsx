import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthCollage from './AuthCollage';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Password reset token is missing from the URL.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-6">
      <div className="w-full max-w-4xl bg-paper rounded border border-rule overflow-hidden grid grid-cols-1 md:grid-cols-2 p-3 md:p-4 gap-4">
        <div className="h-full">
          <AuthCollage heading="Password Reset" />
        </div>

        <div className="flex flex-col justify-center px-6 py-8 md:px-10">
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
            <h1 className="font-calligraphy text-3xl font-normal text-ink">
              Set New Password
            </h1>
            <p className="text-xs text-muted mt-1 font-body">
              Please enter and confirm your new password below.
            </p>
          </div>

          {!token && (
            <div className="p-3 mb-4 text-xs bg-paper text-danger rounded border border-danger flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                No reset token provided. Please check the link from your email or request a new reset link.
              </span>
            </div>
          )}

          {submitted ? (
            <div className="space-y-4 py-4 text-center">
              <CheckCircle className="w-4 h-4 text-success mx-auto" />
              <h2 className="font-bold text-base text-ink">
                Password Reset Successfully
              </h2>
              <p className="text-xs text-muted leading-relaxed font-body">
                Your password has been updated. You can now log in using your new credentials.
              </p>
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="primary" size="md" className="w-full">
                    Proceed to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-xs bg-paper text-danger rounded border border-danger">
                  {error}
                </div>
              )}

              <Input
                id="new-password"
                label="New Password"
                type="password"
                required
                icon={Lock}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Input
                id="confirm-password"
                label="Confirm New Password"
                type="password"
                required
                icon={Lock}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || !token || !password || !confirmPassword}
                className="w-full font-bold mt-2"
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/forgot-password"
                  className="text-xs text-accent hover:underline font-bold"
                >
                  Need a new reset link?
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
