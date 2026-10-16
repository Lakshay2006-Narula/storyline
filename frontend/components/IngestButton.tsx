'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { IngestJob } from '@/types';

interface IngestButtonProps {
  onComplete: () => void;
}

export default function IngestButton({ onComplete }: IngestButtonProps) {
  const [job, setJob] = useState<IngestJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollStatus = useCallback(
    async (jobId: string) => {
      try {
        const data = await api.getIngestStatus(jobId);
        setJob(data);
        if (data.status === 'completed') {
          setLoading(false);
          onComplete();
          setTimeout(() => setJob(null), 5000);
        } else if (data.status === 'failed') {
          setLoading(false);
          setError(data.error || 'Pipeline run failed');
          setTimeout(() => {
            setJob(null);
            setError(null);
          }, 6000);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    },
    [onComplete]
  );

  useEffect(() => {
    if (!job || job.status !== 'running') return;
    const interval = setInterval(() => pollStatus(job.jobId), 3000);
    return () => clearInterval(interval);
  }, [job, pollStatus]);

  const handleTrigger = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.triggerIngest();
      setJob({
        jobId: result.jobId,
        status: 'running',
        startedAt: result.startedAt,
        completedAt: null,
        summary: null,
        error: null,
      });
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Pipeline trigger failed');
      setTimeout(() => setError(null), 5000);
    }
  };

  const isRunning = loading || job?.status === 'running';
  const isCompleted = job?.status === 'completed';

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleTrigger}
        disabled={isRunning}
        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-md ${
          isRunning
            ? 'bg-violet-950/60 border-violet-500 text-violet-300 ring-2 ring-violet-500/30'
            : isCompleted
            ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/30'
            : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-violet-500/60 shadow-lg shadow-violet-600/25 hover:scale-[1.02]'
        }`}
      >
        {isRunning ? (
          <Loader2 className="w-4 h-4 animate-spin text-violet-200" />
        ) : isCompleted ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-100" />
        ) : (
          <RefreshCw className="w-4 h-4 text-violet-100" />
        )}
        <span>{isRunning ? 'Scraping & Grouping...' : isCompleted ? 'Ingestion Complete!' : 'Ingest Live Feeds'}</span>
      </button>

      {/* Progress pill */}
      {isRunning && (
        <span className="text-[11px] text-violet-300 bg-violet-950/80 px-2.5 py-1 rounded-full border border-violet-800/80 animate-pulse hidden sm:inline-block">
          Ingesting BBC, NPR &amp; Al Jazeera • Reclustering with TF-IDF
        </span>
      )}

      {error && (
        <span className="text-xs text-rose-400 bg-rose-950/50 px-2.5 py-1 rounded-full border border-rose-900 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </span>
      )}
    </div>
  );
}
