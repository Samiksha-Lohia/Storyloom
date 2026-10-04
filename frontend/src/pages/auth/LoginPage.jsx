import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthCollage from './AuthCollage';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectByRole = (user) => {
    // If user came from a specific protected page, redirect back there
    if (location.state?.from?.pathname) {
      navigate(location.state.from.pathname);
      return;
    }

    if (user.role === 'writer') {
      navigate('/w/dashboard');
    } else if (user.role === 'publisher') {
      if (user.status === 'pending') {
        navigate('/p/apply-status');
      } else {
        navigate('/p/discover');
      }
    } else if (user.role === 'admin') {
      navigate('/a/overview');
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      redirectByRole(data.user);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-6">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-[#E5E5E5] shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 p-3 md:p-4 gap-4">
        {/* Left Tinted Collage Panel */}
        <div className="h-full">
          <AuthCollage heading="Welcome back to your story." />
        </div>

        {/* Right Form Panel */}
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#121212] mb-1.5">
              Log in
            </h1>
            <p className="text-xs md:text-sm text-[#6B6B6B]">
              Enter your credentials to continue reading and publishing.
            </p>
          </div>

          {/* Reserved Google Sign-in Slot */}
          <div className="mb-5">
            <button
              type="button"
              disabled
              className="w-full h-11 px-4 rounded-full border border-[#E5E5E5] bg-slate-50 text-slate-400 text-xs md:text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed select-none"
            >
              <svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                />
              </svg>
              <span>Continue with Google (Coming Soon)</span>
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-[#E5E5E5] w-full" />
              <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
                or with email
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-[#D63B2F] text-xs flex items-start gap-2 select-none"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="login-email"
              label="Email"
              type="email"
              required
              icon={Mail}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div>
              <Input
                id="login-password"
                label="Password"
                type="password"
                required
                icon={Lock}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex justify-end mt-1.5">
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#FF500A] hover:underline cursor-pointer"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="default"
              loading={loading}
              className="w-full mt-2"
            >
              Log in
            </Button>
          </form>

          {/* Sign up link */}
          <div className="mt-6 text-center text-xs text-[#6B6B6B]">
            New to SceneCraft?{' '}
            <Link to="/signup" className="font-semibold text-[#FF500A] hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export { LoginPage };

