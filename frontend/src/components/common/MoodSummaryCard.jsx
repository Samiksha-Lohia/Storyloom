import React from 'react';
import { Activity, Flame } from 'lucide-react';

export default function MoodSummaryCard({ moodSummary, className = '' }) {
  if (!moodSummary) {
    return (
      <div className={`p-4 bg-paper rounded border border-rule text-muted text-xs text-center ${className}`}>
        Mood analysis data is currently processing or unavailable.
      </div>
    );
  }

  const { dominantEmotions = [], intensityRange = {}, overallTone = 'Balanced' } = moodSummary;

  return (
    <div className={`bg-paper border border-rule rounded p-4 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-ink" />
          <h4 className="font-bold text-ink text-sm">Emotional Landscape</h4>
        </div>
        <span className="px-2 py-0.5 rounded border border-rule text-xs font-semibold text-muted capitalize">
          Tone: {overallTone}
        </span>
      </div>

      {dominantEmotions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">
            Dominant Emotional Frequencies
          </p>
          <div className="space-y-1.5">
            {dominantEmotions.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink capitalize">{item.emotion}</span>
                  <span className="font-mono text-muted text-[11px]">{item.percentage}%</span>
                </div>
                <div className="w-full h-1 bg-rule rounded overflow-hidden">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${Math.min(100, Math.max(5, item.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted italic">No primary emotions recorded.</p>
      )}

      <div className="pt-2 border-t border-rule flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted">
          <Flame className="w-4 h-4 text-muted" />
          <span>Intensity Range:</span>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-muted">{Math.round((intensityRange.min || 0) * 100)}%</span>
          <span className="text-muted">→</span>
          <span className="font-bold text-ink">{Math.round((intensityRange.average || 0.5) * 100)}% avg</span>
          <span className="text-muted">→</span>
          <span className="text-muted">{Math.round((intensityRange.max || 1) * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
