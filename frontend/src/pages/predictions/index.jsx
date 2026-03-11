import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  Search, Filter, ChevronLeft, ChevronRight, Loader2, X,
  ShieldAlert, ShieldCheck, AlertTriangle, Download, Eye,
  ArrowUpRight, ArrowDownRight, TrendingUp, BarChart3, Zap, Award,
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
      <ResponsiveContainer width="100%" height={Math.min(data.length * 32 + 20, 220)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} />
          <YAxis
            type="category"
            dataKey="feature"
            width={110}
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
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

const EMPTY_FORM = {
  container_id: '',
  declared_weight: '',
  measured_weight: '',
  declared_value: '',
  dwell_time_hours: '',
  origin_country: '',
  hs_code: '',
  destination_port: '',
  destination_country: '',
  shipping_line: '',
  trade_regime: 'Import',
  importer_id: '',
  exporter_id: '',
};

function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

function inp(hasErr) {
  return `w-full h-8 rounded-md border ${hasErr ? 'border-red-500' : 'border-input'} bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring`;
}

function SinglePredictDialog({ onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(er => { const n = { ...er }; delete n[k]; return n; });
  };

  function validate() {
    const errs = {};
    if (!form.container_id.trim()) errs.container_id = 'Required';
    if (form.declared_weight === '' || isNaN(Number(form.declared_weight)) || Number(form.declared_weight) < 0) errs.declared_weight = 'Must be ≥ 0';
    if (form.measured_weight === '' || isNaN(Number(form.measured_weight)) || Number(form.measured_weight) < 0) errs.measured_weight = 'Must be ≥ 0';
    if (form.declared_value === '' || isNaN(Number(form.declared_value)) || Number(form.declared_value) < 0) errs.declared_value = 'Must be ≥ 0';
    if (form.dwell_time_hours === '' || isNaN(Number(form.dwell_time_hours)) || Number(form.dwell_time_hours) < 0) errs.dwell_time_hours = 'Must be ≥ 0';
    if (!form.origin_country.trim()) errs.origin_country = 'Required';
    if (!form.hs_code.trim()) errs.hs_code = 'Required';
    return errs;
  }

  const predictMutation = useMutation({
    mutationFn: async (payload) => {
      const r = await api.post('/predictions/raw', payload);
      return r.data?.data ?? r.data;
    },
    onSuccess: (data) => setResult(data),
    onError: (e) => toast.error(e.response?.data?.message ?? 'Prediction failed'),
  });

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    predictMutation.mutate({
      container_id: form.container_id.trim(),
      declared_weight: Number(form.declared_weight),
      measured_weight: Number(form.measured_weight),
      declared_value: Number(form.declared_value),
      dwell_time_hours: Number(form.dwell_time_hours),
      origin_country: form.origin_country.trim(),
      hs_code: form.hs_code.trim(),
      destination_port: form.destination_port.trim(),
      destination_country: form.destination_country.trim(),
      shipping_line: form.shipping_line.trim(),
      trade_regime: form.trade_regime || 'Import',
      importer_id: form.importer_id.trim(),
      exporter_id: form.exporter_id.trim(),
    });
  }

  const riskColor = result
    ? result.risk_level === 'CRITICAL' ? 'text-red-600' : result.risk_level === 'LOW_RISK' ? 'text-amber-600' : 'text-emerald-600'
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div
        className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Score Container — Raw Input</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Required fields */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Required Fields</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Container ID" required error={errors.container_id}>
                <input value={form.container_id} onChange={set('container_id')} placeholder="e.g. CONT_0001234"
                  className={inp(errors.container_id)} />
              </Field>
              <Field label="HS Code" required error={errors.hs_code}>
                <input value={form.hs_code} onChange={set('hs_code')} placeholder="e.g. 8471.30"
                  className={inp(errors.hs_code)} />
              </Field>
              <Field label="Origin Country" required error={errors.origin_country}>
                <input value={form.origin_country} onChange={set('origin_country')} placeholder="e.g. CN"
                  className={inp(errors.origin_country)} />
              </Field>
              <Field label="Dwell Time (hours)" required error={errors.dwell_time_hours}>
                <input value={form.dwell_time_hours} onChange={set('dwell_time_hours')} placeholder="e.g. 48"
                  type="number" min="0" className={inp(errors.dwell_time_hours)} />
              </Field>
              <Field label="Declared Weight (kg)" required error={errors.declared_weight}>
                <input value={form.declared_weight} onChange={set('declared_weight')} placeholder="e.g. 500"
                  type="number" min="0" className={inp(errors.declared_weight)} />
              </Field>
              <Field label="Measured Weight (kg)" required error={errors.measured_weight}>
                <input value={form.measured_weight} onChange={set('measured_weight')} placeholder="e.g. 520"
                  type="number" min="0" className={inp(errors.measured_weight)} />
              </Field>
              <div className="col-span-2">
                <Field label="Declared Value (USD)" required error={errors.declared_value}>
                  <input value={form.declared_value} onChange={set('declared_value')} placeholder="e.g. 15000"
                    type="number" min="0" className={inp(errors.declared_value)} />
                </Field>
              </div>
            </div>
          </div>

          {/* Optional fields */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">Optional Fields</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Destination Country">
                <input value={form.destination_country} onChange={set('destination_country')} placeholder="e.g. US"
                  className={inp(false)} />
              </Field>
              <Field label="Destination Port">
                <input value={form.destination_port} onChange={set('destination_port')} placeholder="e.g. Los Angeles"
                  className={inp(false)} />
              </Field>
              <Field label="Shipping Line">
                <input value={form.shipping_line} onChange={set('shipping_line')} placeholder="e.g. MAERSK"
                  className={inp(false)} />
              </Field>
              <Field label="Trade Regime">
                <select value={form.trade_regime} onChange={set('trade_regime')} className={inp(false)}>
                  <option>Import</option>
                  <option>Export</option>
                  <option>Transit</option>
                </select>
              </Field>
              <Field label="Importer ID">
                <input value={form.importer_id} onChange={set('importer_id')} placeholder="e.g. IMP_00123"
                  className={inp(false)} />
              </Field>
              <Field label="Exporter ID">
                <input value={form.exporter_id} onChange={set('exporter_id')} placeholder="e.g. EXP_00456"
                  className={inp(false)} />
              </Field>
            </div>
          </div>

          {/* Result panel */}
          {result && (
            <div className={`rounded-lg border p-4 space-y-3 ${
              result.risk_level === 'CRITICAL' ? 'border-red-500/30 bg-red-500/5'
                : result.risk_level === 'LOW_RISK' ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-emerald-500/30 bg-emerald-500/5'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Prediction Result</p>
                  <p className={`text-3xl font-bold tabular-nums ${riskColor}`}>{Math.round(result.risk_score)}<span className="text-sm font-normal ml-1">/100</span></p>
                  <p className={`text-xs font-semibold mt-0.5 ${riskColor}`}>{result.risk_level?.replace('_', ' ')}</p>
                </div>
                <RiskGauge score={result.risk_score} />
              </div>
              {result.explanation_summary && (
                <p className="text-xs text-foreground/70 leading-relaxed border-t border-border/40 pt-2">{result.explanation_summary}</p>
              )}
              {result.anomalies && result.anomalies.length > 0 && (
                <div className="space-y-1.5 border-t border-border/40 pt-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Anomalies</p>
                  {result.anomalies.map((a, i) => (
                    <div key={i} className={`rounded px-2.5 py-1.5 text-xs ${a.severity === 'HIGH' ? 'bg-red-500/10 text-red-700 dark:text-red-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
                      {a.description}
                    </div>
                  ))}
                </div>
              )}
              {result.feature_contributions && result.feature_contributions.length > 0 && (
                <div className="border-t border-border/40 pt-2 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Top Risk Factors</p>
                  {result.feature_contributions.slice(0, 4).map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.direction === 'increases_risk' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      <span className="text-xs text-foreground/70 truncate">{c.description || c.feature}</span>
                      <span className={`text-[10px] font-mono ml-auto shrink-0 ${c.direction === 'increases_risk' ? 'text-red-500' : 'text-emerald-500'}`}>
                        {c.contribution > 0 ? '+' : ''}{c.contribution.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                {result.is_mock ? 'Rule-based mock model' : `Model: ${result.model_version}`}
                {result.weight_discrepancy_pct != null && ` · Weight discrepancy: ${result.weight_discrepancy_pct.toFixed(1)}%`}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={() => { setResult(null); setForm(EMPTY_FORM); setErrors({}); }}
            className="h-9 px-4 rounded-md border border-border text-sm hover:bg-muted transition-colors">
            Reset
          </button>
          <button onClick={onClose}
            className="h-9 px-4 rounded-md border border-border text-sm hover:bg-muted transition-colors">
            Close
          </button>
          <button
            onClick={handleSubmit}
            disabled={predictMutation.isPending}
            className="ml-auto h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-2 transition-colors">
            {predictMutation.isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Predicting…</>
              : <><Zap className="w-3.5 h-3.5" /> Run Prediction</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Predictions() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showSinglePredict, setShowSinglePredict] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['predictions', 'list', page, riskFilter, search],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 15 });
      if (riskFilter !== 'ALL') params.set('risk_level', riskFilter);
      if (search.trim()) params.set('search', search.trim());
      return api.get(`/predictions?${params}`).then(r => r.data);
    },
    placeholderData: (previousData) => previousData,
    refetchInterval: 10_000,
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

  const { data: analytics } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => api.get('/analytics/summary').then(r => r.data),
    staleTime: 30_000,
  });

  return (
    <div className={`space-y-5 animate-fade-in transition-all duration-300 ${selected ? 'sm:pr-[500px]' : ''}`}>
      {/* Global Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Critical', count: analytics?.risk_distribution?.CRITICAL, iconCls: 'text-red-600 bg-red-500/10', borderCls: 'border-red-500/20', Icon: ShieldAlert },
          { label: 'Low Risk', count: analytics?.risk_distribution?.LOW_RISK,  iconCls: 'text-amber-600 bg-amber-500/10', borderCls: 'border-amber-500/20', Icon: AlertTriangle },
          { label: 'Clear',    count: analytics?.risk_distribution?.CLEAR,     iconCls: 'text-emerald-600 bg-emerald-500/10', borderCls: 'border-emerald-500/20', Icon: ShieldCheck },
        ].map(s => (
          <div key={s.label} className={`rounded-lg border bg-card p-4 flex items-center gap-3 ${s.borderCls}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.iconCls}`}>
              <s.Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums">
                {s.count != null ? s.count.toLocaleString() : <span className="text-muted-foreground/40 text-base">—</span>}
              </p>
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
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors border ${riskFilter === l
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                }`}
            >
              {l.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 font-medium">
            <Award className="w-3.5 h-3.5" />
            xgb-v2.0 · 97.26% accuracy
          </div>
          <button
            onClick={() => setShowSinglePredict(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-primary/40 text-primary rounded-md hover:bg-primary/5 transition-colors font-medium"
          >
            <Zap className="w-3.5 h-3.5" />
            Score Single
          </button>
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
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Container ID', 'Origin', 'Destination', 'Importer', 'Risk Score', 'Risk Level', 'Top SHAP Factor', 'Model', 'Date', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <tr key={i}>{Array(10).fill(0).map((__, j) => (
                  <td key={j} className="px-4 py-3"><div className="h-4 bg-muted rounded animate-pulse" /></td>
                ))}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-muted-foreground" />
                    </div>
                    {search || riskFilter !== 'ALL' ? (
                      <>
                        <p className="font-semibold text-sm">No predictions match your filters</p>
                        <button onClick={() => { setSearch(''); setRiskFilter('ALL'); setPage(1); }}
                          className="text-xs text-primary hover:underline font-medium">Clear filters</button>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-sm">No predictions yet</p>
                        <p className="text-xs text-muted-foreground max-w-xs">Upload containers and run a batch prediction job to see results here.</p>
                        <div className="flex gap-2 mt-1">
                          <Link to="/upload" className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg shadow shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5" /> Upload & Predict
                          </Link>
                          <Link to="/jobs" className="border border-border bg-card text-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-muted transition-all flex items-center gap-1.5">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Run Batch Job
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
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
                    <span className={`text-sm font-bold tabular-nums ${p.risk_score >= 55 ? 'text-red-600' : p.risk_score >= 30 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                      {Math.round(p.risk_score)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={p.risk_level} />
                  </td>
                  <td className="px-4 py-3 max-w-[150px]">
                    {p.feature_contributions && p.feature_contributions.length > 0 ? (
                      <span className="flex items-center gap-1 text-xs">
                        {p.feature_contributions[0].direction === 'increases_risk'
                          ? <ArrowUpRight className="w-3 h-3 text-red-500 shrink-0" />
                          : <ArrowDownRight className="w-3 h-3 text-emerald-500 shrink-0" />}
                        <span className="truncate text-muted-foreground" title={p.feature_contributions[0].description || p.feature_contributions[0].feature}>
                          {p.feature_contributions[0].description || p.feature_contributions[0].feature}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${p.is_mock ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'
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
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 top-14 z-30"
              style={{ right: '500px' }}
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.8 }}
              className="fixed right-0 top-14 bottom-0 w-full sm:w-[500px] bg-card border-l border-border shadow-xl z-40 overflow-y-auto"
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
                      className={`rounded-md border p-3 ${a.severity === 'HIGH'
                          ? 'border-red-500/20 bg-red-500/5'
                          : 'border-amber-500/20 bg-amber-500/5'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${a.severity === 'HIGH' ? 'text-red-600' : 'text-amber-600'
                          }`}>
                          {a.type?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${a.severity === 'HIGH' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
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
          </motion.div>
        </>
        )}
      </AnimatePresence>

      {/* Single Predict Dialog */}
      {showSinglePredict && <SinglePredictDialog onClose={() => setShowSinglePredict(false)} />}
    </div>
  );
}
