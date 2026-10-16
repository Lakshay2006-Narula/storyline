// types/index.ts — shared TypeScript types for Storyline

export interface Article {
  id: number;
  url: string;
  headline: string;
  summary: string;
  sourceId: string;
  sourceName: string;
  publishedAt: string | null;
  scrapeOk: boolean;
}

export interface ClusterSummary {
  id: number;
  label: string;
  keywords: string[];
  articleCount: number;
  earliestAt: string | null;
  latestAt: string | null;
  createdAt: string;
}

export interface ClusterDetail extends ClusterSummary {
  articles: Article[];
}

export interface TimelineEvent {
  id: number;
  label: string;
  keywords: string[];
  startTime: string;
  endTime: string;
  articleCount: number;
  intensity: number; // 0–1
  sources: {
    sourceId: string;
    sourceName: string;
    articleCount: number;
  }[];
}

export interface IngestJob {
  jobId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  summary: {
    articles_fetched: number;
    articles_new: number;
    clusters_created: number;
    elapsed_seconds: number;
  } | null;
  error: string | null;
}

export interface AnalyticsData {
  summary: {
    totalArticles: number;
    enrichedArticles: number;
    enrichmentRate: number;
    totalClusters: number;
    avgClusterSize: number;
    multiSourceStoryCount: number;
    singleSourceStoryCount: number;
    consensusRate: number;
  };
  sourceBreakdown: {
    sourceId: string;
    sourceName: string;
    count: number;
    percentage: number;
  }[];
  topicRanking: {
    id: number;
    label: string;
    keywords: string[];
    articleCount: number;
    earliestAt: string | null;
    latestAt: string | null;
  }[];
  temporalActivity: {
    date: string;
    count: number;
  }[];
  pythonEngine: {
    pipeline: string;
    algorithm: string;
    vocabularyFeatures: number;
    ngramRange: string;
    centroidWeighting: string;
    deduplicationStrategy: string;
    extractionEngines: string[];
    dbStorage: string;
  };
}
