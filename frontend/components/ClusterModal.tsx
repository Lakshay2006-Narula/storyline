'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Clock3, ExternalLink, Share2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { ClusterDetail } from '@/types';

interface ClusterModalProps {
  clusterId: number | null;
  onClose: () => void;
}

const sourceTone: Record<string, string> = { bbc: 'tone-bbc', npr: 'tone-npr', aljazeera: 'tone-aj', reuters: 'tone-reuters' };

function formatTime(value: string | null) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  return date.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ClusterModal({ clusterId, onClose }: ClusterModalProps) {
  const [cluster, setCluster] = useState<ClusterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (clusterId === null) { setCluster(null); setError(null); return; }
    let active = true;
    setLoading(true);
    setError(null);
    api.getCluster(clusterId)
      .then((detail) => { if (active) setCluster(detail); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Could not load this story.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clusterId]);

  useEffect(() => {
    if (clusterId === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [clusterId, onClose]);

  if (clusterId === null) return null;

  const sources = cluster?.articles.reduce<Record<string, number>>((counts, article) => {
    counts[article.sourceName] = (counts[article.sourceName] ?? 0) + 1;
    return counts;
  }, {}) ?? {};

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* Clipboard access may be unavailable in insecure contexts. */ }
  };

  return (
    <div className="story-drawer" role="dialog" aria-modal="true" aria-labelledby="story-drawer-title">
      <button className="story-drawer-scrim" onClick={onClose} aria-label="Close story details" />
      <section className="story-drawer-panel">
        <header className="drawer-topbar"><a href="#top" className="drawer-brand"><span className="drawer-brand-mark">S</span> STORYLINE <i>STORY FILE</i></a><div className="drawer-actions"><button onClick={share} className="drawer-icon-button" aria-label="Copy share link" title="Copy share link"><Share2 size={17} />{copied && <span>Copied</span>}</button><button onClick={onClose} className="drawer-icon-button close-button" aria-label="Close"><X size={20} /></button></div></header>

        <div className="drawer-scroll">
          {loading ? <div className="drawer-loading"><span className="loading-mark" /><p>Gathering reports…</p></div> : error ? <div className="drawer-error"><strong>Story details unavailable</strong><p>{error}</p></div> : cluster ? <>
            <div className="drawer-hero">
              <div className="drawer-kicker"><span>STORYLINE</span><b>NO. {String(cluster.id).padStart(3, '0')}</b></div>
              <h2 id="story-drawer-title">{cluster.label}</h2>
              <p className="drawer-deck">A developing story followed across {Object.keys(sources).length || 0} newsroom{Object.keys(sources).length === 1 ? '' : 's'}.</p>
              <div className="drawer-keywords">{cluster.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div>
            </div>

            <div className="drawer-coverage"><div className="coverage-sources"><span className="drawer-section-label">COVERAGE</span>{Object.entries(sources).map(([name, count]) => <span className="coverage-source" key={name}>{name}<b>{count}</b></span>)}</div><div className="coverage-dates"><Clock3 size={15} /><span>{formatTime(cluster.earliestAt)}<i>to</i>{formatTime(cluster.latestAt)}</span></div></div>

            <div className="drawer-articles-heading"><div><span className="drawer-section-label">REPORTS IN THIS STORY</span><h3>{cluster.articles.length} articles</h3></div><span className="sort-note">Oldest first <ArrowUpRight size={13} /></span></div>
            <div className="drawer-article-list">{cluster.articles.map((article, index) => <article className="drawer-article" key={article.id || index}><span className="article-rail-dot" /><div className="article-card"><div className="article-card-meta"><span className={`article-source ${sourceTone[article.sourceId] ?? ''}`}><i />{article.sourceName}</span><span>{formatTime(article.publishedAt)}</span></div><h4>{article.headline}</h4>{article.summary && <p>{article.summary}</p>}<a href={article.url} target="_blank" rel="noopener noreferrer">Read original report <ExternalLink size={14} /></a></div></article>)}</div>
          </> : null}
        </div>
      </section>
    </div>
  );
}
