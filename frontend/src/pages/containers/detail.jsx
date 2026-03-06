import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Zap, Loader2, ShieldAlert, ShieldCheck, AlertTriangle,
  Package, MapPin, Scale, DollarSign, Clock, Ship, FileText,
  User, Building, BarChart3, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import api from '../../lib/api';
import RiskBadge from '../../components/ui/RiskBadge';
import CountryFlag from '../../components/ui/CountryFlag';

const RISK_COLORS = { CLEAR: '#10b981', LOW_RISK: '#f59e0b', CRITICAL: '#ef4444' };

function RiskGauge({ score }) {
  const angle = (score / 100) * 180;
  const color = score >= 55 ? '#ef4444' : score >= 30 ? '#f59e0b' : '#10b981';
  const label = score >= 55 ? 'CRITICAL' : score >= 30 ? 'LOW RISK' : 'CLEAR';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 90" className="w-40 h-[90px]">
        {/* Background arc */}
        <path d="M15 80 A65 65 0 0 1 145 80" fill="none" stroke="hsl(var(--border))" strokeWidth="12" strokeLinecap="round" />
        {/* Green zone */}
        <path d="M15 80 A65 65 0 0 1 145 80" fill="none" stroke="#10b981" strokeWidth="12" strokeLinecap="round"
          strokeDasharray="61.2 204" opacity="0.15" />
        {/* Amber zone */}
        <path d="M15 80 A65 65 0 0 1 145 80" fill="none" stroke="#f59e0b" strokeWidth="12" strokeLinecap="round"
          strokeDasharray="51 204" strokeDashoffset="-61.2" opacity="0.15" />
        {/* Red zone */}
        <path d="M15 80 A65 65 0 0 1 145 80" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round"
          strokeDasharray="91.8 204" strokeDashoffset="-112.2" opacity="0.15" />
        {/* Active arc */}
        <path
          d="M15 80 A65 65 0 0 1 145 80"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 204} 204`}
          className="transition-all duration-1000 ease-out"
        />
        <text x="80" y="65" textAnchor="middle" fill={color} fontSize="28" fontWeight="700" className="tabular-nums">
          {Math.round(score)}
        </text>
        <text x="80" y="82" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">{label}</text>
      </svg>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, sub, iconColor }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className="text-sm font-semibold mt-0.5 truncate">{value ?? '—'}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SHAPChart({ contributions }) {
  if (!contributions || contributions.length === 0) return null;

  const data = contributions.slice(0, 8).map(c => ({
    feature: c.description || c.feature,
    value: c.contribution,
    fill: c.direction === 'increases_risk' ? '#ef4444' : '#10b981',
  })).reverse();

  return (
    <ResponsiveContainer width="100%" height={data.length * 34 + 20}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis
          type="category"
          dataKey="feature"
          width={160}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
          formatter={(v) => [v > 0 ? `+${v.toFixed(4)}` : v.toFixed(4), 'SHAP Impact']}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ContainerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['container', id],
    queryFn: () => api.get(`/containers/${id}`).then(r => r.data?.container ?? r.data),
  });

  const rescoreMutation = useMutation({
    mutationFn: () => api.post(`/predictions/re-score/${id}`),
    onSuccess: () => {
      toast.success('Container re-scored successfully');
      qc.invalidateQueries({ queryKey: ['container', id] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Re-score failed'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Container not found</p>
        <Link to="/containers" className="text-primary text-sm hover:underline mt-2 inline-block">
          Back to containers
        </Link>
      </div>
    );
  }

  const prediction = data.predictions?.[0] ?? null;
  const discPct = prediction?.weight_discrepancy_pct;
  const vpk = prediction?.value_per_kg;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-md border border-border hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold font-mono">{data.container_id}</h2>
            <p className="text-xs text-muted-foreground">
              Declared {data.declaration_date} &middot; {data.trade_regime}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {prediction && <RiskBadge level={prediction.risk_level} score={prediction.risk_score} showScore size="md" />}
          <button
            onClick={() => rescoreMutation.mutate()}
            disabled={rescoreMutation.isPending}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {rescoreMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Re-score
          </button>
        </div>
      </div>

      {/* Top section — Risk + Gauge */}
      {prediction && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gauge */}
          <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center justify-center">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Risk Score</p>
            <RiskGauge score={prediction.risk_score} />
          </div>

          {/* Explanation */}
          <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">AI Analysis</h3>
              <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded ${
                prediction.is_mock ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'
              }`}>
                {prediction.is_mock ? 'Mock Model' : prediction.model_version}
              </span>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{prediction.explanation_summary}</p>

            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {discPct != null && (
                <div className={`rounded-md p-3 ${discPct > 10 ? 'bg-red-500/5 border border-red-500/20' : 'bg-muted/40'}`}>
                  <p className="text-[10px] text-muted-foreground uppercase">Weight Discrepancy</p>
                  <p className={`text-lg font-bold tabular-nums ${discPct > 10 ? 'text-red-600' : 'text-foreground'}`}>
                    {discPct.toFixed(1)}%
                  </p>
                </div>
              )}
              {vpk != null && (
                <div className="rounded-md p-3 bg-muted/40">
                  <p className="text-[10px] text-muted-foreground uppercase">Value per kg</p>
                  <p className="text-lg font-bold tabular-nums">${vpk.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SHAP + Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SHAP Chart */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Feature Contributions (SHAP)</h3>
          </div>
          {prediction?.feature_contributions?.length > 0 ? (
            <>
              <SHAPChart contributions={prediction.feature_contributions} />
              <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Increases risk
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Decreases risk
                </span>
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              No SHAP data — run prediction first
            </div>
          )}
        </div>

        {/* Anomalies */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Anomalies Detected</h3>
          </div>
          {prediction?.anomalies?.length > 0 ? (
            <div className="space-y-3">
              {prediction.anomalies.map((a, i) => (
                <div
                  key={i}
                  className={`rounded-md border p-3.5 ${
                    a.severity === 'HIGH'
                      ? 'border-red-500/20 bg-red-500/5'
                      : 'border-amber-500/20 bg-amber-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold uppercase ${
                      a.severity === 'HIGH' ? 'text-red-600' : 'text-amber-600'
                    }`}>
                      {a.type?.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      a.severity === 'HIGH' ? 'bg-red-500/15 text-red-600' : 'bg-amber-500/15 text-amber-600'
                    }`}>
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/70 leading-relaxed">{a.description}</p>
                  {a.value != null && (
                    <p className="text-xs font-semibold tabular-nums mt-1.5">Value: {a.value}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
              <div className="text-center">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                <p>No anomalies detected</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Container Details Grid */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Shipment Details</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <InfoCard icon={MapPin} label="Origin" iconColor="bg-blue-500/10 text-blue-600"
            value={
              <span className="flex items-center gap-1.5">
                <CountryFlag code={data.origin_country} />
                {data.origin_country}
              </span>
            } />
          <InfoCard icon={MapPin} label="Destination" iconColor="bg-indigo-500/10 text-indigo-600"
            value={
              <span className="flex items-center gap-1.5">
                <CountryFlag code={data.destination_country} />
                {data.destination_country}
              </span>
            }
            sub={data.destination_port} />
          <InfoCard icon={Scale} label="Declared Weight" iconColor="bg-amber-500/10 text-amber-600"
            value={`${data.declared_weight?.toLocaleString()} kg`}
            sub={`Measured: ${data.measured_weight?.toLocaleString()} kg`} />
          <InfoCard icon={DollarSign} label="Declared Value" iconColor="bg-emerald-500/10 text-emerald-600"
            value={`$${data.declared_value?.toLocaleString()}`} />
          <InfoCard icon={Clock} label="Dwell Time" iconColor="bg-purple-500/10 text-purple-600"
            value={`${data.dwell_time_hours?.toFixed(1)} hours`}
            sub={data.dwell_time_hours > 72 ? 'Exceeds threshold' : 'Normal'} />
          <InfoCard icon={FileText} label="HS Code" iconColor="bg-slate-500/10 text-slate-600"
            value={data.hs_code} />
          <InfoCard icon={Ship} label="Shipping Line" iconColor="bg-cyan-500/10 text-cyan-600"
            value={data.shipping_line || '—'} />
          <InfoCard icon={Package} label="Trade Regime" iconColor="bg-pink-500/10 text-pink-600"
            value={data.trade_regime} />
        </div>
      </div>

      {/* Entity Info */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Entities</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-violet-500/10 text-violet-600">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Importer</p>
              <p className="text-sm font-semibold mt-0.5 font-mono">{data.importer_id || '—'}</p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-orange-500/10 text-orange-600">
              <Building className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Exporter</p>
              <p className="text-sm font-semibold mt-0.5 font-mono">{data.exporter_id || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span>Source: <strong className="text-foreground">{data.source}</strong></span>
          <span className="w-px h-3 bg-border" />
          <span>Created: <strong className="text-foreground">{new Date(data.created_at).toLocaleString()}</strong></span>
          {data.uploader && (
            <>
              <span className="w-px h-3 bg-border" />
              <span>Uploaded by: <strong className="text-foreground">{data.uploader.name}</strong></span>
            </>
          )}
          {prediction && (
            <>
              <span className="w-px h-3 bg-border" />
              <span>Last scored: <strong className="text-foreground">{new Date(prediction.created_at).toLocaleString()}</strong></span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
