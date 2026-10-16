'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, CalendarDays, CircleDot, Clock3, Moon, Newspaper, Search, SlidersHorizontal, Sparkles, Sun } from 'lucide-react';
import { api } from '@/lib/api';
import { ClusterSummary, TimelineEvent } from '@/types';
import ClusterModal from '@/components/ClusterModal';
import IngestButton from '@/components/IngestButton';

const sourceTones: Record<string, string> = {
  bbc: 'tone-bbc', npr: 'tone-npr', aljazeera: 'tone-aj', reuters: 'tone-reuters',
};

function dateLabel(value: string | null) {
  if (!value) return 'Time unavailable';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function HomePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [largeText, setLargeText] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [timeline, summaries] = await Promise.all([api.getTimeline(), api.getClusters()]);
      setEvents(timeline);
      setClusters(summaries);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to the Storyline API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    setDarkMode(window.localStorage.getItem('storyline-theme') === 'dark');
  }, []);

  const toggleTheme = () => setDarkMode((current) => {
    const next = !current;
    window.localStorage.setItem('storyline-theme', next ? 'dark' : 'light');
    return next;
  });

  const sources = useMemo(() => {
    const found = new Map<string, { id: string; name: string; count: number }>();
    events.forEach((event) => event.sources.forEach((source) => {
      const item = found.get(source.sourceId) ?? { id: source.sourceId, name: source.sourceName, count: 0 };
      item.count += source.articleCount;
      found.set(source.sourceId, item);
    }));
    return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [events]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    const matchesSource = !selectedSources.length || event.sources.some((source) => selectedSources.includes(source.sourceId));
    const term = query.trim().toLowerCase();
    const matchesQuery = !term || `${event.label} ${event.keywords.join(' ')}`.toLowerCase().includes(term);
    return matchesSource && matchesQuery;
  }).sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()), [events, query, selectedSources]);

  const totalArticles = clusters.reduce((sum, cluster) => sum + cluster.articleCount, 0);
  const toggleSource = (id: string) => setSelectedSources((current) => current.includes(id) ? current.filter((source) => source !== id) : [...current, id]);

  return (
    <main className={`newsroom ${largeText ? 'large-text' : ''} ${darkMode ? 'dark-mode' : ''}`}>
      <header className="masthead">
        <div className="masthead-inner">
          <a className="brand" href="#top" aria-label="Storyline home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M12 11v18M20 16v13M28 8v21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 13.5 20 18l8-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="11" r="3" fill="currentColor" />
                <circle cx="20" cy="16" r="3" fill="currentColor" />
                <circle cx="28" cy="8" r="3" fill="currentColor" />
                <circle cx="12" cy="29" r="2" fill="currentColor" />
                <circle cx="20" cy="29" r="2" fill="currentColor" />
                <circle cx="28" cy="29" r="2" fill="currentColor" />
              </svg>
            </span>
            <span className="brand-word">Story<span className="brand-light">line</span></span>
          </a>
          <div className="edition"><span className="live-dot" /> INDEPENDENT NEWS MONITOR <span className="edition-date">· {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
          <button className="type-control" onClick={() => setLargeText((large) => !large)} aria-pressed={largeText} aria-label={largeText ? 'Use standard text size' : 'Increase text size'} title={largeText ? 'Standard text' : 'Larger text'}>A<span>{largeText ? '−' : '+'}</span></button>
          <button className="theme-control" onClick={toggleTheme} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={darkMode} title={darkMode ? 'Light mode' : 'Dark mode'}>{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
          <IngestButton onComplete={loadData} />
        </div>
      </header>

      <div className="page-shell" id="top">
        <section className="intro">
          <div className="intro-copy">
            <div className="eyebrow"><Sparkles size={14} /> THE NEWS, CONNECTED</div>
            <h1>Stories move.<br /><em>See where they go.</em></h1>
            <p>Coverage from trusted outlets, brought together by the stories they share.</p>
          </div>
          <div className="intro-aside">
            <span className="aside-label">LATEST EDITION</span>
            <span className="aside-time">{lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</span>
            <span className="aside-caption">{lastUpdated ? 'Updated just now' : 'Waiting for the latest feed'}</span>
          </div>
        </section>

        <section className="stats-strip" aria-label="News overview">
          <div className="stat"><span className="stat-icon"><Newspaper size={16} /></span><span><strong>{totalArticles.toLocaleString()}</strong><small>articles tracked</small></span></div>
          <div className="stat"><span className="stat-icon"><CircleDot size={16} /></span><span><strong>{clusters.length}</strong><small>active storylines</small></span></div>
          <div className="stat"><span className="stat-icon"><Activity size={16} /></span><span><strong>{sources.length}</strong><small>newsrooms monitored</small></span></div>
          <div className="stat-update"><Clock3 size={14} /> {lastUpdated ? `Synced ${dateLabel(lastUpdated)}` : 'Sync status unavailable'}</div>
        </section>

        <section className="coverage-section">
          <div className="section-heading">
            <div><div className="eyebrow section-kicker"><CalendarDays size={14} /> COVERAGE MAP</div><h2>Storylines over time</h2><p>Each line connects the first and latest reports on a developing story.</p></div>
            <div className="coverage-count"><b>{filteredEvents.length}</b><span>stories in view</span></div>
          </div>

          <div className="filter-bar">
            <label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a story or keyword" /><span className="search-hint">⌘ K</span></label>
            <div className="source-filter"><span className="filter-label"><SlidersHorizontal size={14} /> SOURCES</span>
              {sources.map((source) => <button key={source.id} onClick={() => toggleSource(source.id)} className={`source-chip ${sourceTones[source.id] ?? ''} ${selectedSources.length && !selectedSources.includes(source.id) ? 'muted' : ''}`} aria-pressed={!selectedSources.length || selectedSources.includes(source.id)}><i />{source.name}</button>)}
              {selectedSources.length > 0 && <button className="clear-filter" onClick={() => setSelectedSources([])}>Clear</button>}
            </div>
          </div>

          {error && <div className="error-note"><strong>Can’t load the latest coverage.</strong><span>{error}</span><button onClick={() => void loadData()}>Try again</button></div>}
          {loading ? <div className="empty-state"><span className="loading-mark" /><strong>Gathering today’s coverage…</strong><p>Connecting to your news sources.</p></div> : filteredEvents.length ? (
            <div className="story-list">
              {filteredEvents.map((event, index) => {
                const start = new Date(event.startTime).getTime();
                const end = new Date(event.endTime).getTime();
                const span = Math.max(0, end - start);
                const width = Math.min(100, Math.max(8, 13 + Math.log10(span / 3600000 + 1) * 24));
                return <button key={event.id} className="story-row" onClick={() => setSelectedCluster(event.id)}>
                  <span className="story-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="story-main"><span className="story-meta"><span className="story-live"><i /> DEVELOPING</span><span>{event.articleCount} reports</span></span><strong>{event.label}</strong><span className="keyword-row">{event.keywords.slice(0, 3).map((keyword) => <i key={keyword}>{keyword}</i>)}</span></span>
                  <span className="story-sources">{event.sources.slice(0, 3).map((source) => <span key={source.sourceId} className={`source-avatar ${sourceTones[source.sourceId] ?? ''}`} title={source.sourceName}>{source.sourceName.slice(0, 1)}</span>)}<small>{event.sources.length} outlet{event.sources.length === 1 ? '' : 's'}</small></span>
                  <span className="story-window"><span className="window-label">COVERAGE WINDOW</span><span className="window-track"><i style={{ width: `${width}%` }} /></span><span className="window-dates"><span>{dateLabel(event.startTime)}</span><span>{dateLabel(event.endTime)}</span></span></span>
                  <span className="story-arrow"><ArrowUpRight size={18} /></span>
                </button>;
              })}
            </div>
          ) : <div className="empty-state"><span className="empty-icon"><Newspaper size={22} /></span><strong>No stories match those filters.</strong><p>Try another search or bring all sources back into view.</p><button onClick={() => { setQuery(''); setSelectedSources([]); }}>Reset filters</button></div>}
        </section>

        <footer className="page-footer"><span>STORYLINE <b>·</b> A clearer view of the day</span><span>Sources: {sources.map((source) => source.name).join(' · ') || '—'}</span></footer>
      </div>
      <ClusterModal clusterId={selectedCluster} onClose={() => setSelectedCluster(null)} />
    </main>
  );
}
