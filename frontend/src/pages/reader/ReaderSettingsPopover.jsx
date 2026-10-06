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
    text: '#1C1917',
    border: '#D9D2C3',
    icon: Sun,
  },
  {
    id: 'sepia',
    label: 'Sepia',
    bg: '#F4ECD8',
    text: '#382C1E',
    border: '#D9D2C3',
    icon: Coffee,
  },
  {
    id: 'dark',
    label: 'Dark',
    bg: '#18181A',
    text: '#E6E6E6',
    border: '#333333',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
      <div
        className="w-full max-w-sm rounded p-6 border bg-paper text-ink border-rule"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rule mb-4">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-ink" />
            <h3 className="font-bold text-sm text-ink">Reader Preferences</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-rule/40 text-ink cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Theme Selector */}
          <div>
            <label className="block uppercase tracking-wider text-[11px] text-muted mb-1.5 font-bold">
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
                    className={`flex flex-col items-center justify-center py-2 px-2 rounded border cursor-pointer ${
                      isSelected
                        ? 'border-ink font-bold'
                        : 'border-rule hover:border-muted text-muted'
                    }`}
                    style={{ backgroundColor: t.bg, color: t.text }}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-[11px]">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block uppercase tracking-wider text-[11px] text-muted mb-1.5 font-bold">
              Typeface
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ fontFamily: 'serif' })}
                className={`py-2 px-3 rounded border text-center cursor-pointer text-xs ${
                  currentFontFamily === 'serif'
                    ? 'border-accent bg-paper text-accent font-bold'
                    : 'border-rule hover:border-muted text-ink'
                }`}
              >
                Serif (Lora)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ fontFamily: 'sans' })}
                className={`py-2 px-3 rounded border text-center cursor-pointer text-xs ${
                  currentFontFamily === 'sans'
                    ? 'border-accent bg-paper text-accent font-bold'
                    : 'border-rule hover:border-muted text-ink'
                }`}
              >
                Sans (Nunito)
              </button>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <div className="flex items-center justify-between uppercase tracking-wider text-[11px] text-muted mb-1.5 font-bold">
              <span>Text Size</span>
              <span>{currentFontSize}px</span>
            </div>
            <div className="flex items-center justify-between gap-1 border border-rule rounded p-1">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onUpdateSettings({ fontSize: s.value })}
                  className={`flex-1 py-1 text-xs rounded cursor-pointer ${
                    currentFontSize === s.value
                      ? 'bg-accent text-paper font-bold'
                      : 'hover:bg-rule/40 text-ink'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="block uppercase tracking-wider text-[11px] text-muted mb-1.5 font-bold">
              Line Spacing
            </label>
            <div className="grid grid-cols-4 gap-1">
              {LINE_HEIGHTS.map((lh) => (
                <button
                  key={lh.value}
                  type="button"
                  onClick={() => onUpdateSettings({ lineHeight: lh.value })}
                  className={`py-1.5 px-1 text-center rounded border text-[11px] cursor-pointer ${
                    Math.abs(currentLineHeight - lh.value) < 0.05
                      ? 'border-accent text-accent font-bold'
                      : 'border-rule hover:border-muted text-ink'
                  }`}
                >
                  {lh.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-5 pt-3 border-t border-rule text-[11px] text-muted text-center">
          Preferences sync automatically across devices.
        </div>
      </div>
    </div>
  );
}
