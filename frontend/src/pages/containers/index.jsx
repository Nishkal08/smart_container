import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Filter, X, Loader2, RefreshCw, Trash2, Zap, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import RiskBadge from '../../components/ui/RiskBadge';
import CountryFlag from '../../components/ui/CountryFlag';
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
  const [selected, setSelected] = useState(null);
  const [rescoring, setRescoring] = useState(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['containers', page, riskFilter, search],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (riskFilter !== 'ALL') params.set('risk_level', riskFilter);
      if (search.trim()) params.set('search', search.trim());
      return api.get(`/containers?${params}`).then(r => r.data);
    },
    placeholderData: (previousData) => previousData,
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

  const filtered = rows;

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
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors border ${
                riskFilter === l
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}>
              {l.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {isFetching && <Loader2 className="w-3 h-3 animate-spin" />}
          {total.toLocaleString()} total
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Container ID', 'Origin', 'Shipper', 'HS Code', 'Weight (kg)', 'Value (USD)', 'Risk'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <tr key={i}>{Array(7).fill(0).map((__, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted-foreground text-sm py-16">No containers found.</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setSelected(c)}>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-medium">{c.container_id}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CountryFlag code={c.origin_country} size="sm" />
                    {c.origin_country}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-[140px] truncate">{c.shipper_id}</td>
                <td className="px-4 py-3 font-mono text-xs">{c.hs_code}</td>
                <td className="px-4 py-3 tabular-nums">{c.weight_kg?.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums">${c.declared_value_usd?.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {c.latest_prediction
                    ? <RiskBadge level={c.latest_prediction.risk_level} score={c.latest_prediction.risk_score} showScore />
                    : <span className="text-xs text-muted-foreground">Unscored</span>}
                </td>
              </tr>
            ))}
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
      {selected && (
        <div className="fixed inset-0 z-40 flex" onClick={() => setSelected(null)}>
          <div className="flex-1 bg-black/30 backdrop-blur-[1px]" />
          <div className="w-[440px] bg-card border-l border-border shadow-xl h-full overflow-y-auto animate-slide-in-right"
            onClick={e => e.stopPropagation()}>
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
                    ['Origin Country', selected.origin_country],
                    ['Destination', selected.destination_country],
                    ['HS Code', selected.hs_code],
                    ['Goods Description', selected.goods_description],
                    ['Shipper ID', selected.shipper_id],
                    ['Consignee ID', selected.consignee_id],
                    ['Weight (kg)', selected.weight_kg?.toLocaleString()],
                    ['Declared Value (USD)', selected.declared_value_usd ? `$${selected.declared_value_usd.toLocaleString()}` : null],
                    ['Quantity', selected.quantity?.toLocaleString()],
                    ['Shipment Date', selected.shipment_date ? new Date(selected.shipment_date).toLocaleDateString() : null],
                    ['Port of Entry', selected.port_of_entry],
                    ['Transport Mode', selected.transport_mode],
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
                  <button
                    onClick={() => {
                      if (confirm('Delete this container? This cannot be undone.')) {
                        deleteMutation.mutate(selected.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 border border-red-400 text-red-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" /> Delete Container
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
