import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line, Legend,
} from 'recharts';
import api from '../../lib/api';
import CountryFlag, { getCountryName } from '../../components/ui/CountryFlag';

const TREND_PERIODS = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];
const RISK_COLORS = { CLEAR: '#10b981', LOW_RISK: '#f59e0b', CRITICAL: '#ef4444' };

const toolTipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)',
};

function SectionHeader({ title, sub }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      {children}
    </div>
  );
}

function EmptyChart({ message = 'No data yet — run predictions first' }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-muted-foreground/60 italic">
      {message}
    </div>
  );
}

export default function Insights() {
  const [period, setPeriod] = useState('30d');

  const { data: summary } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => api.get('/analytics/summary').then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: trends, isLoading: trendLoad } = useQuery({
    queryKey: ['analytics', 'trends', period],
    queryFn: () => api.get(`/analytics/trends?period=${period}`).then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: countryRisk } = useQuery({
    queryKey: ['analytics', 'country-risk'],
    queryFn: () => api.get('/analytics/country-risk').then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: anomaly } = useQuery({
    queryKey: ['analytics', 'anomaly-frequency'],
    queryFn: () => api.get('/analytics/anomaly-frequency').then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: scatter } = useQuery({
    queryKey: ['analytics', 'value-weight-scatter'],
    queryFn: () => api.get('/analytics/value-weight-scatter').then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: tradeRoutes } = useQuery({
    queryKey: ['analytics', 'trade-routes'],
    queryFn: () => api.get('/analytics/trade-routes').then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: topImporters } = useQuery({
    queryKey: ['analytics', 'top-shippers', 'importer'],
    queryFn: () => api.get('/analytics/top-risky-shippers?type=importer&limit=8').then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: topExporters } = useQuery({
    queryKey: ['analytics', 'top-shippers', 'exporter'],
    queryFn: () => api.get('/analytics/top-risky-shippers?type=exporter&limit=8').then(r => r.data),
    refetchInterval: 60_000,
  });

  // Scatter: API returns { value, weight, risk_level, risk_score }
  const scatterData = scatter ?? [];

  const total = summary?.total_predictions ?? 0;
  const dist = summary?.risk_distribution ?? {};
  const critical = dist.CRITICAL ?? 0;
  const low = dist.LOW_RISK ?? 0;
  const clear = dist.CLEAR ?? 0;
  const pct = (n) => total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '—';

  const kpiCards = [
    {
      label: 'Total Predictions',
      value: total.toLocaleString(),
      sub: 'all-time',
      icon: Activity,
      colorClass: 'bg-blue-500/10 text-blue-500',
      gradientClass: 'bg-blue-500',
    },
    {
      label: 'Critical',
      value: critical.toLocaleString(),
      sub: pct(critical),
      icon: ShieldAlert,
      colorClass: 'bg-red-500/10 text-red-500',
      gradientClass: 'bg-red-500',
    },
    {
      label: 'Low Risk',
      value: low.toLocaleString(),
      sub: pct(low),
      icon: AlertTriangle,
      colorClass: 'bg-amber-500/10 text-amber-500',
      gradientClass: 'bg-amber-500',
    },
    {
      label: 'Clear',
      value: clear.toLocaleString(),
      sub: pct(clear),
      icon: ShieldCheck,
      colorClass: 'bg-emerald-500/10 text-emerald-500',
      gradientClass: 'bg-emerald-500',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trade Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">Predictive risk analytics across all monitored shipments</p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map(({ label, value, sub, icon: Icon, colorClass, gradientClass }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            whileHover={{ y: -4, transition: { duration: 0.18 } }}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all flex flex-col justify-between group"
          >
            <div className={`absolute -right-8 -top-8 w-28 h-28 rounded-full blur-3xl opacity-15 transition-opacity group-hover:opacity-30 ${gradientClass}`} />
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
                <h3 className="text-3xl font-bold tracking-tight tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                  {value ?? '—'}
                </h3>
                {sub && (
                  <p className="text-xs text-muted-foreground mt-2 font-medium bg-secondary/50 inline-flex px-2 py-0.5 rounded-full">{sub}</p>
                )}
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${colorClass}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Risk Trends */}
      <ChartCard>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Risk Classification Trends" sub="Daily prediction volume by risk level" />
          <div className="flex items-center gap-1">
            {TREND_PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors border ${period === p.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                  }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {trendLoad ? (
          <div className="h-56 animate-pulse bg-muted rounded-md" />
        ) : (trends ?? []).length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trends} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={toolTipStyle} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {Object.entries(RISK_COLORS).map(([key, color]) => (
                <Line key={key} type="monotone" dataKey={key} name={key.replace('_', ' ')}
                  stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Anomaly Frequency + Country Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard>
          <SectionHeader title="Anomaly Frequency" sub="Top anomaly types detected by ML model" />
          {/* API returns { anomaly: string, count: number } */}
          {(anomaly ?? []).length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={anomaly} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} />
                <YAxis
                  dataKey="anomaly"
                  type="category"
                  width={130}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={v => v?.replace(/_/g, ' ') ?? ''}
                />
                <Tooltip contentStyle={toolTipStyle} />
                <Bar dataKey="count" name="Occurrences" fill="#6366f1" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard>
          <SectionHeader title="Country Risk Overview" sub="Average risk score by origin country" />
          {/* API returns { country, total, avg_risk_score, critical_count } */}
          {(countryRisk ?? []).length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="overflow-auto max-h-56">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Country</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Containers</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Avg Score</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Critical</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {countryRisk.map((c, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="py-2 font-medium flex items-center gap-2">
                        <CountryFlag code={c.country} size="sm" />
                        {getCountryName(c.country)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">{c.total}</td>
                      <td className="py-2 text-right tabular-nums font-semibold">
                        <span className={`${Number(c.avg_risk_score) >= 70 ? 'text-red-600' : Number(c.avg_risk_score) >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {Number(c.avg_risk_score).toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums text-red-600">{c.critical_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Value vs Weight Scatter — API: { value, weight, risk_level, risk_score } */}
      <ChartCard>
        <SectionHeader title="Declared Value vs Weight Analysis" sub="Scatter analysis — divergent points indicate potential misdeclaration" />
        {scatterData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="weight" name="Weight (kg)" type="number"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                label={{ value: 'Weight (kg)', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis dataKey="value" name="Declared Value (USD)" type="number"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={toolTipStyle}
                formatter={(v, n) => [v?.toLocaleString(), n]}
              />
              {Object.entries(RISK_COLORS).map(([key, color]) => (
                <Scatter
                  key={key}
                  name={key.replace('_', ' ')}
                  data={scatterData.filter(d => d.risk_level === key)}
                  fill={color}
                  fillOpacity={0.65}
                  shape="circle"
                />
              ))}
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Top Importers + Trade Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard>
          <SectionHeader title="Top Risky Importers" sub="Ranked by average risk score · critical shipments flagged" />
          {(topImporters ?? []).length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="space-y-2.5">
              {topImporters.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4 tabular-nums shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium truncate">{s.shipper_id}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {Number(s.critical_count) > 0 && (
                          <span className="text-[10px] font-semibold text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                            {s.critical_count} crit
                          </span>
                        )}
                        <span className={`text-xs font-semibold tabular-nums ${Number(s.avg_risk_score) >= 70 ? 'text-red-600' : Number(s.avg_risk_score) >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {Number(s.avg_risk_score).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(Number(s.avg_risk_score), 100)}%`,
                          background: Number(s.avg_risk_score) >= 70 ? '#ef4444' : Number(s.avg_risk_score) >= 40 ? '#f59e0b' : '#10b981',
                        }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.total_shipments} shipment{s.total_shipments !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard>
          <SectionHeader title="Trade Routes" sub="Top shipment corridors by volume" />
          {/* API: { origin, destination, count } */}
          {(tradeRoutes ?? []).length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="overflow-auto max-h-56">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Origin</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Destination</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Shipments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tradeRoutes.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="py-2 font-medium">
                        <div className="flex items-center gap-1.5">
                          <CountryFlag code={r.origin} size="sm" />
                          <span>{getCountryName(r.origin)}</span>
                        </div>
                      </td>
                      <td className="py-2 font-medium">
                        <div className="flex items-center gap-1.5">
                          <CountryFlag code={r.destination} size="sm" />
                          <span>{getCountryName(r.destination)}</span>
                        </div>
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">{r.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Top Exporters — ranked list matching importer style */}
      <ChartCard>
        <SectionHeader title="Top Risky Exporters" sub="Ranked by average risk score · critical shipments flagged" />
        {(topExporters ?? []).length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {topExporters.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 tabular-nums shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium truncate">{s.shipper_id}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {Number(s.critical_count) > 0 && (
                        <span className="text-[10px] font-semibold text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                          {s.critical_count} crit
                        </span>
                      )}
                      <span className={`text-xs font-semibold tabular-nums ${Number(s.avg_risk_score) >= 70 ? 'text-red-600' : Number(s.avg_risk_score) >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {Number(s.avg_risk_score).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(Number(s.avg_risk_score), 100)}%`,
                        background: Number(s.avg_risk_score) >= 70 ? '#ef4444' : Number(s.avg_risk_score) >= 40 ? '#f59e0b' : '#10b981',
                      }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.total_shipments} shipment{s.total_shipments !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
