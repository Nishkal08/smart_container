import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Filter, X, Loader2, RefreshCw, Trash2, Zap, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import RiskBadge from '../../components/ui/RiskBadge';
import CountryFlag, { getCountryName } from '../../components/ui/CountryFlag';
import { useAuthStore } from '../../store/authStore';

const RISK_LEVELS = ['ALL', 'CLEAR', 'LOW_RISK', 'CRITICAL'];

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-muted-foreground w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium break-all">{value ?? '—'}</span>
    </div>
  );
}

export default function Containers() {
  const qc = useQueryClient();
  const isAdmin = useAuthStore(s => s.isAdmin?.() ?? false);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [rescoring, setRescoring] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [sortBy, setSortBy] = useState('risk_score');
  const [sortDir, setSortDir] = useState('desc');

  const { data: jobsList } = useQuery({
    queryKey: ['jobs-list'],
    queryFn: () => api.get('/jobs').then(r => r.data?.jobs ?? r.data ?? []),
    staleTime: 30_000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['containers', page, riskFilter, search, batchFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (riskFilter !== 'ALL') params.set('risk_level', riskFilter);
      if (search.trim()) params.set('search', search.trim());
      if (batchFilter) params.set('batch_job_id', batchFilter);
      params.set('sort_by', sortBy);
      params.set('sort_order', sortDir);
      return api.get(`/containers?${params}`).then(r => r.data);
    },
    placeholderData: (previousData) => previousData,
    refetchInterval: 15_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/containers/${id}`),
    onSuccess: () => {
      toast.success('Container deleted');
      qc.invalidateQueries({ queryKey: ['containers'] });
      setSelected(null);
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Delete failed'),
  });

  const rescore = async (containerId) => {
    setRescoring(containerId);
    try {
      await api.post(`/predictions/re-score/${containerId}`);
      toast.success('Re-scored successfully');
      qc.invalidateQueries({ queryKey: ['containers'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['predictions'] });
      if (selected?.id === containerId || selected?.container_id === containerId) {
        setSelected(null);
      }
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Re-score failed');
    } finally {
      setRescoring(null);
    }
  };

  const rows = data?.containers ?? data?.items ?? [];
  const total = data?.pagination?.total ?? data?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? (Math.ceil(total / 20) || 1);

  // Client-side sort fallback (CRITICAL first by default)
  const RISK_ORDER = { CRITICAL: 0, LOW_RISK: 1, CLEAR: 2 };
  const sorted = [...rows].sort((a, b) => {
    const aScore = a.latest_prediction?.risk_score ?? -1;
    const bScore = b.latest_prediction?.risk_score ?? -1;
    return bScore - aScore;
  });

  const filtered = sorted;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search container, country, shipper…"
            className="w-full pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1">
          {RISK_LEVELS.map(l => (
            <button key={l} onClick={() => { setRiskFilter(l); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors border ${riskFilter === l
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}>
              {l.replace('_', ' ')}
            </button>
          ))}
        </div>
        {/* Batch job filter */}
        <select
          value={batchFilter}
          onChange={e => { setBatchFilter(e.target.value); setPage(1); }}
          className="text-xs px-2 py-1.5 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-w-[160px]"
        >
          <option value="">All Batch Jobs</option>
          {(jobsList ?? []).map(j => (
            <option key={j.id} value={j.id}>
              {j.name ?? `Job ${j.id.slice(0, 8)}`} &mdash; {new Date(j.created_at).toLocaleDateString()}
            </option>
          ))}
        </select>
        {batchFilter && (
          <button onClick={() => { setBatchFilter(''); setPage(1); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3 h-3" /> Clear batch
          </button>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {isFetching && <Loader2 className="w-3 h-3 animate-spin" />}
          {total.toLocaleString()} total
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Container ID', 'Origin Country', 'Declared Value', 'Weight Diff', 'Dwell Time', 'Risk'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <tr key={i}>{Array(6).fill(0).map((__, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                      <Filter className="w-6 h-6 text-muted-foreground" />
                    </div>
                    {search || riskFilter !== 'ALL' ? (
                      <>
                        <p className="font-semibold text-sm">No containers match your filters</p>
                        <button onClick={() => { setSearch(''); setRiskFilter('ALL'); setPage(1); }}
                          className="text-xs text-primary hover:underline font-medium">Clear filters</button>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-sm">No containers yet</p>
                        <p className="text-xs text-muted-foreground max-w-xs">Upload a CSV file to import container data and start risk scoring.</p>
                        <Link to="/upload" className="mt-1 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg shadow shadow-primary/20 transition-all hover:bg-primary/90 flex items-center gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5" /> Upload CSV
                        </Link>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : filtered.map((c) => {
              const weightDiff = c.declared_weight && c.measured_weight
                ? ((c.measured_weight - c.declared_weight) / c.declared_weight * 100)
                : null;
              return (
              <tr key={c.id}
                className={`hover:bg-muted/30 cursor-pointer transition-colors ${
                  c.latest_prediction?.risk_level === 'CRITICAL' ? 'bg-red-500/5' : ''
                }`}
                onClick={() => setSelected(c)}>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-medium">{c.container_id}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-sm">
                    <CountryFlag code={c.origin_country} size="sm" />
                    <span className="truncate max-w-[120px]">{getCountryName(c.origin_country)}</span>
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-sm">${c.declared_value?.toLocaleString() ?? '—'}</td>
                <td className="px-4 py-3 tabular-nums">
                  {weightDiff !== null ? (
                    <span className={`text-sm font-semibold ${
                      Math.abs(weightDiff) > 15 ? 'text-red-600' :
                      Math.abs(weightDiff) > 5 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)}%
                    </span>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 tabular-nums text-sm">
                  {c.dwell_time_hours != null ? (
                    <span className={c.dwell_time_hours > 72 ? 'text-amber-600 font-medium' : ''}>
                      {c.dwell_time_hours.toFixed(0)}h
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  {c.latest_prediction
                    ? <RiskBadge level={c.latest_prediction.risk_level} score={c.latest_prediction.risk_score} showScore />
                    : <span className="text-xs text-muted-foreground">Unscored</span>}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 flex"
            onClick={() => setSelected(null)}
          >
            <div className="flex-1 bg-black/30 backdrop-blur-[2px]" />
            <motion.div
              key="drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
              className="w-[440px] bg-card border-l border-border shadow-2xl h-full overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
            {/* Drawer header */}
            <div className="flex items-start justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <h2 className="font-semibold font-mono">{selected.container_id}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Container Details</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Risk badge */}
              {selected.latest_prediction && (
                <div className="rounded-lg bg-muted/40 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current Risk Assessment</p>
                    <RiskBadge level={selected.latest_prediction.risk_level} score={selected.latest_prediction.risk_score} showScore size="md" />
                  </div>
                  <span className="text-2xl font-bold tabular-nums">{selected.latest_prediction.risk_score}</span>
                </div>
              )}

              {/* Explanation */}
              {selected.latest_prediction?.explanation_summary && (
                <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Model Explanation</p>
                  <p className="text-xs text-foreground/70 leading-relaxed">{selected.latest_prediction.explanation_summary}</p>
                </div>
              )}

              {/* Container info */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shipment Info</p>
                <div className="space-y-2.5">
                  {[
                    ['Container ID', selected.container_id],
                    ['Origin Country', getCountryName(selected.origin_country)],
                    ['Destination', getCountryName(selected.destination_country)],
                    ['Destination Port', selected.destination_port],
                    ['HS Code', selected.hs_code],
                    ['Trade Regime', selected.trade_regime],
                    ['Importer ID', selected.importer_id],
                    ['Exporter ID', selected.exporter_id],
                    ['Shipping Line', selected.shipping_line],
                    ['Declared Weight (kg)', selected.declared_weight?.toLocaleString()],
                    ['Measured Weight (kg)', selected.measured_weight?.toLocaleString()],
                    ['Declared Value (USD)', selected.declared_value ? `$${selected.declared_value.toLocaleString()}` : null],
                    ['Dwell Time', selected.dwell_time_hours ? `${selected.dwell_time_hours}h` : null],
                    ['Declaration Date', selected.declaration_date],
                  ].map(([l, v]) => <DetailRow key={l} label={l} value={v} />)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => rescore(selected.id)}
                  disabled={rescoring === selected.id}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity">
                  {rescoring === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Re-score
                </button>
                <Link
                  to={`/containers/${selected.id}`}
                  className="w-full flex items-center justify-center gap-2 border border-border rounded-md px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                  <ExternalLink className="w-4 h-4" /> Full Details
                </Link>
                {isAdmin && (
                  confirmDeleteId === selected.id ? (
                    <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 space-y-2">
                      <p className="text-xs font-semibold text-red-600">Delete this container?</p>
                      <p className="text-xs text-muted-foreground">This cannot be undone. All predictions will also be removed.</p>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => setConfirmDeleteId(null)}
                          className="flex-1 h-8 rounded-md border border-border text-xs hover:bg-muted transition-colors">
                          Cancel
                        </button>
                        <button
                          onClick={() => { deleteMutation.mutate(selected.id); setConfirmDeleteId(null); }}
                          disabled={deleteMutation.isPending}
                          className="flex-1 h-8 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors">
                          {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(selected.id)}
                      className="w-full flex items-center justify-center gap-2 border border-red-400 text-red-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" /> Delete Container
                    </button>
                  )
                )}
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
