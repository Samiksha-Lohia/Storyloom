import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Building,
  ShieldAlert,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  Eye,
  Star,
} from 'lucide-react';
import { api } from '../../services/api';

export function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getPlatformStats();
      setStats(res?.data || res);
    } catch (err) {
      console.error('Failed to load platform stats:', err);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-rule pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded border border-rule text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Platform Command Center
            </span>
          </div>
          <h1 className="font-calligraphy text-3xl font-normal text-ink mt-2">
            System Telemetry &amp; Overview
          </h1>
          <p className="text-xs text-muted mt-1">
            Real-time platform traffic, community engagement, acquisitions, and compliance queues.
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-paper border border-rule hover:bg-rule/10 text-ink rounded text-xs font-bold cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-ink" />
          {loading ? 'Loading…' : 'Refresh Metrics'}
        </button>
      </div>

      {/* Quick Action Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pending Publishers Banner */}
        <div className="bg-paper border border-rule rounded p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded border border-rule flex items-center justify-center text-ink shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink uppercase tracking-wider">
                  Publisher Approvals
                </span>
                {stats?.pendingPublishersCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded border border-accent text-accent text-[10px] font-bold">
                    {stats.pendingPublishersCount} pending
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {stats?.pendingPublishersCount > 0
                  ? `${stats.pendingPublishersCount} verified publisher applicant(s) waiting for credentials review.`
                  : 'All publisher applications reviewed and cleared.'}
              </p>
            </div>
          </div>
          <Link
            to="/a/publishers"
            className="px-3 py-1.5 bg-ink text-paper hover:bg-accent rounded text-xs font-bold flex items-center gap-1.5 shrink-0"
          >
            Review Queue
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Open Reports Banner */}
        <div className="bg-paper border border-rule rounded p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded border border-rule flex items-center justify-center text-ink shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink uppercase tracking-wider">
                  Moderation Reports
                </span>
                {stats?.openReportsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded border border-danger text-danger text-[10px] font-bold">
                    {stats.openReportsCount} open
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {stats?.openReportsCount > 0
                  ? `${stats.openReportsCount} safety/copyright report(s) need moderation audit.`
                  : 'Zero open moderation reports. Platform content is clean.'}
              </p>
            </div>
          </div>
          <Link
            to="/a/reports"
            className="px-3 py-1.5 bg-ink text-paper hover:bg-accent rounded text-xs font-bold flex items-center gap-1.5 shrink-0"
          >
            Open Queue
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-paper border border-rule rounded p-4 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Total Community
            </span>
            <Users className="w-4 h-4 text-ink" />
          </div>
          <div>
            <div className="text-2xl font-bold text-ink">
              {loading ? '...' : totalUsers}
            </div>
            <div className="text-[10px] text-muted mt-1 flex items-center gap-2">
              <span className="text-success font-semibold">
                +{stats?.signups?.last7d || 0}
              </span>
              <span>last 7 days</span>
            </div>
          </div>
          <div className="pt-2 border-t border-rule flex items-center justify-between text-[10px] text-muted">
            <span>Writers: {stats?.usersByRole?.writer || 0}</span>
            <span>Publishers: {stats?.usersByRole?.publisher || 0}</span>
          </div>
        </div>

        {/* Active Readers (DAU / WAU) */}
        <div className="bg-paper border border-rule rounded p-4 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Active Users
            </span>
            <Eye className="w-4 h-4 text-ink" />
          </div>
          <div>
            <div className="text-2xl font-bold text-ink">
              {loading ? '...' : stats?.activeUsers?.dau || 0}
            </div>
            <div className="text-[10px] text-muted mt-1 flex items-center gap-2">
              <span className="font-semibold text-ink">DAU</span>
              <span>&bull;</span>
              <span className="font-semibold text-muted">
                {stats?.activeUsers?.wau || 0} WAU
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-rule text-[10px] text-muted">
            Deduped unique sessions
          </div>
        </div>

        {/* Published Manuscripts */}
        <div className="bg-paper border border-rule rounded p-4 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Published Books
            </span>
            <BookOpen className="w-4 h-4 text-ink" />
          </div>
          <div>
            <div className="text-2xl font-bold text-ink">
              {loading ? '...' : stats?.books?.publishedCount || 0}
            </div>
            <div className="text-[10px] text-muted mt-1">
              Active in public catalogue
            </div>
          </div>
          <div className="pt-2 border-t border-rule text-[10px] text-muted flex justify-between">
            <span>Total Reads:</span>
            <strong className="text-ink">
              {stats?.books?.totalReads?.toLocaleString() || 0}
            </strong>
          </div>
        </div>

        {/* Reader Reviews */}
        <div className="bg-paper border border-rule rounded p-4 space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Total Reviews
            </span>
            <Star className="w-4 h-4 text-ink" />
          </div>
          <div>
            <div className="text-2xl font-bold text-ink">
              {loading ? '...' : stats?.books?.totalReviews || 0}
            </div>
            <div className="text-[10px] text-muted mt-1">
              Verified community ratings
            </div>
          </div>
          <div className="pt-2 border-t border-rule text-[10px] text-muted">
            Across all genres
          </div>
        </div>
      </div>

      {/* Role Breakdown & Signups Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Role Distribution */}
        <div className="bg-paper border border-rule rounded p-5 space-y-3">
          <h3 className="font-bold text-ink text-sm">
            Community Role Breakdown
          </h3>
          <p className="text-xs text-muted">
            Distribution of registered accounts across roles.
          </p>

          <div className="space-y-3 pt-2">
            {[
              {
                role: 'Readers',
                count: stats?.usersByRole?.reader || 0,
                color: 'bg-ink',
              },
              {
                role: 'Writers',
                count: stats?.usersByRole?.writer || 0,
                color: 'bg-accent',
              },
              {
                role: 'Publishers',
                count: stats?.usersByRole?.publisher || 0,
                color: 'bg-muted',
              },
              {
                role: 'Admins',
                count: stats?.usersByRole?.admin || 0,
                color: 'bg-ink',
              },
            ].map((item) => {
              const pct = totalUsers > 0 ? ((item.count / totalUsers) * 100).toFixed(1) : 0;
              return (
                <div key={item.role} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-ink">{item.role}</span>
                    <span className="text-muted">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-rule/30 rounded overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-rule flex justify-end">
            <Link
              to="/a/users"
              className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
            >
              Manage Users Directory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Top Manuscripts */}
        <div className="lg:col-span-2 bg-paper border border-rule rounded p-5 space-y-3">
          <div>
            <h3 className="font-bold text-ink text-sm">
              Top Performing Manuscripts
            </h3>
            <p className="text-xs text-muted">
              Highest traction titles by readers and engagement.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            {!stats?.topBooks || stats.topBooks.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">
                No published books currently listed.
              </p>
            ) : (
              stats.topBooks.map((book, idx) => (
                <div
                  key={book.id || book._id}
                  className="flex items-center justify-between p-2.5 border border-rule rounded hover:bg-rule/10"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-bold text-xs text-muted w-4">
                      #{idx + 1}
                    </span>
                    <div className="w-8 h-12 bg-paper rounded overflow-hidden shrink-0 border border-rule aspect-2/3">
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-ink truncate">
                        {book.title}
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        by {book.writerId?.name || 'Writer'} &bull; {book.genre}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs shrink-0 text-muted">
                    <span>
                      <strong className="text-ink">
                        {book.stats?.reads?.toLocaleString() || 0}
                      </strong>{' '}
                      reads
                    </span>
                    <span className="flex items-center gap-1 text-ink font-semibold">
                      ★ {Number(book.stats?.ratingAvg || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Manuscript Lifecycle Status Distribution */}
      <div className="bg-paper border border-rule rounded p-5 space-y-4">
        <div>
          <h3 className="font-bold text-ink text-sm">
            Manuscript Lifecycle Distribution
          </h3>
          <p className="text-xs text-muted">
            Aggregated database status counts across all submitted stories.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: 'Draft', count: stats?.books?.statusDistribution?.draft || 0, color: 'text-muted' },
            { label: 'Processing', count: stats?.books?.statusDistribution?.processing || 0, color: 'text-accent' },
            { label: 'Published', count: stats?.books?.statusDistribution?.published || 0, color: 'text-success' },
            { label: 'Unpublished', count: stats?.books?.statusDistribution?.unpublished || 0, color: 'text-muted' },
            { label: 'Removed', count: stats?.books?.statusDistribution?.removed || 0, color: 'text-danger' },
          ].map((item) => (
            <div key={item.label} className="p-3 bg-paper border border-rule rounded text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted block mb-1">
                {item.label}
              </span>
              <span className={`text-xl font-bold ${item.color}`}>
                {loading ? '...' : item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminOverviewPage;
