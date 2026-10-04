import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthCollage from './AuthCollage';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-6">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-[#E5E5E5] shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 p-3 md:p-4 gap-4">
        {/* Left Tinted Collage Panel */}
        <div className="h-full">
          <AuthCollage
            quote="Every story has a recovery beat. Regain your credentials and continue reading."
            roleBadge="Account Recovery"
          />
        </div>

        {/* Right Form Panel */}
        <div className="flex flex-col justify-center px-6 py-8 md:px-10">
          <div className="mb-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#FF500A] transition mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Login
            </Link>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-[#121212]">
              Reset Password
            </h1>
            <p className="text-xs md:text-sm text-[#6B6B6B] mt-1">
              Enter your email address to receive password reset instructions.
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4 py-4 text-center">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="font-heading font-bold text-lg text-stone-900">
                Instructions Dispatched
              </h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                If an account exists for <strong>{email}</strong>, a secure password reset link has been dispatched. Please check your inbox and spam folders.
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
              <Input
                id="reset-email"
                label="Email address"
                type="email"
                required
                icon={Mail}
                placeholder="reader@scenecraft.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading || !email}
                className="w-full font-bold shadow-xs mt-2"
              >
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-[#FF500A] hover:underline font-semibold"
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
