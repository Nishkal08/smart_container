import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Upload, FileText, X, CheckCircle, AlertTriangle, Loader2, ArrowRight, Cpu, Database, Zap } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../lib/api';

function StatItem({ label, value, colorClass }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold tabular-nums ${colorClass}`}>{value ?? 0}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default function UploadPage() {
  const qc = useQueryClient();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [predict, setPredict] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: (formData) => api.post(`/containers/upload${predict ? '?predict=true' : ''}`, formData),
    onSuccess: (res) => {
      const d = res.data ?? res;
      setResult(d);
      setFile(null);
      toast.success(`Upload complete — ${d.uploaded ?? (d.created + d.updated)} containers processed`);
      // Invalidate everything so dashboard + predictions update immediately
      qc.invalidateQueries({ queryKey: ['containers'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
      qc.invalidateQueries({ queryKey: ['predictions'] });
      if (predict) qc.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Upload failed'),
  });

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.csv')) { toast.error('Only CSV files are accepted'); return; }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    uploadMutation.mutate(fd);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Prediction loading overlay */}
      <AnimatePresence>
        {uploadMutation.isPending && (
          <motion.div
            key="upload-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="bg-card rounded-2xl border border-border shadow-2xl p-8 w-full max-w-sm mx-4"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h3 className="text-base font-bold">Processing your data</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {predict ? 'Uploading and running AI risk scoring…' : 'Uploading and parsing containers…'}
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { icon: Upload,   label: 'Uploading CSV file',           status: 'done'   },
                  { icon: Database, label: 'Parsing & saving containers',  status: 'active' },
                  { icon: Cpu,      label: predict ? 'Queuing AI risk scoring' : 'Finalising records', status: predict ? 'pending' : 'active' },
                  ...(predict ? [{ icon: Zap, label: 'Background prediction job created', status: 'pending' }] : []),
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      step.status === 'done'    ? 'bg-emerald-500/10' :
                      step.status === 'active'  ? 'bg-primary/10' :
                                                  'bg-muted'
                    }`}>
                      {step.status === 'done' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : step.status === 'active' ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      ) : (
                        <step.icon className="w-4 h-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      step.status === 'done'   ? 'text-muted-foreground line-through' :
                      step.status === 'active' ? 'text-foreground font-medium' :
                                                 'text-muted-foreground/50'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-muted-foreground/60 text-center mt-6">
                Please don't close this tab…
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${dragOver
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border hover:border-muted-foreground/50 hover:bg-muted/20'
          }`}>
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Upload className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Drop your CSV file here</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse — .csv only</p>
          </div>
        </div>
      </div>

      {/* Selected file */}
      {file && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button onClick={() => setFile(null)} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Options */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upload Options</p>
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex-shrink-0 mt-0.5">
            <input type="checkbox" checked={predict} onChange={e => setPredict(e.target.checked)} className="sr-only peer" />
            <div className="w-4 h-4 rounded border border-border peer-checked:bg-primary peer-checked:border-primary transition-colors" />
            {predict && (
              <svg className="absolute inset-0 w-4 h-4 text-primary-foreground pointer-events-none" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">Auto-predict after upload</p>
            <p className="text-xs text-muted-foreground">Run batch risk scoring for all uploaded containers. Creates a background job.</p>
          </div>
        </label>
      </div>

      {/* Upload button */}
      <button
        onClick={handleSubmit}
        disabled={!file || uploadMutation.isPending}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
        {uploadMutation.isPending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
          : <><Upload className="w-4 h-4" /> Upload & Process</>}
      </button>

      {/* Results */}
      {result && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Upload Successful</p>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <StatItem label="Created" value={result.created} colorClass="text-emerald-600" />
            <StatItem label="Updated" value={result.updated} colorClass="text-blue-600" />
            <StatItem label="Skipped" value={result.skipped} colorClass="text-amber-600" />
            <StatItem label="Errors" value={(result.parse_errors?.length ?? 0) + (result.db_errors?.length ?? 0)} colorClass="text-red-600" />
          </div>
          {result.batch_job?.id && (
            <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">Prediction job queued</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{result.batch_job.id}</p>
              </div>
              <Link to="/jobs" className="text-xs text-primary flex items-center gap-1 hover:underline shrink-0">
                Track progress <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
          {((result.parse_errors?.length ?? 0) + (result.db_errors?.length ?? 0)) > 0 && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-xs font-medium text-red-600 mb-1">
                <AlertTriangle className="inline w-3 h-3 mr-1" />
                {(result.parse_errors?.length ?? 0) + (result.db_errors?.length ?? 0)} row(s) had issues
              </p>
              <ul className="text-xs text-red-600/80 space-y-0.5 list-disc list-inside">
                {[...(result.parse_errors ?? []), ...(result.db_errors ?? [])].slice(0, 5).map((e, i) => (
                  <li key={i}>{typeof e === 'string' ? e : `Row ${e.row}: ${e.reason}`}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
