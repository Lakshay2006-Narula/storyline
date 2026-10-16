'use client';

import React from 'react';
import { ClusterSummary } from '@/types';
import { Clock, ArrowUpRight, Sparkles } from 'lucide-react';

interface ClusterGridProps {
  clusters: ClusterSummary[];
  searchQuery: string;
  onClusterClick: (id: number) => void;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return 'Recent';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recent';
  }
}

export default function ClusterGrid({ clusters, searchQuery, onClusterClick }: ClusterGridProps) {
  const filtered = clusters.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.label.toLowerCase().includes(q) || c.keywords.some((k) => k.toLowerCase().includes(q));
  });

  if (!filtered.length) {
    return (
      <div className="py-16 text-center text-slate-400">
        <p>No clusters match your search query.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filtered.map((cluster) => (
        <div
          key={cluster.id}
          onClick={() => onClusterClick(cluster.id)}
          className="group relative p-5 rounded-2xl bg-[#0d1736] hover:bg-[#111e47] border border-cyan-500/30 hover:border-purple-400 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg shadow-black/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:-translate-y-1 backdrop-blur-md"
        >
          <div>
            {/* Header info */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Sparkles className="w-2.5 h-2.5" /> Topic #{cluster.id}
              </span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#080f24] text-cyan-300 border border-cyan-500/30">
                {cluster.articleCount} articles
              </span>
            </div>

            {/* Headline Title */}
            <h3 className="text-sm font-black text-white group-hover:text-cyan-200 leading-snug line-clamp-2 mb-3">
              {cluster.label}
            </h3>

            {/* Keywords */}
            {cluster.keywords && cluster.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {cluster.keywords.slice(0, 3).map((kw, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#080f24] text-slate-300 border border-purple-500/20"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer info */}
          <div className="pt-3 border-t border-cyan-500/20 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 text-[11px] font-medium text-cyan-300/80">
              <Clock className="w-3 h-3 text-cyan-400" />
              {formatTime(cluster.latestAt)}
            </span>

            <span className="inline-flex items-center gap-1 font-black text-cyan-400 group-hover:text-purple-300">
              Details <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
