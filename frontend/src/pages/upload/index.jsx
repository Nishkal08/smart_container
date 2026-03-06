export default function UploadData() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Upload Dataset</h1>
        <p className="text-sm text-zinc-400 mt-1">Upload CSV files for historical or real-time simulation datasets.</p>
      </div>
      <div className="mt-8">
        <div className="border-2 border-dashed border-zinc-700/50 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-colors rounded-xl p-12 text-center flex flex-col items-center justify-center cursor-pointer">
          <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
             <span className="text-zinc-400">📁</span>
          </div>
          <h3 className="text-zinc-200 font-medium">Click or drag file to this area to upload</h3>
          <p className="text-sm text-zinc-500 mt-2">Support for a single or bulk .csv upload.</p>
        </div>
      </div>
    </div>
  );
}
