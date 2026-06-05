import React from 'react';
import type { PreviewArticleContent } from '../../types/preview.js';
import { generationAssetUrl } from '../format.js';

interface PlanAssetsViewProps {
  detail: PreviewArticleContent;
  publicationName: string | null;
  seriesName: string | null;
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function PlanAssetsView({ detail, publicationName, seriesName }: PlanAssetsViewProps) {
  const meta = detail.metaJson;

  if (!meta) {
    return (
      <section className="view-content active" id="view-plan">
        <div className="empty-state">No plan metadata available for this generation.</div>
      </section>
    );
  }

  const publicationLabel = publicationName ?? meta.publication ?? '—';
  const seriesLabel = seriesName ?? meta.series ?? '—';

  return (
    <section className="view-content active" id="view-plan">
      <div className="plan-section">
        <div className="plan-section-title">Original Idea</div>
        <div className="idea-card">{meta.idea}</div>
      </div>

      <div className="plan-section">
        <div className="plan-section-title">Content Plan</div>
        {meta.sections.length > 0 ? (
          meta.sections.map((section, index) => (
            <div key={`${section.title}-${index}`} className="plan-section-card">
              <div className="plan-section-card-num">Section {index + 1}</div>
              <div className="plan-section-card-title">{section.title}</div>
              <div className="plan-section-card-desc">{section.description}</div>
            </div>
          ))
        ) : (
          <p className="plan-empty-note">No content plan sections recorded.</p>
        )}
      </div>

      <div className="plan-section">
        <div className="plan-section-title">Image Gallery</div>
        {meta.images.length > 0 ? (
          <div className="image-gallery">
            {meta.images.map((image) => (
              <div key={image.id} className="image-card">
                <div className="image-card-thumb">
                  <img
                    src={generationAssetUrl(detail.generationId, image.relativePath)}
                    alt={image.description}
                    loading="lazy"
                  />
                </div>
                <div className="image-card-info">
                  <div className="image-card-kind">{image.kind}</div>
                  <div className="image-card-desc">{image.description}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="plan-empty-note">No images generated for this article.</p>
        )}
      </div>

      <div className="plan-section">
        <div className="plan-section-title">Generation Metadata</div>
        <div className="plan-meta-grid">
          <div className="plan-section-card">
            <div className="plan-section-card-num">Style</div>
            <div className="plan-section-card-title">{meta.style}</div>
          </div>
          <div className="plan-section-card">
            <div className="plan-section-card-num">Intent</div>
            <div className="plan-section-card-title">{meta.intent}</div>
          </div>
          <div className="plan-section-card">
            <div className="plan-section-card-num">Length</div>
            <div className="plan-section-card-title">{meta.targetLength ?? '—'}</div>
          </div>
          <div className="plan-section-card">
            <div className="plan-section-card-num">Content Type</div>
            <div className="plan-section-card-title">{meta.contentType}</div>
          </div>
          <div className="plan-section-card">
            <div className="plan-section-card-num">Angle</div>
            <div className="plan-section-card-title">{meta.angle ?? '—'}</div>
          </div>
          <div className="plan-section-card">
            <div className="plan-section-card-num">Generated</div>
            <div className="plan-section-card-title">{formatGeneratedAt(meta.generatedAt)}</div>
          </div>
        </div>

        <div className="plan-meta-detail">
          <div className="plan-section-card-num">Publication</div>
          <div className="plan-section-card-title plan-meta-detail-value">{publicationLabel}</div>
        </div>

        <div className="plan-meta-detail plan-meta-detail--compact">
          <div className="plan-section-card-num">Series</div>
          <div className="plan-section-card-title plan-meta-detail-value">{seriesLabel}</div>
        </div>

        <div className="plan-meta-detail plan-meta-detail--compact">
          <div className="plan-section-card-num">Keywords</div>
          {meta.keywords.length > 0 ? (
            <div className="plan-meta-keywords">
              {meta.keywords.map((keyword) => (
                <span key={keyword} className="kw-tag">{keyword}</span>
              ))}
            </div>
          ) : (
            <div className="plan-section-card-title plan-meta-detail-value">—</div>
          )}
        </div>
      </div>
    </section>
  );
}
