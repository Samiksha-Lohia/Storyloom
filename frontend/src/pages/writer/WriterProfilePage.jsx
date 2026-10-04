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
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 pb-20">
      {/* Header */}
      <div className="border-b border-[#E5E5E5] pb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-[#FF500A]">
          Writer Studio
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#121212] mt-1">
          Writer Profile & Preferences
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your public author persona and configure your default story presentation template.
        </p>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium flex-1">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm flex-1">{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="space-y-8">
        {/* Author Bio Card */}
        <div className="bg-white rounded-3xl border border-[#E5E5E5] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-[#E5E5E5] pb-4">
            <UserIcon className="w-5 h-5 text-[#FF500A]" />
            <h2 className="font-serif font-bold text-lg text-[#121212]">
              Public Author Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1.5">
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
              <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1.5">
                Username
              </label>
              <Input
                value={user?.username ? `@${user.username}` : ''}
                disabled
                className="bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#121212] uppercase tracking-wider mb-1.5">
              Author Bio & Statement
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell readers about yourself, your inspirations, and what you write..."
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-3 rounded-2xl border border-[#E5E5E5] text-sm text-[#121212] focus:outline-hidden focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A] resize-none"
            />
            <p className="text-[11px] text-slate-400 text-right mt-1">
              {bio.length} / 1000 characters
            </p>
          </div>
        </div>

        {/* Default Template Setting Card */}
        <div className="bg-white rounded-3xl border border-[#E5E5E5] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-[#E5E5E5] pb-4">
            <Layout className="w-5 h-5 text-[#FF500A]" />
            <div>
              <h2 className="font-serif font-bold text-lg text-[#121212]">
                Default Story Presentation Template
              </h2>
              <p className="text-xs text-slate-500">
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
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#FF500A] bg-[#FFF0E8]/20 shadow-md ring-2 ring-[#FF500A]/20'
                      : 'border-[#E5E5E5] bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif font-bold text-base text-[#121212]">{tpl.name}</h3>
                      {isSelected ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FF500A] text-white">
                          Active Default
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {tpl.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{tpl.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5E5E5]/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Best for: {tpl.bestFor}</span>
                    <input
                      type="radio"
                      name="defaultTemplate"
                      checked={isSelected}
                      onChange={() => setDefaultTemplate(tpl.id)}
                      className="w-4 h-4 accent-[#FF500A]"
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
            className="flex items-center gap-2 px-8 shadow-md"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
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
