import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PreviewArticleOutput } from '../../types/preview.js';
import { renderFormatPreview, supportsSectionOutline, type FormatPreviewContext } from '../formatPreview/index.js';
import { extractOutlineFromHtml, injectHeadingIds } from '../outline.js';
import { VariantTabs } from './GenerationHeader.js';

interface ContentViewProps extends FormatPreviewContext {
  output: PreviewArticleOutput | null;
  outputs: PreviewArticleOutput[];
  activeOutputId: string;
  onSelectOutput: (id: string) => void;
}

export function ContentView({
  output,
  outputs,
  activeOutputId,
  onSelectOutput,
  generationId,
  metaJson,
  publicationName,
  publicationSlug,
  authorName,
  authorSlug,
}: ContentViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeOutlineId, setActiveOutlineId] = useState('');
  const [tocOpen, setTocOpen] = useState(false);

  const showOutline = output ? supportsSectionOutline(output.contentType) : false;

  const htmlWithIds = useMemo(() => {
    if (!output) {
      return '';
    }

    const wrapped = renderFormatPreview({
      contentType: output.contentType,
      htmlBody: output.htmlBody,
      markdownBody: output.markdownBody,
      title: output.title,
      generationId,
      metaJson,
      publicationName,
      publicationSlug,
      authorName,
      authorSlug,
    });

    return injectHeadingIds(wrapped);
  }, [authorName, authorSlug, generationId, metaJson, output, publicationName, publicationSlug]);

  const outline = useMemo(() => {
    if (!showOutline) {
      return [];
    }

    return extractOutlineFromHtml(htmlWithIds);
  }, [htmlWithIds, showOutline]);

  const effectiveOutlineId = activeOutlineId || outline[0]?.id || '';

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || outline.length === 0) {
      return;
    }

    const onScroll = () => {
      let current = outline[0]?.id ?? '';
      for (const item of outline) {
        const element = container.querySelector(`#${item.id}`);
        if (!element) {
          continue;
        }

        const top = element.getBoundingClientRect().top - container.getBoundingClientRect().top;
        if (top <= 24) {
          current = item.id;
        }
      }

      setActiveOutlineId(current);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [outline]);

  const scrollToSection = (sectionId: string) => {
    const container = scrollRef.current;
    const target = container?.querySelector(`#${sectionId}`);
    if (!container || !target) {
      return;
    }

    const y = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 12;
    container.scrollTo({ top: y, behavior: 'smooth' });
    setActiveOutlineId(sectionId);
    setTocOpen(false);
  };

  if (!output) {
    return (
      <section className="view-content active" id="view-content">
        <div className="empty-state">No content outputs found for this generation.</div>
      </section>
    );
  }

  return (
    <section className="view-content active" id="view-content" ref={scrollRef}>
      {outline.length > 0 ? (
        <nav className="content-outline">
          {outline.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`outline-item level-${item.level}${item.id === effectiveOutlineId ? ' active' : ''}`}
              onClick={() => scrollToSection(item.id)}
            >
              {item.text}
            </button>
          ))}
        </nav>
      ) : null}

      <div className="rendered-content">
        <VariantTabs outputs={outputs} activeOutputId={activeOutputId} onSelect={onSelectOutput} />
        <div dangerouslySetInnerHTML={{ __html: htmlWithIds }} />
      </div>

      {outline.length > 0 ? (
        <>
          <button type="button" className="toc-float" title="Table of Contents" onClick={() => setTocOpen((open) => !open)}>
            TOC
          </button>
          <div className={`popover${tocOpen ? ' show' : ''}`}>
            {outline.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`outline-item level-${item.level}${item.id === effectiveOutlineId ? ' active' : ''}`}
                onClick={() => scrollToSection(item.id)}
              >
                {item.text}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
