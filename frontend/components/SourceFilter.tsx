'use client';

import React from 'react';
import { Filter, Check } from 'lucide-react';

interface SourceFilterProps {
  sources: { id: string; name: string; count?: number }[];
  activeFilters: string[];
  onToggle: (sourceId: string) => void;
  onClear: () => void;
}

const SOURCE_STYLES: Record<string, { active: string; inactive: string; dot: string }> = {
  bbc: {
    active: 'bg-purple-900/60 text-purple-200 border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)] ring-1 ring-purple-400',
    inactive: 'bg-[#0f1b40]/80 text-purple-300/80 border-purple-500/30 hover:border-purple-400 hover:text-white',
    dot: 'bg-purple-400',
  },
  npr: {
    active: 'bg-cyan-900/60 text-cyan-200 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400',
    inactive: 'bg-[#0f1b40]/80 text-cyan-300/80 border-cyan-500/30 hover:border-cyan-400 hover:text-white',
    dot: 'bg-cyan-400',
  },
  aljazeera: {
    active: 'bg-indigo-900/60 text-indigo-200 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)] ring-1 ring-indigo-400',
    inactive: 'bg-[#0f1b40]/80 text-indigo-300/80 border-indigo-500/30 hover:border-indigo-400 hover:text-white',
    dot: 'bg-indigo-400',
  },
  reuters: {
    active: 'bg-fuchsia-900/60 text-fuchsia-200 border-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.4)] ring-1 ring-fuchsia-400',
    inactive: 'bg-[#0f1b40]/80 text-fuchsia-300/80 border-fuchsia-500/30 hover:border-fuchsia-400 hover:text-white',
    dot: 'bg-fuchsia-400',
  },
};

export default function SourceFilter({
  sources,
  activeFilters,
  onToggle,
  onClear,
}: SourceFilterProps) {
  const isAll = activeFilters.length === 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-bold mr-1">
        <Filter className="w-3.5 h-3.5 text-cyan-400" />
        <span>Sources:</span>
      </div>

      {/* All Sources button in Electric Cyan */}
      <button
        onClick={onClear}
        className={`px-3 py-1.5 rounded-lg text-xs font-black border transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
          isAll
            ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400'
            : 'bg-[#0f1b40]/80 text-slate-300 border-cyan-500/30 hover:border-cyan-400 hover:text-white'
        }`}
      >
        {isAll && <Check className="w-3 h-3" />}
        <span>All Sources</span>
      </button>

      {/* Outlets */}
      {sources.map((src) => {
        const isActive = activeFilters.includes(src.id);
        const style = SOURCE_STYLES[src.id] || {
          active: 'bg-purple-900/60 text-purple-200 border-purple-400',
          inactive: 'bg-[#0f1b40]/80 text-slate-400 border-purple-500/30',
          dot: 'bg-purple-400',
        };

        return (
          <button
            key={src.id}
            onClick={() => onToggle(src.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              isActive ? style.active : style.inactive
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${style.dot} ${isActive ? 'ring-2 ring-white' : ''}`} />
            <span>{src.name}</span>
            {src.count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-black/40 text-cyan-300 border border-cyan-500/20'
                }`}
              >
                {src.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
