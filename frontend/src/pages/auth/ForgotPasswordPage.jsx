import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthCollage from './AuthCollage';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '../../services/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to request password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-6">
      <div className="w-full max-w-4xl bg-paper rounded border border-rule overflow-hidden grid grid-cols-1 md:grid-cols-2 p-3 md:p-4 gap-4">
        <div className="h-full">
          <AuthCollage heading="Account Recovery" />
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
              Reset Password
            </h1>
            <p className="text-xs text-muted mt-1 font-body">
              Enter your email address to receive password reset instructions.
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4 py-4 text-center">
              <CheckCircle className="w-4 h-4 text-success mx-auto" />
              <h2 className="font-bold text-base text-ink">
                Instructions Sent
              </h2>
              <p className="text-xs text-muted leading-relaxed font-body">
                If an account exists for <strong>{email}</strong>, a password reset link has been sent. Please check your inbox.
              </p>
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="primary" size="md" className="w-full">
                    Return to Login
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
                id="reset-email"
                label="Email address"
                type="email"
                required
                icon={Mail}
                placeholder="reader@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || !email}
                className="w-full font-bold mt-2"
              >
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-accent hover:underline font-bold"
                >
                  Remember your password? Log in
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
