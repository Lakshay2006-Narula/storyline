'use client';

import React, { useMemo } from 'react';
import { TimelineEvent } from '@/types';
import { Clock, Layers, ChevronRight, Info, Calendar } from 'lucide-react';

interface TimelineProps {
  events: TimelineEvent[];
  activeFilters: string[];
  searchQuery: string;
  timeRange: '24h' | '7d' | 'all';
  onClusterClick: (id: number) => void;
}

const SOURCE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; name: string }> = {
  bbc: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300', dot: 'bg-purple-400', name: 'BBC' },
  npr: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-300', dot: 'bg-cyan-400', name: 'NPR' },
  aljazeera: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-300', dot: 'bg-indigo-400', name: 'Al Jazeera' },
  reuters: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30', text: 'text-fuchsia-300', dot: 'bg-fuchsia-400', name: 'Reuters' },
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function Timeline({
  events,
  activeFilters,
  searchQuery,
  timeRange,
  onClusterClick,
}: TimelineProps) {
  // 1. Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (activeFilters.length > 0) {
        const hasSource = ev.sources.some((s) => activeFilters.includes(s.sourceId));
        if (!hasSource) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = ev.label.toLowerCase().includes(q);
        const matchesKeywords = ev.keywords.some((k) => k.toLowerCase().includes(q));
        if (!matchesLabel && !matchesKeywords) return false;
      }
      return true;
    });
  }, [events, activeFilters, searchQuery]);

  // 2. Intelligent Adaptive Date Window
  const { minMs, maxMs, totalMs } = useMemo(() => {
    if (!filteredEvents.length) return { minMs: 0, maxMs: 0, totalMs: 1 };

    const now = new Date().getTime();
    const timestamps: number[] = [];

    filteredEvents.forEach((ev) => {
      if (ev.startTime) timestamps.push(new Date(ev.startTime).getTime());
      if (ev.endTime) timestamps.push(new Date(ev.endTime).getTime());
    });

    if (!timestamps.length) return { minMs: 0, maxMs: 0, totalMs: 1 };

    let dataMin = Math.min(...timestamps);
    let dataMax = Math.max(...timestamps, now);

    if (timeRange === '24h') {
      dataMin = Math.max(dataMin, now - 24 * 60 * 60 * 1000);
    } else if (timeRange === '7d') {
      dataMin = Math.max(dataMin, now - 7 * 24 * 60 * 60 * 1000);
    } else {
      const maxSpan = 10 * 24 * 60 * 60 * 1000;
      if (dataMax - dataMin > maxSpan) {
        dataMin = dataMax - maxSpan;
      }
    }

    const span = Math.max(dataMax - dataMin, 3600 * 1000 * 6);
    const pad = span * 0.02;
    const min = dataMin - pad;
    const max = dataMax + pad;

    return { minMs: min, maxMs: max, totalMs: max - min };
  }, [filteredEvents, timeRange]);

  // 3. Multi-lane greedy interval scheduling
  const { laneCount, eventsWithLanes } = useMemo(() => {
    const sorted = [...filteredEvents].sort((a, b) => {
      const tA = new Date(a.startTime).getTime();
      const tB = new Date(b.startTime).getTime();
      return tA - tB;
    });

    const laneEndPcts: number[] = [];
    const assigned: { event: TimelineEvent; laneIndex: number; leftPct: number; widthPct: number }[] = [];

    sorted.forEach((ev) => {
      const startMs = new Date(ev.startTime).getTime();
      const endMs = new Date(ev.endTime).getTime();

      let leftPct = ((Math.max(startMs, minMs) - minMs) / totalMs) * 100;
      let rightPct = ((Math.min(endMs, maxMs) - minMs) / totalMs) * 100;

      const minCapsuleWidth = 18;
      const widthPct = Math.max(rightPct - leftPct, minCapsuleWidth);
      leftPct = Math.min(Math.max(leftPct, 0), 100 - widthPct);

      let foundLane = -1;
      for (let i = 0; i < laneEndPcts.length; i++) {
        if (laneEndPcts[i] + 2 <= leftPct) {
          foundLane = i;
          break;
        }
      }

      if (foundLane === -1) {
        foundLane = laneEndPcts.length;
        laneEndPcts.push(leftPct + widthPct);
      } else {
        laneEndPcts[foundLane] = leftPct + widthPct;
      }

      assigned.push({
        event: ev,
        laneIndex: foundLane,
        leftPct,
        widthPct,
      });
    });

    return {
      laneCount: Math.max(laneEndPcts.length, 3),
      eventsWithLanes: assigned,
    };
  }, [filteredEvents, minMs, maxMs, totalMs]);

  // 4. Generate Time Ruler Ticks
  const ticks = useMemo(() => {
    if (!totalMs || totalMs <= 0) return [];
    const count = 6;
    const items: { label: string; sub: string; pct: number }[] = [];
    for (let i = 0; i <= count; i++) {
      const pct = (i / count) * 100;
      const t = minMs + (i / count) * totalMs;
      const d = new Date(t);
      items.push({
        label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        sub: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pct,
      });
    }
    return items;
  }, [minMs, totalMs]);

  if (!filteredEvents.length) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center text-slate-400">
        <Info className="w-10 h-10 mb-3 text-cyan-400" />
        <h4 className="text-base font-bold text-white">No matching topic clusters found</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Try clearing your search query or selecting "All Sources" in the filter toolbar above.
        </p>
      </div>
    );
  }

  const LANE_HEIGHT = 86;
  const canvasHeight = laneCount * LANE_HEIGHT + 60;
  const TRACK_HEADER_WIDTH = 92;

  return (
    <div className="w-full flex flex-col">
      {/* Scrollable Container in Dark Navy */}
      <div className="w-full overflow-x-auto timeline-scroll pb-2 select-none">
        <div style={{ minWidth: '1200px', height: `${canvasHeight}px` }} className="relative w-full">

          {/* Left Track Sidebar */}
          <div
            style={{ width: `${TRACK_HEADER_WIDTH}px` }}
            className="absolute left-0 top-12 bottom-4 border-r border-white/[0.08] bg-[#070b18]/90 z-20 flex flex-col"
          >
            {Array.from({ length: laneCount }).map((_, i) => (
              <div
                key={i}
                style={{ height: `${LANE_HEIGHT}px` }}
                className="flex items-center justify-center border-b border-white/[0.04]"
              >
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06]">
                  Track {i + 1}
                </span>
              </div>
            ))}
          </div>

          {/* Timeline Grid & Ruler Canvas */}
          <div
            style={{ left: `${TRACK_HEADER_WIDTH}px`, right: '16px' }}
            className="absolute top-0 bottom-0"
          >
            {/* Top Time Ruler */}
            <div className="absolute inset-x-0 top-0 h-11 border-b border-white/[0.08] flex items-center justify-between">
              {ticks.map((t, idx) => (
                <div
                  key={idx}
                  className="absolute flex flex-col items-center transform -translate-x-1/2"
                  style={{ left: `${t.pct}%` }}
                >
                  <span className="text-[11px] font-bold text-slate-200">{t.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{t.sub}</span>
                  <div
                    className="w-px bg-white/[0.05] pointer-events-none mt-1"
                    style={{ height: `${canvasHeight - 48}px` }}
                  />
                </div>
              ))}
            </div>

            {/* Lane Background Bands */}
            <div className="absolute inset-x-0 top-12 bottom-4 pointer-events-none">
              {Array.from({ length: laneCount }).map((_, i) => (
                <div
                  key={i}
                  className={`w-full border-b border-white/[0.04] ${
                    i % 2 === 0 ? 'bg-white/[0.015]' : 'bg-transparent'
                  }`}
                  style={{ height: `${LANE_HEIGHT}px` }}
                />
              ))}
            </div>

            {/* Cluster Capsules in Dark Navy Glass with Subtle Glowing Borders */}
            <div className="absolute inset-x-0 top-12 bottom-4">
              {eventsWithLanes.map(({ event, laneIndex, leftPct, widthPct }) => {
                const primarySource = event.sources[0]?.sourceId || 'bbc';
                const cfg = SOURCE_COLORS[primarySource] || SOURCE_COLORS.bbc;

                return (
                  <div
                    key={event.id}
                    onClick={() => onClusterClick(event.id)}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: `${laneIndex * LANE_HEIGHT + 8}px`,
                      height: `${LANE_HEIGHT - 16}px`,
                    }}
                    className="absolute rounded-xl border border-white/[0.09] cursor-pointer p-3 transition-all duration-200 group flex flex-col justify-between overflow-hidden shadow-md shadow-black/40 backdrop-blur-xl bg-gradient-to-br from-[#121c38]/90 via-[#0e162f]/90 to-[#0a1024]/95 hover:border-cyan-400/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:scale-[1.01] hover:z-30"
                  >
                    {/* Top Row: Sources Chips + Article Count */}
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {event.sources.map((s) => {
                          const sc = SOURCE_COLORS[s.sourceId] || SOURCE_COLORS.bbc;
                          return (
                            <span
                              key={s.sourceId}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${sc.bg} ${sc.text} border ${sc.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              {sc.name}
                            </span>
                          );
                        })}
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-cyan-300 border border-white/[0.1] flex-shrink-0">
                        {event.articleCount} articles
                      </span>
                    </div>

                    {/* Middle: Representative Headline Title */}
                    <div className="min-w-0 my-0.5">
                      <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-200 line-clamp-1 leading-snug tracking-tight">
                        {event.label}
                      </h4>
                    </div>

                    {/* Bottom Row: Timestamp + Explore Action */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span className="truncate flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-500" />
                        {formatDateTime(event.startTime)}
                      </span>
                      <span className="inline-flex items-center text-cyan-400 font-bold group-hover:text-purple-300 group-hover:translate-x-0.5 transition-transform">
                        Explore <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>

                    {/* Bottom Intensity Glow Beam */}
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-indigo-400 to-cyan-400 shadow-sm shadow-cyan-500/50"
                        style={{ width: `${Math.max(Math.round(event.intensity * 100), 25)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Legend & Instructions Footer */}
      <div className="mt-4 px-6 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between flex-wrap gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Legend:
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-purple-400" /> BBC News
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> NPR News
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300">
            <span className="w-2 h-2 rounded-full bg-indigo-400" /> Al Jazeera
          </span>
          <span className="text-white/[0.1]">|</span>
          <span className="text-slate-400">
            Horizontal width = Active duration • Non-overlapping multi-track schedule
          </span>
        </div>

        <div className="text-slate-400 font-medium">
          💡 Click any block to slide open the chronological article drawer
        </div>
      </div>
    </div>
  );
}
