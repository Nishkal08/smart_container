import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from 'recharts';
import { Package, ShieldAlert, CheckCircle, TrendingUp, ArrowRight, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import RiskBadge from '../../components/ui/RiskBadge';
import CountryFlag from '../../components/ui/CountryFlag';

const PIE_COLORS = { CLEAR: '#10b981', LOW_RISK: '#f59e0b', CRITICAL: '#ef4444' };

function StatCard({ label, value, sub, icon: Icon, iconClass }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-semibold tabular-nums mt-1">{value ?? '—'}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="rounded-lg border border-border bg-card h-24 animate-pulse" />;
}

export default function Dashboard() {
  const { data: summary, isLoading: sumLoad } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => api.get('/analytics/summary').then(r => r.data),
  });

  const { data: trends, isLoading: trendLoad } = useQuery({
    queryKey: ['analytics', 'trends', '30d'],
    queryFn: () => api.get('/analytics/trends?period=30d').then(r => r.data),
  });

  const { data: distribution, isLoading: distLoad } = useQuery({
    queryKey: ['analytics', 'risk-distribution'],
    queryFn: () => api.get('/analytics/risk-distribution').then(r => r.data),
  });

  const { data: topShippers } = useQuery({
    queryKey: ['analytics', 'top-shippers'],
    queryFn: () => api.get('/analytics/top-risky-shippers?limit=5').then(r => r.data),
  });

  const { data: recentPredictions } = useQuery({
    queryKey: ['predictions', 'recent'],
    queryFn: () => api.get('/predictions?page=1&limit=5&sortBy=created_at&order=desc').then(r => r.data),
  });

  const { data: countryRisk } = useQuery({
    queryKey: ['analytics', 'country-risk'],
    queryFn: () => api.get('/analytics/country-risk?limit=6').then(r => r.data),
  });

  const pieData = distribution
    ? Object.entries(PIE_COLORS).map(([key, color]) => ({
        name: key.replace('_', ' '),
        value: distribution.find(d => d.risk_level === key)?.count ?? 0,
        color,
      })).filter(d => d.value > 0)
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sumLoad ? (
          Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Containers" value={summary?.total_containers?.toLocaleString()}
              sub="All time" icon={Package} iconClass="bg-blue-500/10 text-blue-600" />
            <StatCard label="Avg Risk Score" value={summary?.avg_risk_score}
              sub="Out of 100" icon={TrendingUp} iconClass="bg-amber-500/10 text-amber-600" />
            <StatCard label="Critical Alerts" value={summary?.risk_distribution?.CRITICAL?.toLocaleString()}
              sub={`${summary?.critical_today ?? 0} today`} icon={ShieldAlert} iconClass="bg-red-500/10 text-red-600" />
            <StatCard label="Clear" value={summary?.risk_distribution?.CLEAR?.toLocaleString()}
              sub="No action needed" icon={CheckCircle} iconClass="bg-emerald-500/10 text-emerald-600" />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Chart */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Risk Trends</h3>
              <p className="text-xs text-muted-foreground">Last 30 days by category</p>
            </div>
          </div>
          {trendLoad ? (
            <div className="h-52 animate-pulse bg-muted rounded-md" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={trends ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  {Object.entries(PIE_COLORS).map(([key, color]) => (
                    <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
                {Object.entries(PIE_COLORS).map(([key, color]) => (
                  <Area key={key} type="monotone" dataKey={key} name={key}
                    stroke={color} fill={`url(#grad-${key})`} strokeWidth={1.5} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut Chart */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-1">Risk Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">All predictions</p>
          {distLoad ? (
            <div className="h-52 animate-pulse bg-muted rounded-md" />
          ) : pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
                <Tooltip formatter={(v) => [v.toLocaleString(), 'Containers']}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">No prediction data yet</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Risky Shippers */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Top Risky Shippers</h3>
            <Link to="/predictions" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(topShippers ?? []).slice(0, 5).map((s, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-muted-foreground w-4 shrink-0 tabular-nums">{i + 1}</span>
                  <span className="text-sm font-medium truncate">{s.shipper_id}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums">{s.total_shipments} ships</span>
                  <span className={`text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded ${
                    s.avg_risk_score >= 70 ? 'bg-red-500/10 text-red-600' :
                    s.avg_risk_score >= 40 ? 'bg-amber-500/10 text-amber-600' :
                    'bg-emerald-500/10 text-emerald-600'
                  }`}>{s.avg_risk_score}</span>
                </div>
              </div>
            ))}
            {!topShippers && Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-11 mx-5 my-1 animate-pulse bg-muted rounded" />
            ))}
          </div>
        </div>

        {/* Recent Predictions */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Recent Predictions</h3>
            <Link to="/predictions" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(recentPredictions?.predictions ?? recentPredictions?.items ?? []).slice(0, 5).map((p, i) => (
              <Link key={i} to={`/containers/${p.container?.id ?? p.container_id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CountryFlag code={p.container?.origin_country} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-medium truncate">{p.container?.container_id ?? p.container_id}</p>
                    <p className="text-xs text-muted-foreground">{p.explanation_summary?.slice(0, 40)}...</p>
                  </div>
                </div>
                <div className="shrink-0 ml-3">
                  <RiskBadge level={p.risk_level} score={p.risk_score} showScore />
                </div>
              </Link>
            ))}
            {!recentPredictions && Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-14 mx-5 my-1 animate-pulse bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
