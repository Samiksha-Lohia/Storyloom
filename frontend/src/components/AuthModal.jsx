import React, { useState } from 'react';
import { api } from '../services/api';
import { X } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await api.auth.login(email, password);
      } else {
        await api.auth.register(name, email, password);
      }
      onAuthSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-ink/40 p-4">
      <div className="relative w-full max-w-md bg-paper border border-rule rounded p-6 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center text-muted hover:text-ink border border-transparent hover:border-rule rounded cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-5 text-center">
          <h2 className="text-xl font-bold text-ink mb-1">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>

          <p className="text-xs text-muted">
            {isLogin
              ? 'Sign in to access your story notebooks'
              : 'Get started to analyze your novels'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-paper text-danger rounded text-xs border border-danger">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
                Name
              </label>

              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="George R. R. Martin"
                className="w-full h-10 px-3 border border-rule rounded bg-paper text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ink"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="writer@storyloom.app"
              className="w-full h-10 px-3 border border-rule rounded bg-paper text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-10 px-3 border border-rule rounded bg-paper text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>

          {/* Main Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-2 bg-ink text-paper hover:bg-accent border border-ink rounded text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Loading…' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 text-center text-xs text-muted">
          {isLogin
            ? "Don't have an account? "
            : "Already have an account? "}

          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-ink font-semibold hover:underline cursor-pointer"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
