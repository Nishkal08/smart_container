import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Trash2, Shield, Users, Database, Zap, CheckCircle, XCircle, Activity } from 'lucide-react';
import api from '../../lib/api';

const ROLES = ['VIEWER', 'ANALYST', 'ADMIN'];
const ROLE_COLORS = {
  ADMIN:   'bg-red-500/10 text-red-600 border-red-500/20',
  ANALYST: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  VIEWER:  'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

export default function Admin() {
  const qc = useQueryClient();
  const [editingUser, setEditingUser] = useState(null);

  const { data: users, isLoading: usersLoad } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const { data: statsData, isLoading: statsLoad, refetch: refetchStats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.get('/admin/stats').then(r => r.data?.stats ?? r.data),
  });

  const patchUser = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/users/${id}`, data),
    onSuccess: () => {
      toast.success('User updated');
      setEditingUser(null);
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Update failed'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/users/${id}`, { is_active }),
    onSuccess: (_, { is_active }) => {
      toast.success(is_active ? 'User activated' : 'User deactivated');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Update failed'),
  });

  const flushCache = useMutation({
    mutationFn: () => api.post('/admin/flush-cache'),
    onSuccess: () => {
      toast.success('Cache flushed successfully');
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Flush failed'),
  });

  const userList = users?.users ?? users?.items ?? users ?? [];

  const jobsByStatus = statsData?.jobs?.by_status ?? {};
  const completedJobs = jobsByStatus.COMPLETED ?? 0;
  const failedJobs = jobsByStatus.FAILED ?? 0;
  const activeJobs = (jobsByStatus.QUEUED ?? 0) + (jobsByStatus.PROCESSING ?? 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* System Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoad ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-24 rounded-lg border border-border bg-card animate-pulse" />
          ))
        ) : (
          [
            { label: 'Total Users', value: statsData?.users?.total, sub: `${userList.filter(u => u.is_active !== false).length} active`, icon: Users, cls: 'bg-blue-500/10 text-blue-600' },
            { label: 'Total Containers', value: statsData?.containers?.total, sub: 'in system', icon: Database, cls: 'bg-indigo-500/10 text-indigo-600' },
            { label: 'Total Predictions', value: statsData?.predictions?.total, sub: 'all-time', icon: Zap, cls: 'bg-amber-500/10 text-amber-600' },
            { label: 'Batch Jobs', value: statsData?.jobs?.total ?? 0, sub: `${activeJobs} active · ${failedJobs} failed`, icon: Activity, cls: 'bg-emerald-500/10 text-emerald-600' },
          ].map(({ label, value, sub, icon: Icon, cls }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-2xl font-semibold tabular-nums mt-1">{typeof value === 'number' ? value.toLocaleString() : value ?? '—'}</p>
                {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cls}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Queue status bar */}
      {!statsLoad && statsData?.jobs?.queue_depth > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2.5">
          <Activity className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span><strong>{statsData.jobs.queue_depth}</strong> job{statsData.jobs.queue_depth !== 1 ? 's' : ''} currently in the prediction queue</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={() => refetchStats()}
          className="flex items-center gap-1.5 text-xs border border-border rounded-md px-3 py-1.5 hover:bg-muted transition-colors text-muted-foreground">
          <RefreshCw className="w-3 h-3" /> Refresh Stats
        </button>
        <button onClick={() => flushCache.mutate()}
          disabled={flushCache.isPending}
          className="flex items-center gap-1.5 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-md px-3 py-1.5 hover:bg-amber-500/20 transition-colors disabled:opacity-60">
          {flushCache.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          Flush Rate-Limit Cache
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">User Management</h3>
          <span className="text-xs text-muted-foreground">{userList.length} user{userList.length !== 1 ? 's' : ''}</span>
        </div>
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {usersLoad ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>{Array(6).fill(0).map((__, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : userList.map((u) => (
              <tr key={u.id} className={`hover:bg-muted/20 transition-colors ${u.is_active === false ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                      {(u.name ?? u.email ?? '?')[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{u.name ?? 'Unknown'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-sm">{u.email}</td>
                <td className="px-4 py-3">
                  {editingUser === u.id ? (
                    <select
                      defaultValue={u.role}
                      className="text-xs border border-border rounded-md px-2 py-1 bg-card focus:outline-none focus:ring-1 focus:ring-ring"
                      onChange={e => patchUser.mutate({ id: u.id, role: e.target.value })}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role] ?? ROLE_COLORS.VIEWER}`}>
                      {u.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    u.is_active !== false
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-zinc-500/10 text-zinc-500'
                  }`}>
                    {u.is_active !== false
                      ? <><CheckCircle className="w-3 h-3" /> Active</>
                      : <><XCircle className="w-3 h-3" /> Inactive</>}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingUser(editingUser === u.id ? null : u.id)}
                      className="text-xs text-primary hover:underline">
                      {editingUser === u.id ? 'Done' : 'Edit Role'}
                    </button>
                    <span className="text-border">·</span>
                    <button
                      onClick={() => toggleActive.mutate({ id: u.id, is_active: u.is_active === false })}
                      disabled={toggleActive.isPending}
                      className={`text-xs hover:underline disabled:opacity-50 ${u.is_active !== false ? 'text-zinc-500 hover:text-red-600' : 'text-emerald-600'}`}>
                      {u.is_active !== false ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
