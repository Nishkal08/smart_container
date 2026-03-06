import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from 'recharts';
import { Package, ShieldAlert, CheckCircle, TrendingUp, ArrowRight, AlertTriangle, Activity, Globe, DollarSign } from 'lucide-react';

function formatDeclaredValue(val) {
  if (!val) return '$0';
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${Math.round(val).toLocaleString()}`;
}
import api from '../../lib/api';
import RiskBadge from '../../components/ui/RiskBadge';
import CountryFlag, { getCountryName } from '../../components/ui/CountryFlag';

const PIE_COLORS = { CLEAR: '#10b981', LOW_RISK: '#f59e0b', CRITICAL: '#ef4444' };

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

function StatCard({ label, value, sub, icon: Icon, colorClass, gradientClass }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all flex flex-col justify-between group"
    >
      <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40 ${gradientClass}`} />
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold tracking-tight tabular-nums bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
              {value ?? '—'}
            </h3>
          </div>
          {sub && <p className="text-xs text-muted-foreground mt-2 font-medium bg-secondary/50 inline-flex px-2 py-0.5 rounded-full">{sub}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md h-32 animate-pulse" />;
}

export default function Dashboard() {
  const { data: summary, isLoading: sumLoad } = useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: () => api.get('/analytics/summary').then(r => r.data),
    refetchInterval: 15_000,
  });

  const { data: trends, isLoading: trendLoad } = useQuery({
    queryKey: ['analytics', 'trends', '30d'],
    queryFn: () => api.get('/analytics/trends?period=30d').then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: distribution, isLoading: distLoad } = useQuery({
    queryKey: ['analytics', 'risk-distribution'],
    queryFn: () => api.get('/analytics/risk-distribution').then(r => r.data),
    refetchInterval: 15_000,
  });

  const { data: topShippers } = useQuery({
    queryKey: ['analytics', 'top-shippers'],
    queryFn: () => api.get('/analytics/top-risky-shippers?limit=5').then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: countryRisk } = useQuery({
    queryKey: ['analytics', 'country-risk'],
    queryFn: () => api.get('/analytics/country-risk?limit=5').then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: recentPredictions } = useQuery({
    queryKey: ['predictions', 'recent'],
    queryFn: () => api.get('/predictions?page=1&limit=5').then(r => r.data),
    refetchInterval: 10_000,
  });

  const pieData = distribution && Array.isArray(distribution)
    ? Object.entries(PIE_COLORS).map(([key, color]) => ({
      name: key.replace('_', ' '),
      value: distribution.find(d => d.risk_level === key)?.count ?? 0,
      color,
    })).filter(d => d.value > 0)
    : [];

  const isEmpty = !sumLoad && summary !== undefined && (summary?.total_containers ?? 0) === 0;
  const noPredictions = !sumLoad && !isEmpty && (summary?.total_predictions ?? 0) === 0;

  if (isEmpty) {
    const steps = [
      {
        step: '01',
        icon: Package,
        title: 'Import Container Data',
        desc: 'Upload a CSV of container manifests or add entries manually. Each record includes shipper, origin, declared value, and cargo details.',
        action: { label: 'Upload CSV', to: '/upload' },
        color: 'blue',
      },
      {
        step: '02',
        icon: ShieldAlert,
        title: 'Run Risk Predictions',
        desc: 'Trigger the XGBoost ML engine on your containers via a Batch Job. Scores each container 0–100 and classifies it as CRITICAL, LOW_RISK, or CLEAR.',
        action: { label: 'New Batch Job', to: '/jobs' },
        color: 'violet',
      },
      {
        step: '03',
        icon: Activity,
        title: 'Analyze & Act',
        desc: 'Explore SHAP-based explanations, country heatmaps, shipper risk profiles, and daily trend charts right here on the dashboard.',
        action: { label: 'View Analytics', to: '/analytics' },
        color: 'emerald',
      },
    ];

    const colorMap = {
      blue: {
        ring: 'ring-blue-500/30',
        bg: 'bg-blue-500/10',
        text: 'text-blue-600 dark:text-blue-400',
        glow: 'bg-blue-500',
        btn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
        step: 'text-blue-500/40',
      },
      violet: {
        ring: 'ring-violet-500/30',
        bg: 'bg-violet-500/10',
        text: 'text-violet-600 dark:text-violet-400',
        glow: 'bg-violet-500',
        btn: 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/20',
        step: 'text-violet-500/40',
      },
      emerald: {
        ring: 'ring-emerald-500/30',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-600 dark:text-emerald-400',
        glow: 'bg-emerald-500',
        btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20',
        step: 'text-emerald-500/40',
      },
    };

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="max-w-[1200px] mx-auto pb-16 px-2"
      >
        {/* Hero */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl mt-2 mb-8 shadow-xl"
        >
          {/* Decorative blobs */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 px-8 py-10 md:py-12">
            {/* Left */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/8 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Operations Center — Ready
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/90 to-foreground/60 mb-3">
                Welcome to<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                  SmartContainer
                </span>
              </h1>
              <p className="text-muted-foreground text-base max-w-lg mx-auto md:mx-0 leading-relaxed mb-7">
                AI-powered container risk intelligence. Import shipment manifests, run XGBoost predictions, and monitor risk across your entire supply chain — in real time.
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Link
                  to="/upload"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-lg shadow-primary/30 transition-all active:scale-95 flex items-center gap-2 text-sm"
                >
                  <Package className="w-4 h-4" /> Upload CSV
                </Link>
                <Link
                  to="/jobs"
                  className="border border-border bg-card/80 hover:bg-muted text-foreground font-semibold px-6 py-3 rounded-xl transition-all active:scale-95 flex items-center gap-2 text-sm"
                >
                  <Activity className="w-4 h-4" /> New Batch Job
                </Link>
              </div>
            </div>

            {/* Right — zero-state stat preview */}
            <div className="shrink-0 w-full md:w-72 grid grid-cols-2 gap-3">
              {[
                { label: 'Total Containers', value: '0', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Predictions Run', value: '0', icon: Activity, color: 'text-violet-500', bg: 'bg-violet-500/10' },
                { label: 'Critical Flags', value: '0', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                { label: 'Avg Risk Score', value: '—', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur p-4 flex flex-col gap-2">
                  <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-2xl font-extrabold tabular-nums tracking-tight">{value}</p>
                  <p className="text-[11px] text-muted-foreground font-medium leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Steps */}
        <div className="mb-6">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-5 px-1">Get Started in 3 Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {steps.map(({ step, icon: Icon, title, desc, action, color }) => {
              const c = colorMap[color];
              return (
                <motion.div
                  key={step}
                  variants={itemVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className={`relative overflow-hidden rounded-2xl border border-border/50 bg-card/70 backdrop-blur-xl p-6 ring-1 ${c.ring} shadow-sm flex flex-col`}
                >
                  <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-30 ${c.glow}`} />
                  <div className="flex items-start justify-between mb-5 relative z-10">
                    <div className={`w-11 h-11 rounded-2xl ${c.bg} flex items-center justify-center shadow-inner`}>
                      <Icon className={`w-5 h-5 ${c.text}`} />
                    </div>
                    <span className={`text-4xl font-black tabular-nums tracking-tighter ${c.step}`}>{step}</span>
                  </div>
                  <div className="flex-1 relative z-10">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${c.text}`}>Step {step}</p>
                    <h3 className="text-base font-bold mb-2 leading-snug">{title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                  <Link
                    to={action.to}
                    className={`mt-5 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 ${c.btn} relative z-10`}
                  >
                    {action.label} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Feature highlights */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/40 bg-muted/10">
            <h3 className="text-sm font-bold">Platform Capabilities</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-border/30">
            {[
              { icon: ShieldAlert, label: 'XGBoost Risk Scoring', desc: '0–100 per container' },
              { icon: Globe, label: 'Country Heatmaps', desc: 'Origin risk distribution' },
              { icon: Activity, label: 'SHAP Explanations', desc: 'Feature-level reasoning' },
              { icon: TrendingUp, label: 'Trend Analytics', desc: '30-day daily breakdown' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 px-5 py-4 hover:bg-muted/10 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-[1600px] mx-auto pb-10"
    >
      <div className="flex items-center justify-between mb-8 mt-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
            Operations Center
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Live overview of container risk assessments and inspection priorities.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/upload" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-95 flex items-center gap-2">
            <Package className="w-4 h-4" /> Import Data
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {sumLoad ? (
          Array(4).fill(0).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Monitored Volume" value={formatDeclaredValue(summary?.total_declared_value)}
              sub={`${(summary?.total_containers ?? 0).toLocaleString()} containers`} icon={DollarSign}
              colorClass="bg-blue-500/10 text-blue-600 border border-blue-500/20" gradientClass="bg-blue-500" />
            <StatCard label="Avg. Risk Score" value={summary?.avg_risk_score}
              sub="Score out of 100" icon={Activity}
              colorClass="bg-violet-500/10 text-violet-600 border border-violet-500/20" gradientClass="bg-violet-500" />
            <StatCard label="Critical Containers" value={summary?.risk_distribution?.CRITICAL?.toLocaleString() ?? 0}
              sub={`${summary?.critical_today ?? 0} flagged today`} icon={ShieldAlert}
              colorClass="bg-rose-500/10 text-rose-600 border border-rose-500/20" gradientClass="bg-rose-500" />
            <StatCard label="Cleared Containers" value={summary?.risk_distribution?.CLEAR?.toLocaleString() ?? 0}
              sub="No issues detected" icon={CheckCircle}
              colorClass="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" gradientClass="bg-emerald-500" />
          </>
        )}
      </div>

      {/* Charts Row */}
      {noPredictions && (
        <motion.div variants={itemVariants} className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Run Your First Prediction</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {summary?.total_containers?.toLocaleString()} containers loaded — score them to populate charts and analytics.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/jobs" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-xl shadow shadow-primary/20 transition-all flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Run Batch Prediction
            </Link>
          </div>
        </motion.div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trend Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold">Daily Risk Trend</h3>
              <p className="text-sm text-muted-foreground">Prediction volume by risk level over the last 30 days</p>
            </div>
          </div>
          {trendLoad ? (
            <div className="h-64 animate-pulse bg-muted/50 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trends ?? []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  {Object.entries(PIE_COLORS).map(([key, color]) => (
                    <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={d => d.slice(5)} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: 13, fontWeight: 500 }}
                />
                {Object.entries(PIE_COLORS).map(([key, color]) => (
                  <Area key={key} type="monotone" dataKey={key} name={key.replace('_', ' ')}
                    stroke={color} fill={`url(#grad-${key})`} strokeWidth={2.5} activeDot={{ r: 6, strokeWidth: 0 }} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Donut Chart */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold mb-1">Risk Distribution</h3>
          <p className="text-sm text-muted-foreground mb-6">Overall risk level breakdown across all predictions</p>
          <div className="flex-1 flex items-center justify-center relative">
            {distLoad ? (
              <div className="w-full h-full animate-pulse bg-muted/50 rounded-full aspect-square max-h-[220px]" />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={95}
                    dataKey="value" paddingAngle={4} stroke="none" cornerRadius={4}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [<span className="font-semibold">{v.toLocaleString()}</span>, <span className="text-muted-foreground">Containers</span>]}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 13, padding: '8px 12px' }}
                  />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 12, fontWeight: 500, color: 'hsl(var(--foreground))' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm font-medium text-muted-foreground/60 flex flex-col items-center">
                <PieChart className="w-10 h-10 mb-2 opacity-20" />
                Awaiting Data Ingestion
              </div>
            )}

            {!distLoad && pieData.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none -mt-8">
                <div className="text-center">
                  <p className="text-3xl font-extrabold tracking-tighter tabular-nums">{summary?.total_predictions?.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Scored</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Country Risk Heatmap Substitute */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-border/50 bg-muted/10">
            <h3 className="text-base font-bold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Top Risk Origins</h3>
          </div>
          <div className="p-2 flex-1 relative min-h-[260px]">
            <div className="absolute inset-0 p-4 flex flex-col gap-3">
              {(countryRisk ?? []).slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30 hover:border-border/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <CountryFlag code={c.country} size="md" />
                    <div>
                      <p className="text-sm font-bold">{getCountryName(c.country)}</p>
                      <p className="text-[10px] font-medium text-muted-foreground">{c.total} Containers</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold tabular-nums ${c.avg_risk_score >= 60 ? 'text-rose-500' : c.avg_risk_score >= 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {c.avg_risk_score} <span className="text-[10px] text-muted-foreground uppercase">Avg</span>
                    </p>
                    <div className="w-20 h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden">
                      <div className={`h-full rounded-full ${c.avg_risk_score >= 60 ? 'bg-rose-500' : c.avg_risk_score >= 30 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(c.avg_risk_score, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              {!countryRisk && Array(5).fill(0).map((_, i) => (
                <div key={i} className="h-14 animate-pulse bg-muted/40 rounded-xl" />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Top Risky Shippers */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-muted/10">
            <h3 className="text-base font-bold">High-Risk Shippers</h3>
            <Link to="/insights" className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              Full List <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border/40 flex-1">
            {(topShippers ?? []).slice(0, 5).map((s, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate tracking-tight">{s.shipper_id}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">{s.total_shipments} Shipments</p>
                  </div>
                </div>
                <div className="shrink-0 ml-4 flex flex-col items-end">
                  <span className={`text-xs font-bold tabular-nums px-2 py-1 rounded-md mb-1 border ${s.avg_risk_score >= 60 ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                    s.avg_risk_score >= 30 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    }`}>RI: {s.avg_risk_score}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{s.critical_count} Criticals</span>
                </div>
              </div>
            ))}
            {!topShippers && Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-[72px] animate-pulse bg-muted/20" />
            ))}
          </div>
        </motion.div>

        {/* Recent Predictions */}
        <motion.div variants={itemVariants} className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 bg-muted/10">
            <h3 className="text-base font-bold">Recent Predictions</h3>
            <Link to="/predictions" className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border/40 flex-1">
            {(recentPredictions?.predictions ?? recentPredictions?.items ?? []).slice(0, 5).map((p, i) => (
              <Link key={i} to={`/containers/${p.container?.id ?? p.container_id}`} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-3.5 min-w-0">
                  <CountryFlag code={p.container?.origin_country} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold font-mono truncate group-hover:text-primary transition-colors">{p.container?.container_id ?? p.container_id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px] font-medium leading-relaxed">{p.explanation_summary}</p>
                  </div>
                </div>
                <div className="shrink-0 ml-3">
                  <RiskBadge level={p.risk_level} score={p.risk_score} showScore />
                </div>
              </Link>
            ))}
            {!recentPredictions && Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-[76px] animate-pulse bg-muted/20" />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
