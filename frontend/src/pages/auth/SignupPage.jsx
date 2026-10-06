import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { AuthCollage } from './AuthCollage';
import { APP_NAME } from '../../constants/app';
import { getRoleHomePath } from '../../utils/roleRedirect';

const ROLES = [
  { id: 'reader', label: 'Reader', desc: 'Read & react' },
  { id: 'writer', label: 'Writer', desc: 'Publish stories' },
  { id: 'publisher', label: 'Apply as publisher', desc: 'Scout talent' },
];

export function SignupPage() {
  const { register, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('reader');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
    website: '',
    note: '',
    agreeTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const roleRefs = useRef({});
  const location = useLocation();

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

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getDestination(user), { replace: true });
    }
  }, [isAuthenticated, user, navigate, location.state, location.search]);

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

  const focusFirstInvalidField = (fieldNames) => {
    const fieldOrder = ['name', 'email', 'password', 'company', 'website', 'note', 'agreeTerms'];
    for (const field of fieldOrder) {
      if (fieldNames.includes(field)) {
        if (field === 'agreeTerms') {
          const el = document.getElementById('signup-terms');
          if (el) el.focus();
        } else {
          const el = document.getElementById(`signup-${field}`);
          if (el) el.focus();
        }
        break;
      }
    }
  };

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

  const handleRoleKeyDown = (e, currentIdx) => {
    let nextIdx = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = (currentIdx + 1) % ROLES.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx = (currentIdx - 1 + ROLES.length) % ROLES.length;
    }
    if (nextIdx !== null) {
      const nextRole = ROLES[nextIdx].id;
      setRole(nextRole);
      setErrors({});
      roleRefs.current[nextRole]?.focus();
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
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
      if (!formData.website.trim()) {
        errs.website = 'Company website is required for publishers';
      } else {
        let site = formData.website.trim();
        if (!/^https?:\/\//i.test(site)) {
          site = `https://${site}`;
        }
        try {
          const parsed = new URL(site);
          if (!parsed.hostname || !parsed.hostname.includes('.')) {
            errs.website = 'Please enter a valid website URL';
          }
        } catch {
          errs.website = 'Please enter a valid website URL';
        }
      }
    }

    if (!formData.agreeTerms) {
      errs.agreeTerms = 'You must agree to the Terms of Service';
    }

    setErrors(errs);
    const errorKeys = Object.keys(errs);
    if (errorKeys.length > 0) {
      focusFirstInvalidField(errorKeys);
      return false;
    }
    return true;
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

      const res = await register(payload);
      const registeredUser = res?.user || { role, status: role === 'publisher' ? 'pending' : 'active' };
      navigate(getDestination(registeredUser), { replace: true });
    } catch (err) {
      if (err.status === 409 || err.code === 11000) {
        setErrors((prev) => ({
          ...prev,
          email: (
            <span>
              An account with this email already exists.{' '}
              <Link
                to={`/login${location.search}`}
                state={location.state}
                className="font-bold underline text-[#C2410C] hover:text-[#9A3412]"
              >
                Log in instead?
              </Link>
            </span>
          ),
        }));
        focusFirstInvalidField(['email']);
      } else if (Array.isArray(err.errors) && err.errors.length > 0) {
        const backendFieldErrors = {};
        const fieldKeys = [];
        err.errors.forEach((item) => {
          const fieldKey = item.field === 'termsAccepted' ? 'agreeTerms' : item.field;
          backendFieldErrors[fieldKey] = item.message;
          fieldKeys.push(fieldKey);
        });
        setErrors((prev) => ({ ...prev, ...backendFieldErrors }));
        focusFirstInvalidField(fieldKeys);
      } else {
        setGeneralError(err.message || 'Unable to complete sign-up. Please verify your details.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Back to home navigation */}
      <div className="w-full px-4 sm:px-6 pt-4 pb-1">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded px-2 py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left: Collage (Visual panel / mobile top banner) */}
        <div className="w-full md:w-1/2 p-3 sm:p-4 md:p-6 lg:p-8 shrink-0">
          <AuthCollage />
        </div>

      {/* Right: Signup Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8 lg:px-14 xl:px-20 max-w-xl mx-auto md:max-w-none md:w-1/2 overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-6">
            <h1 className="font-calligraphy text-3xl font-normal text-ink tracking-tight">
              Join {APP_NAME}
            </h1>
            <p className="text-muted mt-2 text-sm font-body">
              Discover original stories, write your own narrative, or scout next-gen talent.
            </p>
          </div>

          {/* Role Chooser */}
          <div className="mb-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
              I want to join as:
            </label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Account type">
              {ROLES.map((r, idx) => {
                const active = role === r.id;
                return (
                  <button
                    ref={(el) => {
                      roleRefs.current[r.id] = el;
                    }}
                    key={r.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    tabIndex={active ? 0 : -1}
                    onKeyDown={(e) => handleRoleKeyDown(e, idx)}
                    onClick={() => {
                      setRole(r.id);
                      setErrors({});
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded border text-center cursor-pointer ${
                      active
                        ? 'border-accent bg-paper text-accent font-bold'
                        : 'border-rule bg-paper text-ink hover:border-muted'
                    }`}
                  >
                    <span className="font-bold text-xs sm:text-sm leading-tight">{r.label}</span>
                    <span className="text-[11px] text-muted mt-0.5">{r.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {generalError && (
            <div
              role="alert"
              className="mb-5 p-3 bg-paper border border-danger rounded text-danger text-xs font-medium flex items-center gap-2"
            >
              <span>{generalError}</span>
            </div>
          )}

          {/* Reserved Google Sign-in Slot */}
          <div className="mb-5">
            <div
              aria-disabled="true"
              className="w-full py-2 px-3 rounded border border-rule bg-paper text-muted font-medium text-xs flex items-center justify-center gap-2 select-none"
            >
              <svg className="w-3.5 h-3.5 opacity-50 shrink-0" viewBox="0 0 24 24">
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
              <span>Google sign-in coming soon</span>
            </div>
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-rule" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                <span className="bg-paper px-2 text-muted font-semibold">Or with email</span>
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

            <div className="space-y-1">
              <Input
                id="signup-password"
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required
                rightAction={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-muted hover:text-ink p-1 rounded cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <p className="text-[11px] text-muted">At least 8 characters</p>

              {/* Password strength meter - advisory */}
              {formData.password && (
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted mb-1">
                    <span>Password strength:</span>
                    <span className="text-ink">{strength.label}</span>
                  </div>
                  <div className="h-1 w-full bg-rule rounded overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 ${
                          strength.score >= step ? 'bg-ink' : 'bg-rule'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Publisher Extra Fields */}
            {role === 'publisher' && (
              <div className="p-4 bg-paper border border-rule rounded space-y-3">
                <div className="flex items-start gap-2">
                  <div>
                    <h2 className="text-xs font-bold text-ink">Publisher Verification Notice</h2>
                    <p className="text-xs text-muted mt-0.5">
                      Publisher accounts require administrator review before catalogue scout access is granted.
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
                  required
                />

                <div>
                  <label
                    htmlFor="signup-note"
                    className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5"
                  >
                    Note for review team (optional)
                  </label>
                  <textarea
                    id="signup-note"
                    name="note"
                    rows={2}
                    placeholder="Tell us about the genres or talent you scout..."
                    value={formData.note}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-paper border border-rule rounded text-xs text-ink focus:outline-none focus:border-ink font-body"
                  />
                  {errors.note && (
                    <p className="text-xs text-danger font-medium mt-1">{errors.note}</p>
                  )}
                </div>
              </div>
            )}

            {/* Terms checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  id="signup-terms"
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  aria-invalid={errors.agreeTerms ? 'true' : undefined}
                  aria-describedby={errors.agreeTerms ? 'signup-terms-error' : undefined}
                  className="mt-1 h-4 w-4 rounded border-rule text-ink focus:ring-0"
                />
                <span className="text-xs text-muted leading-relaxed font-body">
                  I agree to the{' '}
                  <Link
                    to="/terms"
                    target="_blank"
                    className="font-semibold text-ink underline hover:text-accent"
                  >
                    Terms of Service
                  </Link>{' '}
                  and acknowledge the{' '}
                  <Link
                    to="/privacy"
                    target="_blank"
                    className="font-semibold text-ink underline hover:text-accent"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {errors.agreeTerms && (
                <div id="signup-terms-error" role="alert" className="text-xs text-danger mt-1 font-medium">
                  {errors.agreeTerms}
                </div>
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
          <p className="text-center text-xs text-muted mt-6">
            Already have an account?{' '}
            <Link
              to={`/login${location.search}`}
              state={location.state}
              className="font-bold text-accent hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

export default SignupPage;
