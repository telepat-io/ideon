import React from 'react';
import type { PreviewArticleContent, PreviewArticleOutput } from '../../types/preview.js';
import { formatDuration, formatUsd } from '../format.js';
import { groupOutputsByType, sortContentTypes } from '../interactions.js';

interface GenerationHeaderProps {
  detail: PreviewArticleContent;
  activeView: 'content' | 'plan' | 'logs';
  activeType: string;
  publicationName: string | null;
  seriesName: string | null;
  onSelectType: (contentType: string) => void;
  onFilterPublication: (slug: string) => void;
  onFilterSeries: (slug: string) => void;
}

export function GenerationHeader({
  detail,
  activeView,
  activeType,
  publicationName,
  seriesName,
  onSelectType,
  onFilterPublication,
  onFilterSeries,
}: GenerationHeaderProps) {
  const grouped = groupOutputsByType(detail.outputs);
  const contentTypes = sortContentTypes(Object.keys(grouped));
  const keywords = detail.metaJson?.keywords ?? [];
  const analytics = detail.analyticsSummary;

  const formatTabs = contentTypes.map((contentType) => {
    const first = grouped[contentType]?.[0];
    const label = first?.contentTypeLabel ?? contentType;
    return (
      <button
        key={contentType}
        type="button"
        className={`gen-format-tab${activeType === contentType ? ' active' : ''}`}
        onClick={() => onSelectType(contentType)}
      >
        {label}
      </button>
    );
  });

  const keywordBadges = keywords.slice(0, 5).map((keyword) => (
    <span key={keyword} className="gen-header-badge kw">{keyword}</span>
  ));

  return (
    <div className="gen-header">
      <div className="gen-header-left">
        <div className="gen-header-title">{detail.title}</div>
        <div className="gen-header-meta">
          <span className="gen-header-meta-item">ID: {detail.generationId}</span>
          <span className="gen-header-meta-item">Source: {detail.sourcePath}</span>
        </div>
        {(publicationName || seriesName || keywordBadges.length > 0) ? (
          <div className="gen-header-badges">
            {publicationName && detail.metaJson?.publication ? (
              <button
                type="button"
                className="gen-header-badge pub"
                onClick={() => onFilterPublication(detail.metaJson!.publication!)}
              >
                {publicationName}
              </button>
            ) : null}
            {seriesName && detail.metaJson?.series ? (
              <button
                type="button"
                className="gen-header-badge series"
                onClick={() => onFilterSeries(detail.metaJson!.series!)}
              >
                {seriesName}
              </button>
            ) : null}
            {keywordBadges}
          </div>
        ) : null}
        {seriesName && detail.metaJson?.series ? (
          <div className="gen-header-series">
            Part of series:{' '}
            <button type="button" onClick={() => onFilterSeries(detail.metaJson!.series!)}>
              {seriesName}
            </button>
          </div>
        ) : null}
        {activeView === 'content' && formatTabs.length > 0 ? (
          <div className="gen-format-tabs">{formatTabs}</div>
        ) : null}
      </div>
      <div className="gen-header-right">
        <span className="gen-header-meta-item">{formatDuration(analytics?.totalDurationMs ?? null)}</span>
        <span className="gen-header-meta-item">
          {formatUsd(analytics?.totalCostUsd ?? null)}
          {analytics?.totalCostSource ? ` (${analytics.totalCostSource})` : ''}
        </span>
      </div>
    </div>
  );
}

export function VariantTabs({
  outputs,
  activeOutputId,
  onSelect,
}: {
  outputs: PreviewArticleOutput[];
  activeOutputId: string;
  onSelect: (id: string) => void;
}) {
  if (outputs.length <= 1) {
    return null;
  }

  return (
    <div className="gen-variant-tabs">
      {outputs.map((output) => (
        <button
          key={output.id}
          type="button"
          className={`gen-variant-tab${output.id === activeOutputId ? ' active' : ''}`}
          onClick={() => onSelect(output.id)}
        >
          {output.contentTypeLabel} {output.index}
        </button>
      ))}
    </div>
  );
}
