export default function Insights() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Telemetry & Insights</h1>
        <p className="text-sm text-zinc-400 mt-1">Real-time sensor data and predictive analytics.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-6 flex flex-col justify-center items-center">
           <span className="text-zinc-500 text-sm">Temperature Trends</span>
        </div>
        <div className="h-80 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-6 flex flex-col justify-center items-center">
           <span className="text-zinc-500 text-sm">Damage Prediction Map</span>
        </div>
      </div>
    </div>
  );
}
