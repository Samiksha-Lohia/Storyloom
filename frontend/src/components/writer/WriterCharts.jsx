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

// Design tokens
const COLOR_PRIMARY = '#FF500A';
const COLOR_SECONDARY = '#64748B';
const COLOR_BORDER = '#E5E5E5';
const COLOR_MUTED = '#8C8C8C';

/**
 * Custom Tooltip for Line Chart
 */
function ReadsTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-stone-900 text-white px-3 py-2 rounded-xl text-xs shadow-md border border-stone-800 space-y-1">
        <p className="font-semibold text-stone-300">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
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

/**
 * Custom Tooltip for Drop-off Chart
 */
function DropOffTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-stone-900 text-white px-3 py-2 rounded-xl text-xs shadow-md border border-stone-800">
        <p className="font-semibold text-[#FF500A]">{data.bucket} of story</p>
        <p className="text-stone-300">
          <span className="font-bold text-white">{data.count}</span> reader{data.count === 1 ? '' : 's'} stopped here
        </p>
        <p className="text-[11px] text-stone-400">
          {data.percentage}% of all readers
        </p>
      </div>
    );
  }
  return null;
}

/**
 * Reads and Views Over Time Line Chart
 */
export function ReadsOverTimeChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-xs text-stone-400">
        No reading activity recorded for this period.
      </div>
    );
  }

  // Format short date for X-axis (e.g., 'Oct 4' or '10/04')
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
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: COLOR_PRIMARY }}
          />
          <Line
            type="monotone"
            dataKey="views"
            name="Page Views"
            stroke={COLOR_SECONDARY}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={{ r: 4, fill: COLOR_SECONDARY }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * "Where Readers Stop" Bar Chart (Drop-off percentage buckets)
 */
export function DropOffBarChart({ data = [] }) {
  const totalReaders = data.reduce((sum, item) => sum + (item.count || 0), 0);

  if (!data || data.length === 0 || totalReaders === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4 text-xs text-stone-400">
        <p className="font-semibold text-stone-500">No reader progress data yet</p>
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
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => {
              // Highlight the 90-100% completion bar in a richer celebratory shade
              const isCompletion = entry.bucket === '90-100%';
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={isCompletion ? '#1F9D55' : COLOR_PRIMARY}
                  opacity={entry.count > 0 ? 0.9 : 0.2}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Rating 1 to 5 Star Histogram
 */
export function RatingHistogram({ distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }) {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-2.5">
      {[5, 4, 3, 2, 1].map((stars) => {
        const count = distribution[stars] || 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={stars} className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 w-12 text-stone-600 font-semibold shrink-0">
              <span>{stars}</span>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </div>
            <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="w-14 text-right text-stone-500 font-mono text-[11px] shrink-0">
              {count} <span className="text-stone-400">({percentage}%)</span>
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
