import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  Search, Filter, ChevronLeft, ChevronRight, Loader2, X,
  ShieldAlert, ShieldCheck, AlertTriangle, Download, Eye,
  ArrowUpRight, ArrowDownRight, TrendingUp, BarChart3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import api from '../../lib/api';
import RiskBadge from '../../components/ui/RiskBadge';
import CountryFlag from '../../components/ui/CountryFlag';

const RISK_LEVELS = ['ALL', 'CLEAR', 'LOW_RISK', 'CRITICAL'];

const RISK_ICON = {
  CLEAR: ShieldCheck,
  LOW_RISK: AlertTriangle,
  CRITICAL: ShieldAlert,
};

const RISK_COLORS = {
  CLEAR: '#10b981',
  LOW_RISK: '#f59e0b',
  CRITICAL: '#ef4444',
};

function SHAPChart({ contributions }) {
  if (!contributions || contributions.length === 0) return null;

  const data = contributions.slice(0, 6).map(c => ({
    feature: c.description || c.feature,
    value: c.contribution,
    fill: c.direction === 'increases_risk' ? '#ef4444' : '#10b981',
  })).reverse();

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-muted-foreground mb-2">Risk Factor Contributions</p>
      <ResponsiveContainer width="100%" height={data.length * 32 + 20}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis
            type="category"
            dataKey="feature"
            width={140}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
            formatter={(v) => [v > 0 ? `+${v.toFixed(4)}` : v.toFixed(4), 'SHAP']}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RiskGauge({ score }) {
  const angle = (score / 100) * 180;
  const color = score >= 55 ? '#ef4444' : score >= 30 ? '#f59e0b' : '#10b981';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-28 h-16">
        <path d="M10 60 A50 50 0 0 1 110 60" fill="none" stroke="hsl(var(--border))" strokeWidth="8" strokeLinecap="round" />
        <path
          d="M10 60 A50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 157} 157`}
          className="transition-all duration-700"
        />
        <text x="60" y="55" textAnchor="middle" className="text-lg font-bold" fill={color} fontSize="18">
          {Math.round(score)}
        </text>
      </svg>
    </div>
  );
}

export default function Predictions() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['predictions', 'list', page, riskFilter, search],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 15 });
      if (riskFilter !== 'ALL') params.set('risk_level', riskFilter);
      if (search.trim()) params.set('search', search.trim());
      return api.get(`/predictions?${params}`).then(r => r.data);
    },
    placeholderData: (previousData) => previousData,
  });

  const exportMutation = useMutation({
    mutationFn: () => api.get('/predictions/export', { responseType: 'blob' }),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'predictions_export.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    },
    onError: () => toast.error('Export failed'),
  });

  const predictions = data?.predictions ?? [];
  const pagination = data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

  const filtered = predictions;

  // Stats from current view
  const criticalCount = predictions.filter(p => p.risk_level === 'CRITICAL').length;
  const lowRiskCount = predictions.filter(p => p.risk_level === 'LOW_RISK').length;
  const clearCount = predictions.filter(p => p.risk_level === 'CLEAR').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Mini Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Critical', count: criticalCount, color: 'text-red-600 bg-red-500/10', Icon: ShieldAlert },
          { label: 'Low Risk', count: lowRiskCount, color: 'text-amber-600 bg-amber-500/10', Icon: AlertTriangle },
          { label: 'Clear', count: clearCount, color: 'text-emerald-600 bg-emerald-500/10', Icon: ShieldCheck },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
              <s.Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">{s.count}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search container, country, importer…"
            className="w-full pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1">
          {RISK_LEVELS.map(l => (
            <button
              key={l}
              onClick={() => { setRiskFilter(l); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors border ${
                riskFilter === l
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              {l.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          <span className="text-xs text-muted-foreground tabular-nums">{pagination.total} total</span>
        </div>
      </div>

      {/* Predictions Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Container ID', 'Origin', 'Destination', 'Importer', 'Risk Score', 'Risk Level', 'Model', 'Date', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <tr key={i}>{Array(9).fill(0).map((__, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted-foreground text-sm py-16">
                  No predictions found.
                </td>
              </tr>
            ) : filtered.map(p => {
              const Icon = RISK_ICON[p.risk_level] || ShieldCheck;
              return (
                <tr
                  key={p.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelected(p)}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-medium">{p.container?.container_id ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <CountryFlag code={p.container?.origin_country} />
                      <span className="text-xs">{p.container?.origin_country ?? '—'}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <CountryFlag code={p.container?.destination_country} />
                      <span className="text-xs">{p.container?.destination_country ?? '—'}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">
                    {p.container?.importer_id ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold tabular-nums ${
                      p.risk_score >= 55 ? 'text-red-600' : p.risk_score >= 30 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {Math.round(p.risk_score)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={p.risk_level} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      p.is_mock ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'
                    }`}>
                      {p.is_mock ? 'Mock' : p.model_version}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/containers/${p.container?.container_id ?? p.container_id}`}
                      onClick={e => e.stopPropagation()}
                      className="text-primary hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <span className="text-xs text-muted-foreground">
              Page {page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-40 flex" onClick={() => setSelected(null)}>
          <div className="flex-1 bg-black/30 backdrop-blur-[1px]" />
          <div
            className="w-[500px] bg-card border-l border-border shadow-xl h-full overflow-y-auto animate-slide-in-right"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <h2 className="font-semibold font-mono text-sm">{selected.container?.container_id ?? selected.container_id}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Prediction Details</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Risk Score Gauge */}
              <div className="rounded-lg bg-muted/40 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Risk Assessment</p>
                  <RiskBadge level={selected.risk_level} score={selected.risk_score} showScore size="md" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {selected.is_mock ? 'Mock model' : `Model: ${selected.model_version}`}
                  </p>
                </div>
                <RiskGauge score={selected.risk_score} />
              </div>

              {/* Explanation */}
              {selected.explanation_summary && (
                <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" /> Model Explanation
                  </p>
                  <p className="text-xs text-foreground/70 leading-relaxed">{selected.explanation_summary}</p>
                </div>
              )}

              {/* SHAP Bar Chart */}
              <div className="rounded-lg border border-border p-4">
                <SHAPChart contributions={selected.feature_contributions} />
                {(!selected.feature_contributions || selected.feature_contributions.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No SHAP feature contributions available for this prediction
                  </p>
                )}
              </div>

              {/* Anomalies */}
              {selected.anomalies && selected.anomalies.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Anomalies Detected
                  </p>
                  {selected.anomalies.map((a, i) => (
                    <div
                      key={i}
                      className={`rounded-md border p-3 ${
                        a.severity === 'HIGH'
                          ? 'border-red-500/20 bg-red-500/5'
                          : 'border-amber-500/20 bg-amber-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${
                          a.severity === 'HIGH' ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {a.type?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          a.severity === 'HIGH' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {a.severity}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/70 mt-1">{a.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Container info */}
              {selected.container && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Container Info</p>
                  <div className="space-y-2">
                    {[
                      ['Origin', selected.container.origin_country],
                      ['Destination', selected.container.destination_country],
                      ['Importer', selected.container.importer_id],
                      ['Exporter', selected.container.exporter_id],
                    ].map(([l, v]) => (
                      <div key={l} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24 shrink-0">{l}</span>
                        <span className="text-sm font-medium flex items-center gap-1.5">
                          {(l === 'Origin' || l === 'Destination') && <CountryFlag code={v} />}
                          {v || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link to detail page */}
              <Link
                to={`/containers/${selected.container?.container_id ?? selected.container_id}`}
                className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                View Full Details <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
