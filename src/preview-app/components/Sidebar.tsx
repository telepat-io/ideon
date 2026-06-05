import React, { useMemo } from 'react';
import type { PreviewArticleListItem, PreviewPublicationSummary, PreviewSeriesSummary } from '../../types/preview.js';
import { filterGenerations, groupArticlesByDate } from '../filterGenerations.js';
import { PublicationSelect } from './PublicationSelect.js';
import { SeriesSelect } from './SeriesSelect.js';

interface SidebarProps {
  open: boolean;
  articles: PreviewArticleListItem[];
  publications: PreviewPublicationSummary[];
  seriesList: PreviewSeriesSummary[];
  selectedSlug: string;
  activePub: 'all' | string;
  activeSeries: string | null;
  searchQuery: string;
  pubSelectOpen: boolean;
  seriesSelectOpen: boolean;
  publicationNameBySlug: Map<string, string>;
  onSearchChange: (value: string) => void;
  onSelectSlug: (slug: string) => void;
  onSelectPublication: (slug: 'all' | string) => void;
  onSelectSeries: (slug: string | null) => void;
  onTogglePubSelect: () => void;
  onToggleSeriesSelect: () => void;
  onClosePubSelect: () => void;
  onCloseSeriesSelect: () => void;
}

export function Sidebar({
  open,
  articles,
  publications,
  seriesList,
  selectedSlug,
  activePub,
  activeSeries,
  searchQuery,
  pubSelectOpen,
  seriesSelectOpen,
  publicationNameBySlug,
  onSearchChange,
  onSelectSlug,
  onSelectPublication,
  onSelectSeries,
  onTogglePubSelect,
  onToggleSeriesSelect,
  onClosePubSelect,
  onCloseSeriesSelect,
}: SidebarProps) {
  const filtered = useMemo(() => {
    return filterGenerations(articles, { activePub, activeSeries, searchQuery });
  }, [activePub, activeSeries, articles, searchQuery]);

  const grouped = useMemo(() => groupArticlesByDate(filtered), [filtered]);

  return (
    <aside id="sidebar" className={open ? 'open' : undefined}>
      <div className="sidebar-section">
        <div className="sidebar-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-fg-muted)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search titles, ideas, keywords..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <PublicationSelect
          publications={publications}
          articles={articles}
          activePub={activePub}
          open={pubSelectOpen}
          onToggle={onTogglePubSelect}
          onSelect={onSelectPublication}
          onClose={onClosePubSelect}
        />
        <SeriesSelect
          seriesList={seriesList}
          articles={articles}
          activePub={activePub}
          activeSeries={activeSeries}
          open={seriesSelectOpen}
          onToggle={onToggleSeriesSelect}
          onSelect={onSelectSeries}
          onClose={onCloseSeriesSelect}
        />
      </div>
      <div className="gen-list">
        {filtered.length === 0 ? (
          <div className="sidebar-empty">No generations match your filters.</div>
        ) : (
          Array.from(grouped.entries()).map(([date, items]) => (
            <div key={date}>
              <div className="gen-date-group-header">{date}</div>
              {items.map((article) => {
                const badges: React.ReactNode[] = [];
                if (article.publication) {
                  const name = publicationNameBySlug.get(article.publication) ?? article.publication;
                  badges.push(<span key="pub" className="gen-badge pub">{name}</span>);
                }

                article.keywords.filter(Boolean).slice(0, 3).forEach((keyword) => {
                  badges.push(<span key={keyword} className="gen-badge kw">{keyword}</span>);
                });

                return (
                  <button
                    key={article.slug}
                    type="button"
                    className={`gen-item${article.slug === selectedSlug ? ' active' : ''}`}
                    onClick={() => onSelectSlug(article.slug)}
                  >
                    <div className="gen-item-thumb">
                      {article.coverImageUrl ? (
                        <img src={article.coverImageUrl} alt="" loading="lazy" />
                      ) : (
                        <div className="gen-item-thumb-icon">◫</div>
                      )}
                    </div>
                    <div className="gen-item-body">
                      <div className="gen-item-title">{article.title}</div>
                      <div className="gen-item-snippet">{article.previewSnippet}</div>
                      {badges.length > 0 ? <div className="gen-item-badges">{badges}</div> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
