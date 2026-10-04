import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import {
  Users,
  Search,
  Shield,
  Ban,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Filter,
  AlertCircle,
  X,
} from 'lucide-react';

const ROLES = ['all', 'reader', 'writer', 'publisher', 'admin'];
const STATUSES = ['all', 'active', 'pending', 'suspended', 'banned'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Modal State for Action
  const [activeModal, setActiveModal] = useState(null); // { type: 'role'|'suspend'|'ban'|'restore', user }
  const [newRole, setNewRole] = useState('reader');
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.admin.getUsers({
        page,
        limit: 20,
        search: search.trim() || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setUsers(res.data || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleExecuteAction = async (e) => {
    e.preventDefault();
    if (!activeModal?.user) return;
    setSubmitting(true);
    try {
      const payload = { note: actionNote };
      if (activeModal.type === 'role') {
        payload.role = newRole;
      } else if (activeModal.type === 'suspend') {
        payload.status = 'suspended';
        payload.suspensionDays = Number(suspensionDays);
      } else if (activeModal.type === 'ban') {
        payload.status = 'banned';
      } else if (activeModal.type === 'restore') {
        payload.status = 'active';
      }

      await api.admin.updateUser(activeModal.user.id || activeModal.user._id, payload);
      setActiveModal(null);
      setActionNote('');
      await fetchUsers();
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
          Active
        </span>
      );
    }
    if (status === 'suspended') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
          Suspended
        </span>
      );
    }
    if (status === 'banned') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-800 border border-rose-200">
          Banned
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
        {status}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const map = {
      admin: 'bg-purple-100 text-purple-800',
      writer: 'bg-orange-100 text-[#FF500A]',
      publisher: 'bg-blue-100 text-blue-800',
      reader: 'bg-slate-100 text-slate-700',
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
          map[role] || map.reader
        }`}
      >
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-left">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              User Oversight
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 mt-2">
            Community & User Accounts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, inspect roles, ban or suspend accounts, and view user publication records.
          </p>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Total accounts: <strong>{pagination.total}</strong>
        </span>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search users"
            placeholder="Search by name, email, or username..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Role selector */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter users by role"
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                Role: {r.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter users by status"
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                Status: {s.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Books</th>
                <th className="p-4">Reports</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="p-4">
                      <div className="h-6 bg-slate-100 rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    No users match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSuspended = u.status === 'suspended';
                  const isBanned = u.status === 'banned';

                  return (
                    <tr key={u.id || u._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Email */}
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {u.email} • @{u.username}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-4">{getRoleBadge(u.role)}</td>

                      {/* Status */}
                      <td className="p-4">
                        <div className="space-y-0.5">
                          {getStatusBadge(u.status)}
                          {isSuspended && u.suspensionEndsAt && (
                            <div className="text-[10px] text-amber-700 font-mono">
                              Until {new Date(u.suspensionEndsAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Books count */}
                      <td className="p-4 font-mono font-semibold text-slate-700">
                        {u.booksCount || 0}
                      </td>

                      {/* Reports count */}
                      <td className="p-4">
                        {u.reportsCount > 0 ? (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-md text-[10px]">
                            {u.reportsCount} report(s)
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>

                      {/* Joined date */}
                      <td className="p-4 text-slate-500 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Change Role */}
                          <button
                            onClick={() => {
                              setActiveModal({ type: 'role', user: u });
                              setNewRole(u.role);
                              setActionNote('');
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Role
                          </button>

                          {/* Suspend or Ban */}
                          {!isSuspended && !isBanned && (
                            <>
                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'suspend', user: u });
                                  setSuspensionDays(7);
                                  setActionNote('');
                                }}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'ban', user: u });
                                  setActionNote('');
                                }}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                Ban
                              </button>
                            </>
                          )}

                          {/* Restore */}
                          {(isSuspended || isBanned) && (
                            <button
                              onClick={() => {
                                setActiveModal({ type: 'restore', user: u });
                                setActionNote('');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex justify-between items-center text-xs">
            <span className="text-slate-500">
              Page {page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-semibold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Dialog Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-action-modal-title"
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200"
          >
            <div className="flex items-center justify-between">
              <h3 id="user-action-modal-title" className="font-serif font-bold text-lg text-slate-900 capitalize">
                {activeModal.type === 'role' && 'Change Account Role'}
                {activeModal.type === 'suspend' && 'Suspend User Account'}
                {activeModal.type === 'ban' && 'Permanent Ban User'}
                {activeModal.type === 'restore' && 'Restore User Account'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                aria-label="Close dialog"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              User: <strong className="text-slate-900">{activeModal.user?.name}</strong> (
              {activeModal.user?.email})
            </p>

            <form onSubmit={handleExecuteAction} className="space-y-4">
              {activeModal.type === 'role' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select New Role:
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                  >
                    <option value="reader">Reader</option>
                    <option value="writer">Writer</option>
                    <option value="publisher">Publisher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              )}

              {activeModal.type === 'suspend' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Suspension Duration:
                    </label>
                    <select
                      value={suspensionDays}
                      onChange={(e) => setSuspensionDays(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800"
                    >
                      <option value={3}>3 Days</option>
                      <option value={7}>7 Days (1 Week)</option>
                      <option value={14}>14 Days (2 Weeks)</option>
                      <option value={30}>30 Days (1 Month)</option>
                      <option value={90}>90 Days (3 Months)</option>
                    </select>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                    Warning: Suspending this user will immediately hide all their published manuscripts from the public catalogue.
                  </div>
                </div>
              )}

              {activeModal.type === 'ban' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800">
                  Critical: Banning will permanently deactivate login and unpublish all books created by this author.
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audit Reason / Note:
                </label>
                <textarea
                  rows={2}
                  required
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Reason for moderation action (recorded in audit logs)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#FF500A]/30 focus:border-[#FF500A]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-[#FF500A] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {submitting ? 'Applying...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
