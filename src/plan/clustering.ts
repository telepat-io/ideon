import type { OpenRouterClient } from '../llm/openRouterClient.js';
import type { AppSettings } from '../config/schema.js';
import type { KeywordCandidate, Cluster, Clusters } from '../types/plan.js';
import { clustersSchema } from '../types/plan.js';
import { buildClusterFormationMessages } from '../llm/prompts/clusterFormation.js';

export interface ClusterFormationParams {
  desiredSeriesCount: number;
}

export async function formClusters(
  client: OpenRouterClient,
  settings: AppSettings,
  input: {
    shortlist: KeywordCandidate[];
    coverageMapKeys: string[];
    excludeSeries: string[];
    desiredSeriesCount: number;
    countryCodes: string[];
    language: string;
  },
): Promise<Cluster[]> {
  const messages = buildClusterFormationMessages({
    shortlist: input.shortlist,
    coverageMapKeys: input.coverageMapKeys,
    excludeSeries: input.excludeSeries,
    desiredSeriesCount: input.desiredSeriesCount,
    countryCodes: input.countryCodes,
    language: input.language,
  });

  const result = await client.requestStructured<Clusters>({
    schemaName: 'Clusters',
    schema: clustersSchema.shape,
    messages,
    settings,
    parse: clustersSchema.parse,
  });

  return result.clusters;
}

export function clusterKeywordMap(clusters: Cluster[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const cluster of clusters) {
    map.set(cluster.pillarKeyword.toLowerCase(), cluster.seriesName);
    for (const kw of cluster.supportingKeywords) {
      map.set(kw.toLowerCase(), cluster.seriesName);
    }
  }

  return map;
}
