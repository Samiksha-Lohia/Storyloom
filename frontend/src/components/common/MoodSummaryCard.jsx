import React from 'react';
import { Heart, Activity, Flame, Sparkles } from 'lucide-react';

const EMOTION_COLORS = {
  joy: 'bg-amber-100 text-amber-800 border-amber-200 fill-amber-500',
  sadness: 'bg-blue-100 text-blue-800 border-blue-200 fill-blue-500',
  fear: 'bg-purple-100 text-purple-800 border-purple-200 fill-purple-500',
  anger: 'bg-rose-100 text-rose-800 border-rose-200 fill-rose-500',
  suspense: 'bg-indigo-100 text-indigo-800 border-indigo-200 fill-indigo-500',
  love: 'bg-pink-100 text-pink-800 border-pink-200 fill-pink-500',
  neutral: 'bg-slate-100 text-slate-800 border-slate-200 fill-slate-500',
  anticipation: 'bg-emerald-100 text-emerald-800 border-emerald-200 fill-emerald-500',
};

const EMOTION_BAR_COLORS = {
  joy: 'bg-amber-500',
  sadness: 'bg-blue-500',
  fear: 'bg-purple-500',
  anger: 'bg-rose-500',
  suspense: 'bg-indigo-500',
  love: 'bg-pink-500',
  neutral: 'bg-slate-400',
  anticipation: 'bg-emerald-500',
};

export default function MoodSummaryCard({ moodSummary, className = '' }) {
  if (!moodSummary) {
    return (
      <div className={`p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-xs text-center ${className}`}>
        Mood analysis data is currently processing or unavailable.
      </div>
    );
  }

  const { dominantEmotions = [], intensityRange = {}, overallTone = 'Balanced' } = moodSummary;

  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4 ${className}`}>
      {/* Header with tone badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-600" />
          <h4 className="font-serif font-bold text-slate-900 text-sm">Emotional Landscape</h4>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 capitalize">
          Tone: {overallTone}
        </span>
      </div>

      {/* Dominant Emotions Progress */}
      {dominantEmotions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Dominant Emotional Frequencies
          </p>
          <div className="space-y-1.5">
            {dominantEmotions.map((item, idx) => {
              const emoKey = (item.emotion || '').toLowerCase();
              const barColor = EMOTION_BAR_COLORS[emoKey] || 'bg-slate-600';
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 capitalize">{item.emotion}</span>
                    <span className="font-mono text-slate-500 text-[11px]">{item.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(100, Math.max(5, item.percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">No primary emotions recorded.</p>
      )}

      {/* Intensity Range Meter */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Intensity Range:</span>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-slate-500">{Math.round((intensityRange.min || 0) * 100)}%</span>
          <span className="text-slate-300">→</span>
          <span className="font-bold text-slate-800">{Math.round((intensityRange.average || 0.5) * 100)}% avg</span>
          <span className="text-slate-300">→</span>
          <span className="text-slate-500">{Math.round((intensityRange.max || 1) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
