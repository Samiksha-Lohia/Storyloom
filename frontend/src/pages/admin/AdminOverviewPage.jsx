import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Users,
  BookOpen,
  Eye,
  Star,
  ShieldAlert,
  Building,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.admin.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError(err.message || 'Failed to fetch platform metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalUsers = stats?.usersByRole
    ? (stats.usersByRole.reader || 0) +
      (stats.usersByRole.writer || 0) +
      (stats.usersByRole.publisher || 0) +
      (stats.usersByRole.admin || 0)
    : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-[#FF500A] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Platform Command Center
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mt-2">
            System Telemetry & Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time platform traffic, community engagement, acquisitions, and compliance queues.
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </button>
      </div>

      {/* Quick Action Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pending Publishers Banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Publisher Approvals
                </span>
                {stats?.pendingPublishersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {stats.pendingPublishersCount} pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {stats?.pendingPublishersCount > 0
                  ? `${stats.pendingPublishersCount} verified publisher applicant(s) waiting for credentials review.`
                  : 'All publisher applications reviewed and cleared.'}
              </p>
            </div>
          </div>
          <Link
            to="/a/publishers"
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
          >
            Review Queue
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Open Reports Banner */}
        <div className="bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200/80 rounded-2xl p-5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                  Moderation Reports
                </span>
                {stats?.openReportsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                    {stats.openReportsCount} open
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {stats?.openReportsCount > 0
                  ? `${stats.openReportsCount} safety/copyright report(s) need moderation audit.`
                  : 'Zero open moderation reports. Platform content is clean.'}
              </p>
            </div>
          </div>
          <Link
            to="/a/reports"
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
          >
            Open Queue
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Community
            </span>
            <Users className="w-4 h-4 text-[#FF500A]" />
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-slate-900">
              {loading ? '...' : totalUsers}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
              <span className="text-emerald-700 font-semibold">
                +{stats?.signups?.last7d || 0}
              </span>
              <span>last 7 days</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Writers: {stats?.usersByRole?.writer || 0}</span>
            <span>Publishers: {stats?.usersByRole?.publisher || 0}</span>
          </div>
        </div>

        {/* Active Readers (DAU / WAU) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Users
            </span>
            <Eye className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-slate-900">
              {loading ? '...' : stats?.activeUsers?.dau || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
              <span className="text-blue-700 font-semibold">DAU</span>
              <span>•</span>
              <span className="text-slate-700 font-semibold">
                {stats?.activeUsers?.wau || 0} WAU
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            Deduped unique sessions
          </div>
        </div>

        {/* Published Manuscripts */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Published Books
            </span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-slate-900">
              {loading ? '...' : stats?.books?.publishedCount || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Active in public catalogue
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Total Reads:</span>
            <strong className="text-slate-800">
              {stats?.books?.totalReads?.toLocaleString() || 0}
            </strong>
          </div>
        </div>

        {/* Reader Reviews */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Reviews
            </span>
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-slate-900">
              {loading ? '...' : stats?.books?.totalReviews || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Verified community ratings
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            Across all genres
          </div>
        </div>
      </div>

      {/* Role Breakdown & Signups Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Role Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <h3 className="font-serif font-bold text-slate-900 text-base">
            Community Role Breakdown
          </h3>
          <p className="text-xs text-slate-500">
            Distribution of registered accounts across roles.
          </p>

          <div className="space-y-3 pt-2">
            {[
              {
                role: 'Readers',
                count: stats?.usersByRole?.reader || 0,
                color: 'bg-blue-500',
              },
              {
                role: 'Writers',
                count: stats?.usersByRole?.writer || 0,
                color: 'bg-[#FF500A]',
              },
              {
                role: 'Publishers',
                count: stats?.usersByRole?.publisher || 0,
                color: 'bg-emerald-500',
              },
              {
                role: 'Admins',
                count: stats?.usersByRole?.admin || 0,
                color: 'bg-purple-500',
              },
            ].map((item) => {
              const pct = totalUsers > 0 ? ((item.count / totalUsers) * 100).toFixed(1) : 0;
              return (
                <div key={item.role} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.role}</span>
                    <span className="text-slate-500">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Link
              to="/a/users"
              className="text-xs font-bold text-[#FF500A] hover:underline flex items-center gap-1"
            >
              Manage Users Directory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Top Manuscripts */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-slate-900 text-base">
                Top Performing Manuscripts
              </h3>
              <p className="text-xs text-slate-500">
                Highest traction titles by readers and engagement.
              </p>
            </div>
            <Link
              to="/a/books"
              className="text-xs font-bold text-[#FF500A] hover:underline flex items-center gap-1"
            >
              All Books <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            {!stats?.topBooks || stats.topBooks.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No published books currently listed.
              </p>
            ) : (
              stats.topBooks.map((book, idx) => (
                <div
                  key={book.id || book._id}
                  className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-bold text-xs text-slate-400 w-4">
                      #{idx + 1}
                    </span>
                    <div className="w-9 h-12 bg-slate-200 rounded-md overflow-hidden shrink-0 border border-slate-200">
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <BookOpen className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-serif font-bold text-xs text-slate-900 truncate">
                        {book.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        by {book.writerId?.name || 'Writer'} • {book.genre}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0 text-slate-600">
                    <span>
                      <strong className="text-slate-900">
                        {book.stats?.reads?.toLocaleString() || 0}
                      </strong>{' '}
                      reads
                    </span>
                    <span className="flex items-center gap-1 text-amber-600 font-semibold">
                      ★ {Number(book.stats?.ratingAvg || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
