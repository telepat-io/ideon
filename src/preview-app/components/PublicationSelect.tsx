import React from 'react';
import type { PreviewArticleListItem, PreviewPublicationSummary } from '../../types/preview.js';
import { countByPublication } from '../filterGenerations.js';

interface PublicationSelectProps {
  publications: PreviewPublicationSummary[];
  articles: PreviewArticleListItem[];
  activePub: 'all' | string;
  open: boolean;
  onToggle: () => void;
  onSelect: (slug: 'all' | string) => void;
  onClose: () => void;
}

export function PublicationSelect({
  publications,
  articles,
  activePub,
  open,
  onToggle,
  onSelect,
  onClose,
}: PublicationSelectProps) {
  const activeLabel = activePub === 'all'
    ? 'All Publications'
    : (publications.find((publication) => publication.slug === activePub)?.name ?? activePub);

  return (
    <div className={`pub-select${open ? ' open' : ''}`}>
      <button
        type="button"
        className="pub-select-trigger"
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
        <div className="pub-select-menu" role="listbox">
          <button
            type="button"
            className={`pub-select-option${activePub === 'all' ? ' active' : ''}`}
            role="option"
            aria-selected={activePub === 'all'}
            onClick={() => { onSelect('all'); onClose(); }}
          >
            <span>All Publications</span>
            <span className="pub-select-option-count">{countByPublication(articles, 'all')}</span>
          </button>
          {publications.map((publication) => (
            <button
              key={publication.slug}
              type="button"
              className={`pub-select-option${activePub === publication.slug ? ' active' : ''}`}
              role="option"
              aria-selected={activePub === publication.slug}
              onClick={() => { onSelect(publication.slug); onClose(); }}
            >
              <span>{publication.name}</span>
              <span className="pub-select-option-count">{countByPublication(articles, publication.slug)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
