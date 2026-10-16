'use client';

import React from 'react';
import { Newspaper, Radio, Database, Layers, Sparkles } from 'lucide-react';

interface HeaderProps {
  clusterCount: number;
  articleCount: number;
  outletCounts: Record<string, number>;
  lastUpdated: string | null;
}

export default function Header({
  clusterCount,
  articleCount,
  outletCounts,
  lastUpdated,
}: HeaderProps) {
  return (
    <header className="border-b border-white/[0.08] bg-[#0a1228]/85 backdrop-blur-2xl sticky top-0 z-40 w-full shadow-lg shadow-black/30">
      <div className="w-full max-w-[1720px] mx-auto px-6 lg:px-10 py-3.5">
        <div className="flex items-center justify-between gap-6 flex-wrap">

          {/* Logo & Brand in Dark Navy + Purple + Cyan */}
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-400/30">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400 ring-2 ring-[#0a1228]" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-white tracking-tight">
                  News<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300">Pulse</span>
                </h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-400/25 tracking-wide flex items-center gap-1 shadow-sm shadow-cyan-500/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> LIVE PIPELINE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Topic-Clustered Intelligence &amp; NLP Timeline
              </p>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            {/* Metric: Clusters */}
            <div className="px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] flex items-center gap-3 transition-colors shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-300 flex items-center justify-center border border-purple-500/25">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300/90">Topic Clusters</div>
                <div className="text-sm font-black text-white leading-none mt-0.5">{clusterCount} Active</div>
              </div>
            </div>

            {/* Metric: Articles */}
            <div className="px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] flex items-center gap-3 transition-colors shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-300 flex items-center justify-center border border-cyan-500/25">
                <Newspaper className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/90">Total Articles</div>
                <div className="text-sm font-black text-white leading-none mt-0.5">{articleCount} Ingested</div>
              </div>
            </div>

            {/* Metric: DB Cloud */}
            <div className="hidden sm:flex px-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] items-center gap-3 transition-colors shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center border border-emerald-500/25">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Database</div>
                <div className="text-xs font-bold text-emerald-300 leading-none mt-0.5">Neon (Singapore)</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
