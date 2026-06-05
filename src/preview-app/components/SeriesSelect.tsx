import React, { useMemo } from 'react';
import type { PreviewArticleListItem, PreviewSeriesSummary } from '../../types/preview.js';
import { countByPublication, countBySeries } from '../filterGenerations.js';

interface SeriesSelectProps {
  seriesList: PreviewSeriesSummary[];
  articles: PreviewArticleListItem[];
  activePub: 'all' | string;
  activeSeries: string | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (slug: string | null) => void;
  onClose: () => void;
}

export function SeriesSelect({
  seriesList,
  articles,
  activePub,
  activeSeries,
  open,
  onToggle,
  onSelect,
  onClose,
}: SeriesSelectProps) {
  const relevantSeries = useMemo(() => {
    return seriesList.filter((series) => {
      if (activePub === 'all') {
        return true;
      }

      return series.publication === activePub;
    });
  }, [activePub, seriesList]);

  const allCount = countByPublication(articles, activePub);
  const activeLabel = activeSeries
    ? (relevantSeries.find((series) => series.slug === activeSeries)?.name ?? 'All Content')
    : 'All Content';

  return (
    <div className={`series-select${open ? ' open' : ''}`}>
      <button
        type="button"
        className="series-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>{activeLabel}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open ? (
        <div className="series-select-menu" role="listbox">
          <button
            type="button"
            className={`series-select-option${activeSeries === null ? ' active' : ''}`}
            role="option"
            aria-selected={activeSeries === null}
            onClick={() => { onSelect(null); onClose(); }}
          >
            <div className="series-select-option-left">
              <span className="series-select-option-icon">☰</span>
              <span>All Content</span>
            </div>
            <span className="series-select-option-count">
              {allCount} article{allCount !== 1 ? 's' : ''}
            </span>
          </button>
          {relevantSeries.map((series) => {
            const count = countBySeries(articles, series.slug, activePub);
            return (
              <button
                key={series.slug}
                type="button"
                className={`series-select-option${activeSeries === series.slug ? ' active' : ''}`}
                role="option"
                aria-selected={activeSeries === series.slug}
                onClick={() => { onSelect(series.slug); onClose(); }}
              >
                <div className="series-select-option-left">
                  <span className="series-select-option-icon">◈</span>
                  <span>{series.name}</span>
                </div>
                <span className="series-select-option-count">
                  {count} article{count !== 1 ? 's' : ''}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
