export default function Dashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: "Total Containers", value: "1,248" },
          { title: "In Transit", value: "856" },
          { title: "Maintenance", value: "12" }
        ].map((item, i) => (
          <div key={i} className="p-6 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-sm font-medium text-muted-foreground">{item.title}</h3>
            <p className="text-3xl font-bold text-foreground mt-2">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="h-[400px] rounded-2xl border border-border bg-card shadow-sm p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center animate-pulse">
            <span className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></span>
          </div>
          <span className="text-muted-foreground text-sm font-medium">Loading Telemetry Data...</span>
        </div>
      </div>
    </div>
  );
}
