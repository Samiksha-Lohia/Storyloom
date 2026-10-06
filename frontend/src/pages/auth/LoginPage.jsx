import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthCollage from './AuthCollage';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { getRoleHomePath } from '../../utils/roleRedirect';
import { APP_NAME } from '../../constants/app';

export default function LoginPage() {
  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getDestination = (targetUser) => {
    const params = new URLSearchParams(location.search);
    const queryRedirect = params.get('redirectTo');
    if (queryRedirect) return queryRedirect;
    if (location.state?.redirectTo) return location.state.redirectTo;
    if (location.state?.from?.pathname) {
      return `${location.state.from.pathname}${location.state.from.search || ''}`;
    }
    if (typeof location.state?.from === 'string') {
      return location.state.from;
    }
    return getRoleHomePath(targetUser || user);
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDestination(user), { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state, location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      navigate(getDestination(data.user), { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-6 px-4">
      {/* Back to home navigation */}
      <div className="w-full max-w-4xl mb-3 flex items-center justify-start">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded px-2 py-1 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </Link>
      </div>

      <div className="w-full max-w-4xl bg-paper rounded border border-rule overflow-hidden grid grid-cols-1 md:grid-cols-2 p-3 md:p-4 gap-4">
        {/* Left Tinted Collage Panel */}
        <div className="h-full">
          <AuthCollage heading="Welcome back to your story." />
        </div>

        {/* Right Form Panel */}
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <div className="mb-6">
            <h1 className="font-calligraphy text-3xl font-normal text-ink mb-1">
              Log in
            </h1>
            <p className="text-xs text-muted font-body">
              Enter your credentials to continue reading and publishing.
            </p>
          </div>

          {/* Reserved Google Sign-in Slot */}
          <div className="mb-4">
            <button
              type="button"
              disabled
              className="w-full h-10 px-4 rounded border border-rule bg-paper text-muted text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed select-none"
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
              <div className="border-t border-rule w-full" />
              <span className="bg-paper px-3 text-[11px] uppercase tracking-wider text-muted font-semibold absolute">
                or with email
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mb-4 p-3 rounded bg-paper border border-danger text-danger text-xs flex items-start gap-2 select-none"
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
                  className="text-xs text-accent hover:underline cursor-pointer"
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
          <div className="mt-6 text-center text-xs text-muted">
            New to {APP_NAME}?{' '}
            <Link
              to={`/signup${location.search}`}
              state={location.state}
              className="font-bold text-accent hover:underline"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export { LoginPage };
