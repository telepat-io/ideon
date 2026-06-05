import React from 'react';
import type {
  PreviewArticleContent,
  PreviewPublicationSummary,
  PreviewSeriesSummary,
} from '../../types/preview.js';

interface MetadataDrawerProps {
  open: boolean;
  detail: PreviewArticleContent | null;
  publication: PreviewPublicationSummary | null;
  series: PreviewSeriesSummary | null;
  onClose: () => void;
}

function PolicyFields({ policy }: { policy: PreviewPublicationSummary['editorialPolicy'] }) {
  return (
    <>
      {policy.tone ? (
        <div className="drawer-field">
          <span className="drawer-field-label">Tone</span>
          <span className="drawer-field-value">{policy.tone}</span>
        </div>
      ) : null}
      {policy.forbiddenTopics.length > 0 ? (
        <div className="drawer-field">
          <span className="drawer-field-label">Forbidden Topics</span>
          <span className="drawer-field-value">{policy.forbiddenTopics.join(', ')}</span>
        </div>
      ) : null}
      {policy.disclosureRequirements.length > 0 ? (
        <div className="drawer-field">
          <span className="drawer-field-label">Disclosures</span>
          <span className="drawer-field-value">{policy.disclosureRequirements.join(', ')}</span>
        </div>
      ) : null}
      {policy.audienceRestrictions.length > 0 ? (
        <div className="drawer-field">
          <span className="drawer-field-label">Audience Restrictions</span>
          <span className="drawer-field-value">{policy.audienceRestrictions.join(', ')}</span>
        </div>
      ) : null}
      {policy.notes ? (
        <div className="drawer-field">
          <span className="drawer-field-label">Notes</span>
          <span className="drawer-field-value">{policy.notes}</span>
        </div>
      ) : null}
    </>
  );
}

function DefaultsFields({ defaults }: { defaults: PreviewPublicationSummary['defaults'] }) {
  const entries: Array<[string, string]> = [];
  if (defaults.style) entries.push(['Style', defaults.style]);
  if (defaults.intent) entries.push(['Intent', defaults.intent]);
  if (defaults.targetLength !== undefined) entries.push(['Length', String(defaults.targetLength)]);
  if (defaults.targetAudienceHint) entries.push(['Audience', defaults.targetAudienceHint]);
  if (defaults.language) entries.push(['Language', defaults.language]);
  if (defaults.countryCodes?.length) entries.push(['Country', defaults.countryCodes.join(', ')]);
  if (defaults.maxImages !== undefined) entries.push(['Max Images', String(defaults.maxImages)]);
  if (defaults.maxLinks !== undefined) entries.push(['Max Links', String(defaults.maxLinks)]);
  if (defaults.model) entries.push(['Model', defaults.model]);
  if (defaults.temperature !== undefined) entries.push(['Temperature', String(defaults.temperature)]);
  if (defaults.maxTokens !== undefined) entries.push(['Max Tokens', String(defaults.maxTokens)]);
  if (defaults.topP !== undefined) entries.push(['Top P', String(defaults.topP)]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="drawer-subsection">
      <h4>Defaults</h4>
      {entries.map(([label, value]) => (
        <div key={label} className="drawer-field">
          <span className="drawer-field-label">{label}</span>
          <span className="drawer-field-value">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function MetadataDrawer({ open, detail, publication, series, onClose }: MetadataDrawerProps) {
  const meta = detail?.metaJson ?? null;

  return (
    <>
      <button type="button" className={`drawer-backdrop${open ? ' open' : ''}`} aria-label="Close drawer" onClick={onClose} />
      <aside id="metadata-drawer" className={open ? 'open' : undefined}>
        <div className="drawer-header">
          <h2>Generation Details</h2>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close drawer" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="drawer-body">
          {publication ? (
            <div className="drawer-block">
              <div className="drawer-block-title">Publication Context</div>
              <div className="drawer-subsection">
                <h4>{publication.name}</h4>
                <div className="drawer-field">
                  <span className="drawer-field-label">Slug</span>
                  <span className="drawer-field-value">{publication.slug}</span>
                </div>
                <PolicyFields policy={publication.editorialPolicy} />
              </div>
              <DefaultsFields defaults={publication.defaults} />
            </div>
          ) : null}

          {series ? (
            <div className="drawer-block">
              <div className="drawer-block-title">Series Context</div>
              <div className="drawer-subsection">
                <h4>{series.name}</h4>
                <div className="drawer-field">
                  <span className="drawer-field-label">Slug</span>
                  <span className="drawer-field-value">{series.slug}</span>
                </div>
                {series.topic ? (
                  <div className="drawer-field">
                    <span className="drawer-field-label">Topic</span>
                    <span className="drawer-field-value">{series.topic}</span>
                  </div>
                ) : null}
                <PolicyFields policy={series.editorialPolicy} />
              </div>
              <DefaultsFields defaults={series.defaults} />
            </div>
          ) : null}

          {meta ? (
            <div className="drawer-block">
              <div className="drawer-block-title">Generation Metadata</div>
              <div className="drawer-subsection">
                <div className="drawer-field">
                  <span className="drawer-field-label">Idea</span>
                  <span className="drawer-field-value">{meta.idea}</span>
                </div>
                <div className="drawer-field">
                  <span className="drawer-field-label">Description</span>
                  <span className="drawer-field-value">{meta.description}</span>
                </div>
                {meta.subtitle ? (
                  <div className="drawer-field">
                    <span className="drawer-field-label">Subtitle</span>
                    <span className="drawer-field-value">{meta.subtitle}</span>
                  </div>
                ) : null}
                {meta.angle ? (
                  <div className="drawer-field">
                    <span className="drawer-field-label">Angle</span>
                    <span className="drawer-field-value">{meta.angle}</span>
                  </div>
                ) : null}
                <div className="drawer-field">
                  <span className="drawer-field-label">Content Type</span>
                  <span className="drawer-field-value">{meta.contentType}</span>
                </div>
                <div className="drawer-field">
                  <span className="drawer-field-label">Generated At</span>
                  <span className="drawer-field-value">{meta.generatedAt}</span>
                </div>
                {meta.keywords.length > 0 ? (
                  <div className="drawer-keywords">
                    {meta.keywords.map((keyword) => (
                      <span key={keyword} className="kw-tag">{keyword}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
