import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, Download, X, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, Plus, Boxes, ShieldAlert, ShieldCheck, Trash2, Copy } from 'lucide-react';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { gsap } from 'gsap';

const STATUS_CFG = {
  QUEUED: { label: 'Queued', icon: Clock, cls: 'text-blue-600 bg-blue-500/10' },
  PROCESSING: { label: 'Processing', icon: Loader2, cls: 'text-amber-600 bg-amber-500/10', spin: true },
  COMPLETED: { label: 'Completed', icon: CheckCircle, cls: 'text-emerald-600 bg-emerald-500/10' },
  FAILED: { label: 'Failed', icon: XCircle, cls: 'text-red-600 bg-red-500/10' },
  CANCELLED: { label: 'Cancelled', icon: AlertTriangle, cls: 'text-zinc-500 bg-zinc-500/10' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.QUEUED;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
      <Icon className={`w-3 h-3 ${cfg.spin ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ pct, className = 'w-32 h-2' }) {
  return (
    <div className={`bg-muted rounded-full overflow-hidden ${className}`}>
      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct ?? 0}%` }} />
    </div>
  );
}

const SCOPES = [
  { value: 'all', label: 'All Containers', desc: 'Every container in the system', icon: Boxes, color: 'text-foreground' },
  { value: 'CRITICAL', label: 'Critical Risk', desc: 'Flagged as high-risk — priority inspection', icon: ShieldAlert, color: 'text-red-500' },
  { value: 'LOW_RISK', label: 'Low Risk', desc: 'Moderate risk — secondary review needed', icon: AlertTriangle, color: 'text-amber-500' },
  { value: 'CLEAR', label: 'Clear', desc: 'Previously cleared — can be re-assessed', icon: ShieldCheck, color: 'text-emerald-500' },
];

function NewJobDialog({ onClose }) {
  const qc = useQueryClient();
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const [jobName, setJobName] = useState(`Re-score ${today}`);
  const [scope, setScope] = useState('all');

  // Fetch container counts for all scopes in parallel
  const scopeCountQueries = useQueries({
    queries: SCOPES.map(s => ({
      queryKey: ['container-count', s.value],
      queryFn: async () => {
        const params = new URLSearchParams({ page: '1', limit: '1' });
        if (s.value !== 'all') params.set('risk_level', s.value);
        const r = await api.get(`/containers?${params}`);
        return r.data?.pagination?.total ?? r.data?.total ?? 0;
      },
      staleTime: 30_000,
    })),
  });

  const selectedIdx = SCOPES.findIndex(s => s.value === scope);
  const selectedCount = scopeCountQueries[selectedIdx]?.data;
  const isCountLoading = scopeCountQueries[selectedIdx]?.isPending;

  const createMutation = useMutation({
    mutationFn: ({ job_name, scope }) =>
      api.post('/predictions/batch', { scope, job_name }),
    onSuccess: () => {
      toast.success('Batch prediction queued!');
      qc.invalidateQueries({ queryKey: ['jobs'] });
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message ?? e.message ?? 'Failed to create job'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Boxes className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">Create Batch Prediction</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Queue containers for ML risk scoring</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors ml-2 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Job Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Job Name</label>
            <input
              value={jobName}
              onChange={e => setJobName(e.target.value)}
              placeholder="e.g. Weekly re-score"
              className="w-full h-10 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>

          {/* Container Scope */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Container Scope</label>
            <div className="grid grid-cols-2 gap-2.5">
              {SCOPES.map((s, i) => {
                const count = scopeCountQueries[i].data;
                const loadingCount = scopeCountQueries[i].isPending;
                const isSelected = scope === s.value;
                const Icon = s.icon;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setScope(s.value)}
                    className={`relative text-left rounded-xl border p-4 transition-all duration-150 ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/40 hover:bg-muted/40'
                    }`}>
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${s.color}`} />
                        <p className="text-sm font-semibold leading-tight truncate">{s.label}</p>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 leading-snug">{s.desc}</p>
                    {loadingCount ? (
                      <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    ) : (
                      <p className={`text-xs font-bold tabular-nums ${count === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {count?.toLocaleString() ?? '—'}
                        <span className="font-normal text-muted-foreground"> containers</span>
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Empty state warning */}
          {selectedCount === 0 && !isCountLoading && (
            <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">No containers available</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-0.5">
                  No containers match this scope. Upload a dataset first.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            disabled={createMutation.isPending}
            className="h-9 px-5 rounded-xl border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => createMutation.mutate({ job_name: jobName, scope })}
            disabled={createMutation.isPending || !jobName.trim() || selectedCount === 0}
            className="h-9 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors">
            {createMutation.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Queuing…</>
              : <><Plus className="w-3.5 h-3.5" /> Queue Prediction</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function Jobs() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [showNewJob, setShowNewJob] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const drawerRef = useRef(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.get('/jobs').then(r => r.data),
    refetchInterval: (query) => {
      // TanStack Query v5: refetchInterval receives the Query object, not raw data
      const d = query.state.data;
      const jobs = Array.isArray(d) ? d : (d?.jobs ?? d?.items ?? []);
      const hasActive = Array.isArray(jobs) && jobs.some(j => ['QUEUED', 'PROCESSING'].includes(j.status));
      return hasActive ? 5000 : false;
    },
  });

  // Fetch full job detail (includes risk_breakdown) when a job is selected
  const { data: jobDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['job-detail', selected?.id],
    queryFn: () => api.get(`/jobs/${selected.id}`).then(r => r.data?.job ?? r.data),
    enabled: !!selected?.id,
    refetchInterval: selected && ['QUEUED', 'PROCESSING'].includes(selected.status) ? 4000 : false,
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.delete(`/jobs/${id}`),
    onSuccess: (_, id) => {
      toast.success('Job cancelled');
      qc.invalidateQueries({ queryKey: ['jobs'] });
      if (selected?.id === id) setSelected(null);
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Failed to cancel job'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/jobs/${id}/permanent`),
    onSuccess: (_, id) => {
      toast.success('Job deleted — containers and predictions removed');
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['analytics', 'summary'] });
      qc.invalidateQueries({ queryKey: ['containers'] });
      if (selected?.id === id) setSelected(null);
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Delete failed'),
  });

  // ── Animate modal in when a job is selected ────────────────────────────
  useEffect(() => {
    if (selected && drawerRef.current) {
      gsap.fromTo(drawerRef.current,
        { opacity: 0, scale: 0.94, y: 18 },
        { opacity: 1, scale: 1, y: 0, duration: 0.32, ease: 'power3.out' }
      );
    }
  }, [selected?.id]);

  // ── Real-time job updates via Socket.io ──────────────────────────────────
  const jobs = Array.isArray(data) ? data : (data?.jobs ?? data?.items ?? []);
  const activeIds = jobs.filter(j => ['QUEUED', 'PROCESSING'].includes(j.status)).map(j => j.id).join(',');

  useEffect(() => {
    if (!activeIds) return;
    let socket;
    try { socket = getSocket(); } catch { return; }

    const ids = activeIds.split(',');
    ids.forEach(id => socket.emit('subscribe:job', { job_id: id }));

    const onProgress = ({ job_id, processed_count, total_containers, progress }) => {
      qc.setQueryData(['jobs'], (old) => {
        if (!old) return old;
        const list = old?.jobs ?? old?.items ?? old ?? [];
        const updated = list.map(j => j.id === job_id
          ? { ...j, processed_count, total_containers, progress }
          : j);
        if (Array.isArray(old)) return updated;
        if (old?.jobs) return { ...old, jobs: updated };
        if (old?.items) return { ...old, items: updated };
        return old;
      });
      // Keep the detail drawer in sync without waiting for the 4s refetch interval
      qc.setQueryData(['job-detail', job_id], (old) =>
        old ? { ...old, processed_count, total_containers, progress_pct: progress } : old
      );
    };

    const onCompleted = ({ job_id }) => {
      toast.success('Batch prediction completed!');
      qc.invalidateQueries({ queryKey: ['jobs'] });
    };

    const onFailed = ({ job_id, error }) => {
      toast.error('Batch prediction failed', { description: error });
      qc.invalidateQueries({ queryKey: ['jobs'] });
    };

    socket.on('job:progress', onProgress);
    socket.on('job:completed', onCompleted);
    socket.on('job:failed', onFailed);

    return () => {
      socket.off('job:progress', onProgress);
      socket.off('job:completed', onCompleted);
      socket.off('job:failed', onFailed);
      ids.forEach(id => socket.emit('unsubscribe:job', { job_id: id }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIds]);

  const handleDownload = async (job) => {
    try {
      const blob = await api.get(`/jobs/${job.id}/results`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job.name ?? job.id}_results.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download results');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{jobs.length} batch job{jobs.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 transition-colors">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button onClick={() => setShowNewJob(true)}
            className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground rounded-md px-3 py-1.5 hover:bg-primary/90 transition-colors font-medium">
            <Plus className="w-3 h-3" /> New Batch Prediction
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Job Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-52">Progress</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Total</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Created</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {Array(6).fill(0).map((__, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-muted rounded animate-pulse" style={{ width: j === 0 ? '70%' : j === 2 ? '90%' : '60%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                      <Boxes className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">No batch jobs yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Upload a CSV or click <strong>New Batch Prediction</strong> to get started.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : jobs.map((job) => (
              <tr key={job.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors border-b border-border last:border-0"
                onClick={() => setSelected(job)}>
                <td className="px-4 py-3.5">
                  <p className="font-semibold text-sm leading-tight">{job.name ?? `Job ${job.id.slice(0, 8)}`}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{job.id.slice(0, 12)}…</p>
                </td>
                <td className="px-4 py-3.5"><StatusBadge status={job.status} /></td>
                <td className="px-4 py-3.5">
                  <div className="space-y-1.5">
                    <ProgressBar
                      className="w-full h-2"
                      pct={
                        job.status === 'COMPLETED' ? 100
                          : job.progress !== undefined ? job.progress
                            : job.total_containers > 0
                              ? Math.round(((job.processed_count ?? 0) / job.total_containers) * 100)
                              : 0
                      }
                    />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {job.processed_count ?? 0} / {job.total_containers ?? '?'} processed
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm tabular-nums font-medium">{job.total_containers ?? '—'}</td>
                <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(job.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    {job.status === 'COMPLETED' && (
                      <button onClick={() => handleDownload(job)}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Download results">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    {['QUEUED', 'PROCESSING'].includes(job.status) && (
                      <button onClick={() => cancelMutation.mutate(job.id)}
                        disabled={cancelMutation.isPending}
                        className="p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-600 transition-colors text-muted-foreground"
                        title="Cancel job">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status) && (
                      <button onClick={() => setConfirmDelete(job)}
                        className="p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-600 transition-colors text-muted-foreground"
                        title="Delete job">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal — rendered in portal to escape backdrop-filter stacking context */}
      {selected && createPortal((
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div ref={drawerRef} className="relative z-10 w-full max-w-2xl bg-card rounded-2xl border border-border shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Job Details</p>
                <h2 className="font-bold text-lg leading-tight truncate">{selected.name ?? `Job ${selected.id.slice(0, 8)}`}</h2>
                <button
                  onClick={() => { navigator.clipboard.writeText(selected.id); toast.success('ID copied'); }}
                  className="flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors group">
                  <span className="font-mono">{selected.id.slice(0, 16)}…</span>
                  <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-md hover:bg-muted transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {detailLoading && !jobDetail && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading details…
                </div>
              )}

              {/* Status + Progress */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <StatusBadge status={(jobDetail ?? selected).status} />
                  <span className="text-sm font-semibold tabular-nums">
                    {(jobDetail ?? selected).progress_pct ?? (selected.status === 'COMPLETED' ? 100 : 0)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(jobDetail ?? selected).progress_pct ?? (selected.status === 'COMPLETED' ? 100 : 0)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                  <span>{(jobDetail ?? selected).processed_count ?? 0} processed</span>
                  <span>{(jobDetail ?? selected).total_containers ?? '?'} total</span>
                </div>
              </div>

              {/* Metrics grid - 4 columns in wider modal */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: 'Total', value: (jobDetail ?? selected).total_containers ?? '—', cls: '' },
                  { label: 'Processed', value: (jobDetail ?? selected).processed_count ?? 0, cls: '' },
                  { label: 'Failed', value: (jobDetail ?? selected).failed_count ?? 0, cls: (jobDetail ?? selected).failed_count > 0 ? 'text-red-600' : '' },
                  {
                    label: 'Success Rate',
                    value: (() => {
                      const total = (jobDetail ?? selected).total_containers;
                      const failed = (jobDetail ?? selected).failed_count ?? 0;
                      if (!total) return '—';
                      return `${Math.round(((total - failed) / total) * 100)}%`;
                    })(),
                    cls: 'text-emerald-600',
                  },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={`text-xl font-bold tabular-nums ${cls}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Risk Breakdown */}
              {jobDetail?.risk_breakdown && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Risk Breakdown</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex flex-col items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                      <span className="text-2xl font-bold text-red-600 tabular-nums leading-none">{jobDetail.risk_breakdown.CRITICAL}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">Critical</span>
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex flex-col items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-2xl font-bold text-amber-600 tabular-nums leading-none">{jobDetail.risk_breakdown.LOW_RISK}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">Low Risk</span>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex flex-col items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span className="text-2xl font-bold text-emerald-600 tabular-nums leading-none">{jobDetail.risk_breakdown.CLEAR}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">Clear</span>
                    </div>
                  </div>
                  {(() => {
                    const total = jobDetail.risk_breakdown.CRITICAL + jobDetail.risk_breakdown.LOW_RISK + jobDetail.risk_breakdown.CLEAR;
                    if (!total) return null;
                    return (
                      <div className="mt-3 h-2 rounded-full overflow-hidden flex bg-muted">
                        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${(jobDetail.risk_breakdown.CRITICAL / total) * 100}%` }} />
                        <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(jobDetail.risk_breakdown.LOW_RISK / total) * 100}%` }} />
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(jobDetail.risk_breakdown.CLEAR / total) * 100}%` }} />
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Timestamps */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</p>
                <div className="space-y-1.5">
                  {[
                    ['Created', selected.created_at],
                    ['Updated', selected.updated_at],
                    ['Completed', (jobDetail ?? selected).completed_at],
                  ].filter(([, v]) => !!v).map(([label, val]) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground font-medium">{new Date(val).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error message */}
              {(jobDetail ?? selected).error_message && (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-xs font-medium text-red-600 mb-1">Error</p>
                  <p className="text-xs text-red-600/80">{(jobDetail ?? selected).error_message}</p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex flex-col gap-2">
                {(jobDetail ?? selected).status === 'COMPLETED' && (
                  <button onClick={() => handleDownload(selected)}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors">
                    <Download className="w-4 h-4" /> Download Results CSV
                  </button>
                )}
                {['QUEUED', 'PROCESSING'].includes((jobDetail ?? selected).status) && (
                  <button onClick={() => cancelMutation.mutate(selected.id)}
                    disabled={cancelMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 border border-border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                    {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Cancel Job
                  </button>
                )}
                {['COMPLETED', 'FAILED', 'CANCELLED'].includes((jobDetail ?? selected).status) && (
                  <button onClick={() => setConfirmDelete(jobDetail ?? selected)}
                    className="w-full flex items-center justify-center gap-2 border border-red-400/40 text-red-600 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" /> Delete Job &amp; Containers
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Delete confirmation dialog — also portaled */}
      {confirmDelete && createPortal((
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => !deleteMutation.isPending && setConfirmDelete(null)}>
          <div className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Delete batch job?</h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">
                  {confirmDelete.name ?? `Job ${confirmDelete.id?.slice(0, 8)}`}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will permanently delete the job, remove all{' '}
              <strong className="text-foreground">{(confirmDelete.processed_count ?? 0).toLocaleString()} predictions</strong>,
              {' '}and <strong className="text-foreground">hard-delete the associated containers</strong> from the system.
              This cannot be undone.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 h-9 rounded-md border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 h-9 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleteMutation.isPending ? 'Deleting…' : 'Delete Job'}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* New Batch Job dialog */}
      {showNewJob && <NewJobDialog onClose={() => setShowNewJob(false)} />}
    </div>
  );
}
