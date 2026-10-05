import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Save,
  Layout,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { TEMPLATE_OPTIONS } from '../../constants/templates';

export function WriterProfilePage() {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [defaultTemplate, setDefaultTemplate] = useState(user?.defaultTemplate || 'classic');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setDefaultTemplate(user.defaultTemplate || 'classic');
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');
      setSuccessMsg('');

      await api.me.updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        defaultTemplate,
      });

      await refreshUser();
      setSuccessMsg('Profile and default template preferences updated successfully!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update writer profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 pb-20 text-left">
      {/* Header */}
      <div className="border-b border-rule pb-6">
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border border-rule text-muted">
          Writer Studio
        </span>
        <h1 className="text-2xl sm:text-3xl font-normal text-ink mt-1">
          Writer Profile & Preferences
        </h1>
        <p className="text-xs text-muted mt-1">
          Manage your public author persona and configure your default story presentation template.
        </p>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="bg-paper border border-success text-success rounded p-4 flex items-center gap-3 text-xs">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          <p className="font-bold flex-1">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-paper border border-danger text-danger rounded p-4 flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-danger shrink-0" />
          <p className="font-bold flex-1">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-8">
        {/* Author Bio Card */}
        <div className="bg-paper rounded border border-rule p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-rule pb-4">
            <UserIcon className="w-4 h-4 text-accent" />
            <h2 className="font-bold text-base text-ink">
              Public Author Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                Author Display Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your author pseudonym or full name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
                Username
              </label>
              <Input
                value={user?.username ? `@${user.username}` : ''}
                disabled
                className="bg-paper text-muted cursor-not-allowed border border-rule"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">
              Author Bio & Statement
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell readers about yourself, your inspirations, and what you write..."
              rows={4}
              maxLength={1000}
              className="w-full px-3 py-2 rounded border border-rule text-xs text-ink bg-paper focus:outline-hidden focus:ring-1 focus:ring-ink resize-none"
            />
            <p className="text-[11px] text-muted text-right mt-1">
              {bio.length} / 1000 characters
            </p>
          </div>
        </div>

        {/* Default Template Setting Card */}
        <div className="bg-paper rounded border border-rule p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-rule pb-4">
            <Layout className="w-4 h-4 text-accent" />
            <div>
              <h2 className="font-bold text-base text-ink">
                Default Story Presentation Template
              </h2>
              <p className="text-xs text-muted">
                New stories published in your studio will automatically default to this template layout.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TEMPLATE_OPTIONS.map((tpl) => {
              const isSelected = defaultTemplate === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setDefaultTemplate(tpl.id)}
                  className={`p-5 rounded border cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-ink bg-paper ring-1 ring-ink'
                      : 'border-rule bg-paper hover:border-ink'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-ink">{tpl.name}</h3>
                      {isSelected ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-ink text-paper">
                          Active Default
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-rule text-muted bg-paper">
                          {tpl.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{tpl.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-rule flex items-center justify-between">
                    <span className="text-[11px] text-muted">Best for: {tpl.bestFor}</span>
                    <input
                      type="radio"
                      name="defaultTemplate"
                      checked={isSelected}
                      onChange={() => setDefaultTemplate(tpl.id)}
                      className="w-4 h-4 accent-ink cursor-pointer"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Actions */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            className="flex items-center gap-2 px-8"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving Preferences...' : 'Save Profile & Default Template'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default WriterProfilePage;
