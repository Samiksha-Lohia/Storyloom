import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  X,
} from 'lucide-react';
import { api } from '../../services/api';

const ROLES = ['all', 'reader', 'writer', 'publisher', 'admin'];
const STATUSES = ['all', 'active', 'suspended', 'banned'];

export function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Moderation Dialog State
  const [activeModal, setActiveModal] = useState(null); // { type: 'role'|'suspend'|'ban'|'restore', user }
  const [newRole, setNewRole] = useState('reader');
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [actionNote, setActionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.admin.getUsers({
        page,
        limit: 15,
        search: search.trim() || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setUsers(res?.data?.users || res?.users || []);
      setPagination(
        res?.data?.pagination ||
          res?.pagination || { total: 0, totalPages: 1 }
      );
    } catch (err) {
      console.error('Failed to load admin users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleExecuteAction = async (e) => {
    e.preventDefault();
    if (!activeModal || !actionNote.trim()) return;

    setSubmitting(true);
    try {
      const userId = activeModal.user.id || activeModal.user._id;
      if (activeModal.type === 'role') {
        await api.admin.updateUserRole(userId, newRole, actionNote.trim());
      } else if (activeModal.type === 'suspend') {
        await api.admin.suspendUser(userId, suspensionDays, actionNote.trim());
      } else if (activeModal.type === 'ban') {
        await api.admin.banUser(userId, actionNote.trim());
      } else if (activeModal.type === 'restore') {
        await api.admin.restoreUser(userId, actionNote.trim());
      }
      setActiveModal(null);
      setActionNote('');
      fetchUsers();
    } catch (err) {
      alert(`Action failed: ${err.message || 'Please try again'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return (
        <span className="px-1.5 py-0.5 rounded border border-success text-success text-[10px] font-bold uppercase tracking-wider">
          Active
        </span>
      );
    }
    if (status === 'suspended') {
      return (
        <span className="px-1.5 py-0.5 rounded border border-danger text-danger text-[10px] font-bold uppercase tracking-wider">
          Suspended
        </span>
      );
    }
    if (status === 'banned') {
      return (
        <span className="px-1.5 py-0.5 rounded border border-danger text-danger text-[10px] font-bold uppercase tracking-wider">
          Banned
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded border border-rule text-muted text-[10px] font-bold uppercase tracking-wider">
        {status}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const map = {
      admin: 'border-ink text-ink',
      writer: 'border-accent text-accent',
      publisher: 'border-muted text-muted',
      reader: 'border-rule text-muted',
    };
    return (
      <span
        className={`px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
          map[role] || 'border-rule text-muted'
        }`}
      >
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-left">
      {/* Header */}
      <div className="border-b border-rule pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded border border-rule text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              User Oversight
            </span>
          </div>
          <h1 className="font-calligraphy text-3xl font-normal text-ink mt-2">
            Community &amp; User Accounts
          </h1>
          <p className="text-xs text-muted mt-1">
            Search, inspect roles, ban or suspend accounts, and view user publication records.
          </p>
        </div>

        <span className="text-xs text-muted font-mono">
          Total accounts: <strong>{pagination.total}</strong>
        </span>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search users"
            placeholder="Search by name, email, or username..."
            className="w-full bg-paper border border-rule rounded pl-9 pr-3 py-1.5 text-xs text-ink focus:outline-hidden focus:ring-1 focus:ring-ink"
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
            className="bg-paper border border-rule rounded px-3 py-1.5 text-xs font-semibold text-ink cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-ink"
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
            className="bg-paper border border-rule rounded px-3 py-1.5 text-xs font-semibold text-ink cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-ink"
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
      <div className="bg-paper border border-rule rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-paper border-b border-rule text-[11px] font-bold text-muted uppercase tracking-wider">
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Books</th>
                <th className="p-3">Reports</th>
                <th className="p-3">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-muted">
                    Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted">
                    No users match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSuspended = u.status === 'suspended';
                  const isBanned = u.status === 'banned';

                  return (
                    <tr key={u.id || u._id} className="hover:bg-rule/10">
                      {/* Name & Email */}
                      <td className="p-3">
                        <div className="font-semibold text-ink">{u.name}</div>
                        <div className="text-[11px] text-muted font-mono">
                          {u.email} &bull; @{u.username}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-3">{getRoleBadge(u.role)}</td>

                      {/* Status */}
                      <td className="p-3">
                        <div className="space-y-0.5">
                          {getStatusBadge(u.status)}
                          {isSuspended && u.suspensionEndsAt && (
                            <div className="text-[10px] text-danger font-mono">
                              Until {new Date(u.suspensionEndsAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Books count */}
                      <td className="p-3 font-mono font-semibold text-ink">
                        {u.booksCount || 0}
                      </td>

                      {/* Reports count */}
                      <td className="p-3">
                        {u.reportsCount > 0 ? (
                          <span className="px-1.5 py-0.5 border border-danger text-danger font-bold rounded text-[10px]">
                            {u.reportsCount} report(s)
                          </span>
                        ) : (
                          <span className="text-muted font-mono">0</span>
                        )}
                      </td>

                      {/* Joined date */}
                      <td className="p-3 text-muted font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Action buttons */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Change Role */}
                          <button
                            onClick={() => {
                              setActiveModal({ type: 'role', user: u });
                              setNewRole(u.role);
                              setActionNote('');
                            }}
                            className="px-2 py-0.5 bg-paper border border-rule hover:bg-rule/10 text-ink rounded text-[11px] font-semibold cursor-pointer"
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
                                className="px-2 py-0.5 bg-paper hover:bg-rule/10 text-muted border border-rule rounded text-[11px] font-semibold cursor-pointer"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => {
                                  setActiveModal({ type: 'ban', user: u });
                                  setActionNote('');
                                }}
                                className="px-2 py-0.5 bg-paper hover:bg-rule/10 text-danger border border-danger rounded text-[11px] font-semibold cursor-pointer"
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
                              className="px-2 py-0.5 bg-ink text-paper hover:bg-accent rounded text-[11px] font-bold cursor-pointer"
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
          <div className="p-3 border-t border-rule flex justify-between items-center text-xs">
            <span className="text-muted">
              Page {page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-paper border border-rule text-ink rounded font-semibold disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1 bg-paper border border-rule text-ink rounded font-semibold disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Dialog Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-action-modal-title"
            className="bg-paper rounded max-w-md w-full p-6 space-y-4 border border-rule"
          >
            <div className="flex items-center justify-between">
              <h3 id="user-action-modal-title" className="font-bold text-base text-ink capitalize">
                {activeModal.type === 'role' && 'Change Account Role'}
                {activeModal.type === 'suspend' && 'Suspend User Account'}
                {activeModal.type === 'ban' && 'Permanent Ban User'}
                {activeModal.type === 'restore' && 'Restore User Account'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                aria-label="Close dialog"
                className="p-1 text-muted hover:text-ink rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted">
              User: <strong className="text-ink">{activeModal.user?.name}</strong> (
              {activeModal.user?.email})
            </p>

            <form onSubmit={handleExecuteAction} className="space-y-4">
              {activeModal.type === 'role' && (
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    Select New Role:
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full bg-paper border border-rule rounded p-2 text-xs font-semibold text-ink focus:outline-hidden focus:ring-1 focus:ring-ink"
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
                    <label className="block text-xs font-semibold text-muted mb-1">
                      Suspension Duration:
                    </label>
                    <select
                      value={suspensionDays}
                      onChange={(e) => setSuspensionDays(e.target.value)}
                      className="w-full bg-paper border border-rule rounded p-2 text-xs font-semibold text-ink focus:outline-hidden focus:ring-1 focus:ring-ink"
                    >
                      <option value={3}>3 Days</option>
                      <option value={7}>7 Days (1 Week)</option>
                      <option value={14}>14 Days (2 Weeks)</option>
                      <option value={30}>30 Days (1 Month)</option>
                      <option value={90}>90 Days (3 Months)</option>
                    </select>
                  </div>
                  <div className="p-3 bg-paper border border-danger rounded text-[11px] text-danger">
                    Warning: Suspending this user will immediately hide all their published manuscripts from the public catalogue.
                  </div>
                </div>
              )}

              {activeModal.type === 'ban' && (
                <div className="p-3 bg-paper border border-danger rounded text-[11px] text-danger">
                  Critical: Banning will permanently deactivate login and unpublish all books created by this author.
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  Audit Reason / Note:
                </label>
                <textarea
                  rows={2}
                  required
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Reason for moderation action (recorded in audit logs)..."
                  className="w-full bg-paper border border-rule rounded p-2.5 text-xs text-ink placeholder:text-muted focus:outline-hidden focus:ring-1 focus:ring-ink"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  disabled={submitting}
                  className="px-3.5 py-1.5 border border-rule text-muted hover:text-ink rounded text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-ink hover:bg-accent text-paper rounded text-xs font-bold cursor-pointer"
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

export default AdminUsersPage;
