import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line, Legend,
} from 'recharts';
import api from '../../lib/api';
import RiskBadge from '../../components/ui/RiskBadge';

const TREND_PERIODS = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];
const RISK_COLORS = { CLEAR: '#10b981', LOW_RISK: '#f59e0b', CRITICAL: '#ef4444' };

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
    <div className={`rounded-lg border border-border bg-card p-5 ${className}`}>
      {children}
    </div>
  );
}

export default function Insights() {
  const [period, setPeriod] = useState('30d');

  const { data: trends, isLoading: trendLoad } = useQuery({
    queryKey: ['analytics', 'trends', period],
    queryFn: () => api.get(`/analytics/trends?period=${period}`).then(r => r.data),
  });

  const { data: countryRisk } = useQuery({
    queryKey: ['analytics', 'country-risk'],
    queryFn: () => api.get('/analytics/country-risk').then(r => r.data),
  });

  const { data: anomaly } = useQuery({
    queryKey: ['analytics', 'anomaly-frequency'],
    queryFn: () => api.get('/analytics/anomaly-frequency').then(r => r.data),
  });

  const { data: scatter } = useQuery({
    queryKey: ['analytics', 'value-weight-scatter'],
    queryFn: () => api.get('/analytics/value-weight-scatter').then(r => r.data),
  });

  const { data: tradeRoutes } = useQuery({
    queryKey: ['analytics', 'trade-routes'],
    queryFn: () => api.get('/analytics/trade-routes').then(r => r.data),
  });

  const { data: topImporters } = useQuery({
    queryKey: ['analytics', 'top-shippers', 'importer'],
    queryFn: () => api.get('/analytics/top-risky-shippers?type=importer&limit=8').then(r => r.data),
  });

  const { data: topExporters } = useQuery({
    queryKey: ['analytics', 'top-shippers', 'exporter'],
    queryFn: () => api.get('/analytics/top-risky-shippers?type=exporter&limit=8').then(r => r.data),
  });

  const toolTipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 6,
    fontSize: 12,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Risk Trends */}
      <ChartCard>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Risk Trends Over Time" sub="Predictions by risk level" />
          <div className="flex items-center gap-1">
            {TREND_PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors border ${
                  period === p.value
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
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trends ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={toolTipStyle} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {Object.entries(RISK_COLORS).map(([key, color]) => (
                <Line key={key} type="monotone" dataKey={key} name={key}
                  stroke={color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Anomaly Frequency + Country Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard>
          <SectionHeader title="Anomaly Frequency" sub="Top anomaly features detected" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={anomaly ?? []} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis dataKey="feature" type="category" width={110}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={toolTipStyle} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard>
          <SectionHeader title="Country Risk Overview" sub="Average risk score by origin country" />
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
                {(countryRisk ?? []).map((c, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="py-2 font-medium">{c.origin_country}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{c.total}</td>
                    <td className="py-2 text-right tabular-nums font-semibold">
                      <span className={`${c.avg_risk_score >= 70 ? 'text-red-600' : c.avg_risk_score >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {c.avg_risk_score}
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-red-600">{c.critical_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* Value vs Weight Scatter */}
      <ChartCard>
        <SectionHeader title="Declared Value vs Weight" sub="Scatter analysis — divergent points may indicate misdeclaration" />
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="weight_kg" name="Weight (kg)" type="number"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis dataKey="declared_value_usd" name="Value (USD)" type="number"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip contentStyle={toolTipStyle} formatter={(v, n) => [v?.toLocaleString(), n]} />
            {Object.entries(RISK_COLORS).map(([key, color]) => (
              <Scatter
                key={key}
                name={key}
                data={(scatter ?? []).filter(d => d.risk_level === key)}
                fill={color}
                fillOpacity={0.6}
              />
            ))}
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top Shippers + Trade Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Importers / Exporters */}
        <ChartCard>
          <SectionHeader title="Top Risky Importers" sub="By average risk score" />
          <div className="space-y-2">
            {(topImporters ?? []).map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium truncate">{s.shipper_id}</span>
                    <span className={`text-xs font-semibold tabular-nums ${
                      s.avg_risk_score >= 70 ? 'text-red-600' : s.avg_risk_score >= 40 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>{s.avg_risk_score}</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${s.avg_risk_score}%`,
                        background: s.avg_risk_score >= 70 ? '#ef4444' : s.avg_risk_score >= 40 ? '#f59e0b' : '#10b981',
                      }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Trade Routes */}
        <ChartCard>
          <SectionHeader title="Trade Routes" sub="Volume by origin → destination" />
          <div className="overflow-auto max-h-56">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Route</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Count</th>
                  <th className="text-right py-2 text-muted-foreground font-medium">Avg Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(tradeRoutes ?? []).map((r, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="py-2 font-medium">{r.origin_country} → {r.destination_country}</td>
                    <td className="py-2 text-right tabular-nums text-muted-foreground">{r.total}</td>
                    <td className="py-2 text-right tabular-nums">
                      <span className={`font-semibold ${r.avg_risk_score >= 70 ? 'text-red-600' : r.avg_risk_score >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {r.avg_risk_score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* Top Exporters */}
      <ChartCard>
        <SectionHeader title="Top Risky Exporters" sub="Horizontal bar — by average risk score" />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={topExporters ?? []} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis dataKey="shipper_id" type="category" width={120}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip contentStyle={toolTipStyle} />
            <Bar dataKey="avg_risk_score" name="Avg Risk Score" fill="#ef4444" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
