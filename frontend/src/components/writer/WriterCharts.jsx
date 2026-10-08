import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { Star } from 'lucide-react';

const COLOR_PRIMARY = '#9B2D20';
const COLOR_SECONDARY = '#1C1917';
const COLOR_BORDER = '#D9D2C3';
const COLOR_MUTED = '#6B6358';

function ReadsTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-paper text-ink px-3 py-2 rounded text-xs border border-rule space-y-1">
        <p className="font-bold text-ink">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded"
              style={{ backgroundColor: entry.color }}
            />
            <span className="capitalize">{entry.name}:</span>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function DropOffTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-paper text-ink px-3 py-2 rounded text-xs border border-rule">
        <p className="font-bold text-accent">{data.bucket} of story</p>
        <p className="text-ink">
          <span className="font-bold text-ink">{data.count}</span> reader{data.count === 1 ? '' : 's'} stopped here
        </p>
        <p className="text-[11px] text-muted">
          {data.percentage}% of all readers
        </p>
      </div>
    );
  }
  return null;
}

export function ReadsOverTimeChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-muted">
        No reading activity recorded for this period.
      </div>
    );
  }

  const formattedData = data.map((d) => {
    let shortLabel = d.date;
    try {
      const parts = d.date.split('-');
      if (parts.length === 3) {
        shortLabel = `${parts[1]}/${parts[2]}`;
      }
    } catch (_) {}
    return {
      ...d,
      shortLabel,
    };
  });

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLOR_BORDER} />
          <XAxis
            dataKey="shortLabel"
            stroke={COLOR_MUTED}
            fontSize={11}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke={COLOR_MUTED}
            fontSize={11}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<ReadsTooltip />} />
          <Line
            type="monotone"
            dataKey="reads"
            name="Reads"
            stroke={COLOR_PRIMARY}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="views"
            name="Page Views"
            stroke={COLOR_SECONDARY}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DropOffBarChart({ data = [] }) {
  const totalReaders = data.reduce((sum, item) => sum + (item.count || 0), 0);

  if (!data || data.length === 0 || totalReaders === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4 text-xs text-muted">
        <p className="font-bold text-ink">No reader progress data yet</p>
        <p className="mt-1">As readers flip through pages, drop-off milestones will appear here.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLOR_BORDER} />
          <XAxis
            dataKey="bucket"
            stroke={COLOR_MUTED}
            fontSize={10}
            tickLine={false}
          />
          <YAxis
            stroke={COLOR_MUTED}
            fontSize={11}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<DropOffTooltip />} />
          <Bar dataKey="count" isAnimationActive={false}>
            {data.map((entry, index) => {
              const isCompletion = entry.bucket === '90-100%';
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={isCompletion ? '#2F6B3A' : COLOR_PRIMARY}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RatingHistogram({ distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }) {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-2.5">
      {[5, 4, 3, 2, 1].map((stars) => {
        const count = distribution[stars] || 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={stars} className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 w-12 text-ink font-bold shrink-0">
              <span>{stars}</span>
              <Star className="w-4 h-4 fill-ink text-ink" />
            </div>
            <div className="flex-1 h-2 bg-paper border border-rule rounded overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="w-14 text-right text-muted font-mono text-[11px] shrink-0">
              {count} <span>({percentage}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default {
  ReadsOverTimeChart,
  DropOffBarChart,
  RatingHistogram,
};

