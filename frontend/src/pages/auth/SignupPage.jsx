import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Logo } from '../../components/common/Logo';
import { AuthCollage } from './AuthCollage';

export function SignupPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('reader');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
    website: '',
    note: '',
    agreeTerms: true,
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const calculatePasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-stone-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-emerald-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-600' };
  };

  const strength = calculatePasswordStrength(formData.password);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setGeneralError('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      errs.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }

    if (role === 'publisher') {
      if (!formData.company.trim()) {
        errs.company = 'Company / organization name is required for publishers';
      }
    }

    if (!formData.agreeTerms) {
      errs.agreeTerms = 'You must agree to the Terms of Service';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setGeneralError('');

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role,
        termsAccepted: formData.agreeTerms,
      };

      if (role === 'publisher') {
        let site = formData.website.trim();
        if (site && !/^https?:\/\//i.test(site)) {
          site = `https://${site}`;
        }
        payload.company = formData.company.trim();
        payload.website = site;
        payload.note = formData.note.trim();
      }

      await register(payload);

      if (role === 'publisher') {
        // Pending approval screen
        navigate('/p/apply-status');
      } else if (role === 'writer') {
        navigate('/w/dashboard');
      } else {
        navigate('/');
      }

    } catch (err) {
      // Never reveal specific user existence, keep message clear and generic
      setGeneralError(err.message || 'Unable to complete sign-up. Please verify your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
      {/* Left: Collage (Visual panel) */}
      <AuthCollage />

      {/* Right: Signup Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-14 xl:px-20 max-w-xl mx-auto md:max-w-none md:w-1/2 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile-only Logo */}
          <div className="md:hidden mb-6 flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="mb-6">
            <h1 className="font-heading text-3xl font-extrabold text-stone-900 tracking-tight">
              Join SceneCraft
            </h1>
            <p className="text-stone-600 mt-2 text-sm">
              Discover original stories, write your own narrative, or scout next-gen talent.
            </p>
          </div>

          {/* Role Chooser */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
              I want to join as:
            </label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Account type">
              {[
                { id: 'reader', label: 'Reader', desc: 'Read & react' },
                { id: 'writer', label: 'Writer', desc: 'Publish stories' },
                { id: 'publisher', label: 'Publisher', desc: 'Scout talent' },
              ].map((r) => {
                const active = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setRole(r.id);
                      setErrors({});
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      active
                        ? 'border-[#FF500A] bg-[#FFF0E8] text-[#FF500A] ring-2 ring-[#FF500A]/30 shadow-xs'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <span className="font-bold text-sm">{r.label}</span>
                    <span className="text-[11px] opacity-75 mt-0.5">{r.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {generalError && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{generalError}</span>
            </div>
          )}

          {/* Reserved Google Sign-in Slot */}
          <div className="mb-5">
            <button
              type="button"
              disabled
              title="Google authentication will be enabled in a future release"
              className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-full border border-stone-200 bg-stone-100 text-stone-400 font-medium text-sm cursor-not-allowed transition"
            >
              <svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign up with Google (coming soon)</span>
            </button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-stone-50 px-2 text-stone-500 font-semibold">Or with email</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              id="signup-name"
              label="Full name"
              name="name"
              type="text"
              placeholder="e.g. Alex Morgan"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />

            <Input
              id="signup-email"
              label="Email address"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />

            <div>
              <Input
                id="signup-password"
                label="Password"
                name="password"
                type="password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required
              />
              {/* Password strength meter */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 mb-1">
                    <span>Password strength:</span>
                    <span className="text-stone-700">{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 transition-all ${
                          strength.score >= step ? strength.color : 'bg-stone-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Tip: Use uppercase, numbers, and symbols to boost security.
                  </p>
                </div>
              )}
            </div>

            {/* Publisher Extra Fields */}
            {role === 'publisher' && (
              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h2 className="text-xs font-bold text-amber-900">Publisher Verification Notice</h2>
                    <p className="text-xs text-amber-800/90 mt-0.5">
                      Publisher accounts require manual administrator review before catalogue scout access is granted.
                    </p>
                  </div>
                </div>

                <Input
                  id="signup-company"
                  label="Publishing House / Agency"
                  name="company"
                  type="text"
                  placeholder="e.g. Horizon Literary Press"
                  value={formData.company}
                  onChange={handleChange}
                  error={errors.company}
                  required
                />

                <Input
                  id="signup-website"
                  label="Company Website"
                  name="website"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={handleChange}
                  error={errors.website}
                />

                <div>
                  <label htmlFor="signup-note" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Note for review team (optional)
                  </label>
                  <textarea
                    id="signup-note"
                    name="note"
                    rows={2}
                    placeholder="Tell us about the genres or talent you scout..."
                    value={formData.note}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FF500A] focus:border-transparent transition"
                  />
                </div>
              </div>
            )}

            {/* Terms checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-[#FF500A] focus:ring-[#FF500A]"
                />
                <span className="text-xs text-stone-600 leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="font-semibold text-stone-800 underline hover:text-[#FF500A]">
                    Terms of Service
                  </Link>{' '}
                  and acknowledge the{' '}
                  <Link to="/privacy" target="_blank" className="font-semibold text-stone-800 underline hover:text-[#FF500A]">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="text-xs text-red-600 mt-1 font-medium">{errors.agreeTerms}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-4"
              disabled={submitting}
            >
              {submitting ? 'Creating account...' : `Create ${role.charAt(0).toUpperCase() + role.slice(1)} Account`}
            </Button>
          </form>

          {/* Footer note */}
          <p className="text-center text-xs text-stone-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#FF500A] hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
