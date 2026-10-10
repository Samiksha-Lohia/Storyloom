import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Sun, Moon, Coffee, Type, Check, Sparkles, User, Sliders } from 'lucide-react';
import Button from '../../components/common/Button';

const FONT_SIZES = [
  { label: 'Small (14px)', value: 14 },
  { label: 'Medium (16px)', value: 16 },
  { label: 'Default (18px)', value: 18 },
  { label: 'Large (20px)', value: 20 },
  { label: 'X-Large (24px)', value: 24 },
  { label: 'Huge (28px)', value: 28 },
];

const LINE_HEIGHTS = [
  { label: 'Compact (1.4)', value: 1.4 },
  { label: 'Normal (1.6)', value: 1.6 },
  { label: 'Relaxed (1.8)', value: 1.8 },
  { label: 'Spacious (2.1)', value: 2.1 },
];

const THEMES = [
  {
    id: 'light',
    label: 'Clean Light',
    bg: '#FFFFFF',
    text: '#1E1E1E',
    border: '#E8E6DF',
    icon: Sun,
  },
  {
    id: 'sepia',
    label: 'Warm Sepia',
    bg: '#FBF0D9',
    text: '#382C1E',
    border: '#E5D6B8',
    icon: Coffee,
  },
  {
    id: 'dark',
    label: 'Midnight Dark',
    bg: '#18181A',
    text: '#E6E6E6',
    border: '#2A2A30',
    icon: Moon,
  },
];

export function SettingsPage() {
  const { user, loginUser } = useAuth();

  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [fontFamily, setFontFamily] = useState('serif');
  const [theme, setTheme] = useState('light');

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user?.readerSettings) {
      setFontSize(user.readerSettings.fontSize || 16);
      setLineHeight(user.readerSettings.lineHeight || 1.6);
      setFontFamily(user.readerSettings.fontFamily || 'serif');
      setTheme(user.readerSettings.theme || 'light');
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage({ type: '', text: '' });
    try {
      const payload = {
        fontSize: Number(fontSize),
        lineHeight: Number(lineHeight),
        fontFamily,
        theme,
      };
      const updated = await api.me.updateSettings(payload);

      if (typeof loginUser === 'function' && updated) {
        loginUser({
          ...user,
          readerSettings: payload,
        });
      }

      setStatusMessage({ type: 'success', text: 'Reading preferences saved successfully!' });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save settings. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const activeThemeObj = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 space-y-8 pb-20">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF0E8] text-[#FF500A] text-xs font-bold uppercase tracking-wider mb-2">
          <Sliders className="w-3.5 h-3.5" />
          Preferences
        </div>
        <h1 className="font-heading text-3xl font-extrabold text-stone-900 tracking-tight">
          Account & Reader Settings
        </h1>
        <p className="text-stone-600 text-sm mt-1">
          Customize your reading typography, background palette, and view account details.
        </p>
      </div>

      {statusMessage.text && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {statusMessage.type === 'success' && <Check className="w-4 h-4 text-emerald-600" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#FF500A]/10 text-[#FF500A] flex items-center justify-center font-bold text-lg font-heading">
            {user?.name ? user.name[0].toUpperCase() : <User className="w-6 h-6" />}
          </div>
          <div>
            <div className="font-heading font-bold text-stone-900 text-base flex items-center gap-2">
              <span>{user?.name || 'Reader'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 capitalize font-medium">
                {user?.role || 'reader'}
              </span>
            </div>
            <p className="text-xs text-stone-500">{user?.email}</p>
          </div>
        </div>
        {user?.username && (
          <div className="text-xs text-stone-500 font-mono bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
            @{user.username}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xs">
            <h2 className="font-heading font-bold text-lg text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
              <Type className="w-5 h-5 text-[#FF500A]" />
              Typography & Theme
            </h2>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Theme Palette
              </label>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? 'border-[#FF500A] ring-2 ring-[#FF500A]/20 shadow-xs'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                      style={{ backgroundColor: t.bg, color: t.text }}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Font Family
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFontFamily('serif')}
                  className={`p-3 rounded-2xl border text-xs text-left transition cursor-pointer ${
                    fontFamily === 'serif'
                      ? 'border-[#FF500A] bg-[#FFF0E8]/40 ring-1 ring-[#FF500A] font-bold text-stone-900'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <span className="font-serif text-sm block mb-0.5">Classic Serif</span>
                  <span className="text-[11px] text-stone-500 font-normal">Lora literary typeface</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFontFamily('sans')}
                  className={`p-3 rounded-2xl border text-xs text-left transition cursor-pointer ${
                    fontFamily === 'sans'
                      ? 'border-[#FF500A] bg-[#FFF0E8]/40 ring-1 ring-[#FF500A] font-bold text-stone-900'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <span className="font-sans text-sm block mb-0.5">Modern Sans</span>
                  <span className="text-[11px] text-stone-500 font-normal">Nunito clean typeface</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="settings-font-size" className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Font Size: {fontSize}px
              </label>
              <select
                id="settings-font-size"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full h-10 px-3 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A] transition cursor-pointer"
              >
                {FONT_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="settings-line-height" className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Line Spacing: {lineHeight}
              </label>
              <select
                id="settings-line-height"
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="w-full h-10 px-3 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A] transition cursor-pointer"
              >
                {LINE_HEIGHTS.map((lh) => (
                  <option key={lh.value} value={lh.value}>
                    {lh.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={saving}
                className="w-full shadow-xs"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF500A]" />
                Live Reader Preview
              </span>
              <span className="text-xs text-stone-400 capitalize">{theme} theme</span>
            </div>

            <div
              className="rounded-3xl p-6 sm:p-8 border shadow-xs transition-colors duration-200 min-h-[360px] flex flex-col justify-between"
              style={{
                backgroundColor: activeThemeObj.bg,
                color: activeThemeObj.text,
                borderColor: activeThemeObj.border,
              }}
            >
              <div
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                  fontFamily:
                    fontFamily === 'serif'
                      ? 'Lora, Georgia, Cambria, serif'
                      : 'Nunito, system-ui, sans-serif',
                }}
                className="space-y-4"
              >
                <h3 className="font-bold text-lg opacity-90">Chapter 1: The First Resonance</h3>
                <p>
                  The morning fog clung low against the docks of the canal, smelling faintly of salt
                  water and burnt pine needle oil. Through the mist, the silhouette of the steam launch
                  appeared like a phantom sketched in charcoal.
                </p>
                <p>
                  Arthur adjusted the brass spectacles on his nose, watching the ripples spread across
                  the undisturbed canal basin. Every story has its opening breath.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-current/10 flex items-center justify-between text-xs opacity-60">
                <span>Page 1 of 324</span>
                <span>Storyloom Reader</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default SettingsPage;
