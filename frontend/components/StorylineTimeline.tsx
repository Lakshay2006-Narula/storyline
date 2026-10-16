'use client';

import React from 'react';
import { TimelineEvent } from '@/types';
import { Clock, Newspaper, ArrowRight, Sparkles } from 'lucide-react';

interface StorylineTimelineProps {
  events: TimelineEvent[];
  activeFilters: string[];
  searchQuery: string;
  onClusterClick: (id: number) => void;
}

const SOURCE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; name: string }> = {
  bbc: { bg: 'bg-purple-950/60', border: 'border-purple-400/60', text: 'text-purple-300', dot: 'bg-purple-400', name: 'BBC News' },
  npr: { bg: 'bg-cyan-950/60', border: 'border-cyan-400/60', text: 'text-cyan-300', dot: 'bg-cyan-400', name: 'NPR News' },
  aljazeera: { bg: 'bg-indigo-950/60', border: 'border-indigo-400/60', text: 'text-indigo-300', dot: 'bg-indigo-400', name: 'Al Jazeera' },
  reuters: { bg: 'bg-fuchsia-950/60', border: 'border-fuchsia-400/60', text: 'text-fuchsia-300', dot: 'bg-fuchsia-400', name: 'Reuters' },
};

function formatTime(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function StorylineTimeline({
  events,
  activeFilters,
  searchQuery,
  onClusterClick,
}: StorylineTimelineProps) {
  const sorted = [...events].sort((a, b) => {
    const tA = new Date(a.endTime || a.startTime || 0).getTime();
    const tB = new Date(b.endTime || b.startTime || 0).getTime();
    return tB - tA;
  });

  const filtered = sorted.filter((ev) => {
    if (activeFilters.length > 0) {
      const hasSource = ev.sources.some((s) => activeFilters.includes(s.sourceId));
      if (!hasSource) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLabel = ev.label.toLowerCase().includes(q);
      const matchKeywords = ev.keywords.some((k) => k.toLowerCase().includes(q));
      if (!matchLabel && !matchKeywords) return false;
    }
    return true;
  });

  if (!filtered.length) {
    return (
      <div className="py-20 text-center text-slate-400">
        <p>No stories match the active filters.</p>
      </div>
    );
  }

  return (
    <div className="w-full relative pl-8 sm:pl-10 space-y-7 before:absolute before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-cyan-400 before:to-indigo-800">
      {filtered.map((cluster) => {
        return (
          <div key={cluster.id} className="relative group">
            {/* Glowing Pulse Node on Timeline Rail in Cyan & Purple */}
            <div className="absolute -left-[38px] top-6 w-5 h-5 rounded-full bg-[#080f24] border-2 border-cyan-400 flex items-center justify-center group-hover:border-purple-400 group-hover:scale-125 transition-all shadow-[0_0_12px_rgba(6,182,212,0.6)]">
              <span className="w-2 h-2 rounded-full bg-cyan-300 group-hover:bg-purple-300" />
            </div>

            {/* Topic Card Container in Dark Navy with Cyan Border */}
            <div
              onClick={() => onClusterClick(cluster.id)}
              className="p-5 sm:p-6 rounded-2xl bg-[#0d1736] border border-cyan-500/30 hover:border-purple-400 hover:bg-[#111e47] transition-all duration-200 cursor-pointer shadow-lg shadow-black/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.25)] backdrop-blur-md"
            >
              {/* Top Meta Bar */}
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Topic #{cluster.id}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {cluster.sources.map((s) => {
                      const sc = SOURCE_COLORS[s.sourceId] || SOURCE_COLORS.bbc;
                      return (
                        <span
                          key={s.sourceId}
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${sc.bg} ${sc.text} ${sc.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.name} ({s.articleCount})
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    {formatTime(cluster.startTime)} → {formatTime(cluster.endTime)}
                  </span>
                </div>
              </div>

              {/* Topic Headline Title */}
              <h3 className="text-lg font-black text-white group-hover:text-cyan-200 leading-snug mb-3">
                {cluster.label}
              </h3>

              {/* Keywords Pills */}
              {cluster.keywords && cluster.keywords.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-4">
                  {cluster.keywords.slice(0, 4).map((kw, i) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-0.5 rounded-md bg-[#080f24] text-cyan-200 font-semibold border border-cyan-500/25"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Bottom Action Footer */}
              <div className="pt-3 border-t border-cyan-500/20 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Newspaper className="w-3.5 h-3.5 text-purple-400" />
                  {cluster.articleCount} articles linked in this cluster
                </span>

                <span className="inline-flex items-center gap-1 text-xs font-black text-cyan-400 group-hover:text-purple-300 group-hover:translate-x-1 transition-transform">
                  <span>Explore All Articles</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
