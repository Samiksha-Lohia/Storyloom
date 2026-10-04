import React from 'react';
import { Type, Sun, Moon, Coffee, X } from 'lucide-react';

const FONT_SIZES = [
  { label: '14', value: 14 },
  { label: '16', value: 16 },
  { label: '18', value: 18, isDefault: true },
  { label: '20', value: 20 },
  { label: '24', value: 24 },
  { label: '28', value: 28 },
];

const LINE_HEIGHTS = [
  { label: 'Compact', value: 1.4 },
  { label: 'Normal', value: 1.6, isDefault: true },
  { label: 'Relaxed', value: 1.8 },
  { label: 'Spacious', value: 2.1 },
];

const THEMES = [
  {
    id: 'light',
    label: 'Light',
    bg: '#FAF9F5',
    text: '#1E1E1E',
    border: '#E8E6DF',
    icon: Sun,
  },
  {
    id: 'sepia',
    label: 'Sepia',
    bg: '#F4ECD8',
    text: '#382C1E',
    border: '#E2D5B5',
    icon: Coffee,
  },
  {
    id: 'dark',
    label: 'Dark',
    bg: '#18181A',
    text: '#E6E6E6',
    border: '#2A2A30',
    icon: Moon,
  },
];

export default function ReaderSettingsPopover({
  settings,
  onUpdateSettings,
  onClose,
}) {
  const currentFontSize = settings?.fontSize || 18;
  const currentLineHeight = settings?.lineHeight || 1.6;
  const currentFontFamily = settings?.fontFamily || 'serif';
  const currentTheme = settings?.theme || 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
      <div
        className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border transition-all animate-in fade-in zoom-in-95 duration-150"
        style={{
          backgroundColor: currentTheme === 'dark' ? '#202024' : currentTheme === 'sepia' ? '#F6EEDB' : '#FFFFFF',
          color: currentTheme === 'dark' ? '#E6E6E6' : currentTheme === 'sepia' ? '#382C1E' : '#121212',
          borderColor: currentTheme === 'dark' ? '#33333C' : currentTheme === 'sepia' ? '#DECFA7' : '#E5E5E5',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-200/40 mb-5">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-[#FF500A]" />
            <h3 className="font-heading font-bold text-base">Reader Preferences</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-stone-200/50 transition opacity-70 hover:opacity-100"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 text-xs font-semibold">
          {/* Theme Selector */}
          <div>
            <label className="block uppercase tracking-wider text-[11px] opacity-70 mb-2">
              Color Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((t) => {
                const isSelected = currentTheme === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onUpdateSettings({ theme: t.id })}
                    className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#FF500A] shadow-xs'
                        : 'border-transparent hover:border-stone-300/60'
                    }`}
                    style={{ backgroundColor: t.bg, color: t.text }}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-[11px] font-bold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block uppercase tracking-wider text-[11px] opacity-70 mb-2">
              Typeface
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ fontFamily: 'serif' })}
                className={`py-2 px-3 rounded-xl border text-center transition cursor-pointer font-serif text-sm ${
                  currentFontFamily === 'serif'
                    ? 'border-[#FF500A] bg-[#FF500A]/10 text-[#FF500A] font-bold'
                    : 'border-stone-200/60 hover:border-stone-300'
                }`}
              >
                Serif (Lora)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ fontFamily: 'sans' })}
                className={`py-2 px-3 rounded-xl border text-center transition cursor-pointer font-sans text-sm ${
                  currentFontFamily === 'sans'
                    ? 'border-[#FF500A] bg-[#FF500A]/10 text-[#FF500A] font-bold'
                    : 'border-stone-200/60 hover:border-stone-300'
                }`}
              >
                Sans (Nunito)
              </button>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <div className="flex items-center justify-between uppercase tracking-wider text-[11px] opacity-70 mb-2">
              <span>Text Size</span>
              <span>{currentFontSize}px</span>
            </div>
            <div className="flex items-center justify-between gap-1.5 p-1 rounded-2xl bg-stone-200/30">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onUpdateSettings({ fontSize: s.value })}
                  className={`flex-1 py-1.5 text-xs rounded-xl transition cursor-pointer ${
                    currentFontSize === s.value
                      ? 'bg-[#FF500A] text-white font-bold shadow-xs'
                      : 'hover:bg-stone-300/40 opacity-80'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="block uppercase tracking-wider text-[11px] opacity-70 mb-2">
              Line Spacing
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {LINE_HEIGHTS.map((lh) => (
                <button
                  key={lh.value}
                  type="button"
                  onClick={() => onUpdateSettings({ lineHeight: lh.value })}
                  className={`py-1.5 px-1 text-center rounded-xl border text-[11px] transition cursor-pointer ${
                    Math.abs(currentLineHeight - lh.value) < 0.05
                      ? 'border-[#FF500A] bg-[#FF500A]/10 text-[#FF500A] font-bold'
                      : 'border-stone-200/60 hover:border-stone-300'
                  }`}
                >
                  {lh.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-stone-200/40 text-[11px] opacity-60 text-center">
          Preferences sync automatically across devices.
        </div>
      </div>
    </div>
  );
}
