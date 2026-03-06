export default function AdminSettings() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Admin Center</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage users, access keys, and system configurations.</p>
      </div>
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50">
        <div className="p-6 border-b border-zinc-800/50">
          <h2 className="text-lg font-medium text-zinc-200">System Users</h2>
        </div>
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <span className="text-zinc-500 text-sm">User Management Table</span>
        </div>
      </div>
    </div>
  );
}
