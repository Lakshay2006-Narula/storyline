// lib/api.ts — API client for the Storyline backend

import { ClusterSummary, ClusterDetail, TimelineEvent, IngestJob, AnalyticsData } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }
  const json = await res.json();
  return json.data ?? json;
}

export const api = {
  /** Fetch all topic clusters (summary) */
  getClusters: () => apiFetch<ClusterSummary[]>('/clusters'),

  /** Fetch a single cluster with its articles */
  getCluster: (id: number) => apiFetch<ClusterDetail>(`/clusters/${id}`),

  /** Fetch timeline events for the visualization */
  getTimeline: () => apiFetch<TimelineEvent[]>('/timeline'),

  /** Fetch news intelligence and analytics metrics */
  getAnalytics: () => apiFetch<AnalyticsData>('/analytics'),

  /** Trigger a new ingest pipeline run */
  triggerIngest: async (): Promise<{ jobId: string; status: string; startedAt: string }> => {
    const res = await fetch(`${API_BASE}/ingest/trigger`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to trigger ingest');
    return json;
  },

  /** Poll the status of an ingest job */
  getIngestStatus: (jobId: string) =>
    apiFetch<IngestJob>(`/ingest/status/${jobId}`),
};
