'use client';

import React, { useEffect, useState } from 'react';
import { AnalyticsData } from '@/types';
import { api } from '@/lib/api';
import {
  BarChart3,
  PieChart,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  Radio,
  Cpu,
  RefreshCw,
  Terminal,
  Activity,
  CheckCircle2,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';

interface GraphDashboardProps {
  onClusterClick: (id: number) => void;
}

export default function GraphDashboard({ onClusterClick }: GraphDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getAnalytics()
      .then(setData)
      .catch((err) => {
        console.error('Failed to load analytics data:', err);
        setError(err.message || 'Error fetching analytics');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-10 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-7 h-7 animate-spin text-cyan-400" />
        <span className="text-xs font-bold text-cyan-200">Rendering Real-Time News Graphs &amp; Analytics...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/20 text-rose-300 text-xs text-center">
        <p className="font-bold">Unable to render graph dashboard</p>
        <p className="text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  const { summary, sourceBreakdown, topicRanking, temporalActivity, pythonEngine } = data;
  const maxTopicVolume = Math.max(...topicRanking.map((t) => t.articleCount), 1);
  const maxTemporal = Math.max(...temporalActivity.map((t) => t.count), 1);

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">

      {/* ── 1. Top Executive Intelligence KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="p-5 rounded-2xl bg-white/[0.025] hover:bg-white/[0.04] border border-cyan-500/20 relative overflow-hidden group transition-all shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Total Coverage</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-300 flex items-center justify-center border border-cyan-500/20">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{summary.totalArticles} Articles</div>
          <p className="text-xs text-slate-400 mt-1">
            <span className="text-cyan-300 font-bold">{summary.enrichedArticles} Full-text</span> parsed by Python
          </p>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
        </div>

        {/* KPI 2 */}
        <div className="p-5 rounded-2xl bg-white/[0.025] hover:bg-white/[0.04] border border-purple-500/20 relative overflow-hidden group transition-all shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Story Consensus</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-300 flex items-center justify-center border border-purple-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{summary.consensusRate}%</div>
          <p className="text-xs text-slate-400 mt-1">
            <span className="text-purple-300 font-bold">{summary.multiSourceStoryCount} stories</span> verified across outlets
          </p>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />
        </div>

        {/* KPI 3 */}
        <div className="p-5 rounded-2xl bg-white/[0.025] hover:bg-white/[0.04] border border-cyan-500/20 relative overflow-hidden group transition-all shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Topic Density</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-300 flex items-center justify-center border border-cyan-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">{summary.avgClusterSize}</div>
          <p className="text-xs text-slate-400 mt-1">
            Avg articles per topic cluster
          </p>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
        </div>

        {/* KPI 4 */}
        <div className="p-5 rounded-2xl bg-white/[0.025] hover:bg-white/[0.04] border border-purple-500/20 relative overflow-hidden group transition-all shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">Python NLP Engine</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-300 flex items-center justify-center border border-purple-500/20">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400">TF-IDF</div>
          <p className="text-xs text-slate-400 mt-1">
            5,000 Dimensions • scikit-learn
          </p>
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-purple-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />
        </div>
      </div>

      {/* ── 2. Middle Row: Topic Coverage Chart & Outlet Share ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left (2 cols): Topic Coverage & Intensity Graph */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" /> Topic Coverage Intensity Graph
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Article volume ranking per topic cluster, extracted via Python TF-IDF
                </p>
              </div>
              <span className="text-[10px] font-bold text-cyan-300 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25">
                Top {topicRanking.length} Stories
              </span>
            </div>

            {/* Bars List */}
            <div className="space-y-3.5 pt-1">
              {topicRanking.slice(0, 6).map((topic, idx) => {
                const widthPct = Math.round((topic.articleCount / maxTopicVolume) * 100);

                return (
                  <div
                    key={topic.id}
                    onClick={() => onClusterClick(topic.id)}
                    className="group cursor-pointer p-2.5 rounded-xl hover:bg-white/[0.04] transition-all border border-transparent hover:border-white/[0.08]"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-3">
                      <span className="font-bold text-slate-100 group-hover:text-cyan-300 truncate max-w-sm sm:max-w-md transition-colors">
                        <strong className="text-purple-400 mr-2">{idx + 1}.</strong> {topic.label}
                      </span>
                      <span className="text-cyan-400 font-mono font-bold flex-shrink-0 text-[11px]">
                        {topic.articleCount} articles ({widthPct}%)
                      </span>
                    </div>

                    {/* Gradient Bar in Dark Navy Track with Purple to Cyan Fill */}
                    <div className="w-full h-2.5 rounded-full bg-black/40 border border-white/[0.06] overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 shadow-sm shadow-cyan-500/20 transition-all duration-500 group-hover:brightness-125"
                        style={{ width: `${Math.max(widthPct, 6)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400 mt-3">
            <span>Bar width = Relative story prominence</span>
            <span className="text-cyan-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Click any bar to explore articles <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Right (1 col): Outlet Share & Velocity Waves */}
        <div className="p-6 rounded-2xl bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between space-y-6 shadow-md">
          {/* Section A: Monitored Outlet Share */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-400" /> Monitored Outlet Share
              </h3>
              <span className="text-[10px] font-bold text-purple-300">Live Ingestion</span>
            </div>

            <div className="space-y-3.5 mt-4">
              {sourceBreakdown.map((src) => {
                const isBBC = src.sourceId === 'bbc';
                const isNPR = src.sourceId === 'npr';
                const barColor = isBBC
                  ? 'from-purple-600 to-pink-500'
                  : isNPR
                  ? 'from-cyan-500 to-blue-500'
                  : 'from-amber-500 to-orange-500';

                return (
                  <div key={src.sourceId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-200">{src.sourceName}</span>
                      <span className="text-cyan-300 font-mono text-[11px]">
                        {src.count} ({src.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-black/40 border border-white/[0.06] overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                        style={{ width: `${src.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Publishing Frequency Waves */}
          <div className="pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" /> Publishing Frequency Pulse
              </span>
              <span className="text-[10px] text-cyan-400 font-bold">Today: Peak Surge</span>
            </div>

            {/* Mini Column Chart */}
            <div className="h-20 flex items-end justify-between gap-2 pt-3 px-1 border-b border-white/[0.08]">
              {temporalActivity.map((item, idx) => {
                const heightPct = Math.max(Math.round((item.count / maxTemporal) * 100), 15);
                const isPeak = item.count === maxTemporal;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                    <div
                      className={`w-full rounded-t transition-all ${
                        isPeak
                          ? 'bg-gradient-to-t from-purple-600 to-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                          : 'bg-white/[0.08] hover:bg-purple-900/60'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] font-mono text-slate-400 truncate max-w-[40px]">
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ── 3. Bottom Row: Python NLP Architecture Card ── */}
      <div className="p-6 rounded-2xl bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl shadow-md space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" /> Python 3.13 NLP &amp; Extraction Architecture
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Technical implementation breakdown of Part 1 in the candidate assessment
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/25">
            scikit-learn 1.6.1 + trafilatura
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs pt-1">
          <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clustering</div>
            <div className="font-bold text-cyan-300 truncate">Agglomerative</div>
          </div>
          <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Distance Metric</div>
            <div className="font-bold text-purple-300">Cosine Distance</div>
          </div>
          <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">TF-IDF Features</div>
            <div className="font-bold text-cyan-300">5,000 (1-2 N-grams)</div>
          </div>
          <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Centroid Weight</div>
            <div className="font-bold text-purple-300">Headline 4x, Body 1x</div>
          </div>
          <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Deduplication</div>
            <div className="font-bold text-cyan-300">SHA-256 URL Hash</div>
          </div>
          <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Database</div>
            <div className="font-bold text-purple-300">Neon PostgreSQL</div>
          </div>
        </div>
      </div>

    </div>
  );
}
