import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Download, X, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

const STATUS_CFG = {
  QUEUED:     { label: 'Queued',     icon: Clock,         cls: 'text-blue-600 bg-blue-500/10' },
  PROCESSING: { label: 'Processing', icon: Loader2,        cls: 'text-amber-600 bg-amber-500/10', spin: true },
  COMPLETED:  { label: 'Completed',  icon: CheckCircle,    cls: 'text-emerald-600 bg-emerald-500/10' },
  FAILED:     { label: 'Failed',     icon: XCircle,        cls: 'text-red-600 bg-red-500/10' },
  CANCELLED:  { label: 'Cancelled',  icon: AlertTriangle,  cls: 'text-zinc-500 bg-zinc-500/10' },
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

function ProgressBar({ pct }) {
  return (
    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pct ?? 0}%` }} />
    </div>
  );
}

export default function Jobs() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.get('/jobs').then(r => r.data),
    refetchInterval: (data) => {
      const jobs = data?.jobs ?? data?.items ?? data ?? [];
      const hasActive = jobs.some(j => ['QUEUED', 'PROCESSING'].includes(j.status));
      return hasActive ? 5000 : false;
    },
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

  const handleDownload = async (job) => {
    try {
      const res = await api.get(`/jobs/${job.id}/results`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job.job_name ?? job.id}_results.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download results');
    }
  };

  const jobs = data?.jobs ?? data?.items ?? data ?? [];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{jobs.length} batch job{jobs.length !== 1 ? 's' : ''}</p>
        <button onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 transition-colors">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Job Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Progress</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Containers</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Created</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(6).fill(0).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground text-sm py-16">
                  No batch jobs yet. Upload a CSV to start one.
                </td>
              </tr>
            ) : jobs.map((job) => (
              <tr key={job.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setSelected(job)}>
                <td className="px-4 py-3">
                  <p className="font-medium text-sm">{job.job_name ?? `Job ${job.id.slice(0, 8)}`}</p>
                  <p className="text-xs text-muted-foreground font-mono">{job.id.slice(0, 12)}…</p>
                </td>
                <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar pct={job.progress ?? (job.status === 'COMPLETED' ? 100 : 0)} />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {job.processed_count ?? 0}/{job.total_containers ?? '?'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums">{job.total_containers ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(job.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-40 flex" onClick={() => setSelected(null)}>
          <div className="flex-1 bg-black/30 backdrop-blur-[1px]" />
          <div className="w-96 bg-card border-l border-border shadow-xl h-full overflow-y-auto animate-slide-in-right"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-semibold">{selected.job_name ?? 'Batch Job'}</h2>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-28">Status</span>
                <StatusBadge status={selected.status} />
              </div>
              {[
                ['Total Containers', selected.total_containers],
                ['Processed', selected.processed_count ?? 0],
                ['Failed', selected.failed_count ?? 0],
                ['Created', new Date(selected.created_at).toLocaleString()],
                ['Updated', selected.updated_at ? new Date(selected.updated_at).toLocaleString() : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground w-28 shrink-0">{k}</span>
                  <span className="text-sm font-medium">{v}</span>
                </div>
              ))}
              {selected.error_message && (
                <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-xs font-medium text-red-600 mb-1">Error</p>
                  <p className="text-xs text-red-600/80">{selected.error_message}</p>
                </div>
              )}
              <div className="pt-2 flex flex-col gap-2">
                {selected.status === 'COMPLETED' && (
                  <button onClick={() => handleDownload(selected)}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
                    <Download className="w-4 h-4" /> Download Results
                  </button>
                )}
                {['QUEUED', 'PROCESSING'].includes(selected.status) && (
                  <button onClick={() => cancelMutation.mutate(selected.id)}
                    disabled={cancelMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 border border-red-400 text-red-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-red-500/10 transition-colors">
                    <X className="w-4 h-4" /> Cancel Job
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
