import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  PreviewArticleContent,
  PreviewArticleListItem,
  PreviewArticleOutput,
  PreviewBootstrapData,
  PreviewPublicationSummary,
  PreviewSeriesSummary,
} from '../types/preview.js';
import {
  loadPreviewArticle,
  loadPreviewArticles,
  loadPreviewBootstrap,
  loadPreviewPublications,
  loadPreviewSeries,
} from './api.js';
import { ContentView } from './components/ContentView.js';
import { GenerationHeader } from './components/GenerationHeader.js';
import { Header } from './components/Header.js';
import { LogsView } from './components/LogsView.js';
import { MetadataDrawer } from './components/MetadataDrawer.js';
import { PlanAssetsView } from './components/PlanAssetsView.js';
import { Sidebar } from './components/Sidebar.js';
import { ViewTabs, type PreviewView } from './components/ViewTabs.js';
import { filterGenerations } from './filterGenerations.js';
import { generationAssetUrl } from './format.js';
import { groupOutputsByType, sortContentTypes } from './interactions.js';

function buildInitialSelection(detail: PreviewArticleContent): {
  activeType: string;
  activeOutputId: string;
} {
  const groupedOutputs = groupOutputsByType(detail.outputs);
  const contentTypes = sortContentTypes(Object.keys(groupedOutputs));
  const activeType = contentTypes[0] ?? '';
  const activeOutputId = groupedOutputs[activeType]?.[0]?.id ?? '';

  return { activeType, activeOutputId };
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}

export default function PreviewApp() {
  const [bootstrap, setBootstrap] = useState<PreviewBootstrapData | null>(null);
  const [articles, setArticles] = useState<PreviewArticleListItem[]>([]);
  const [publications, setPublications] = useState<PreviewPublicationSummary[]>([]);
  const [seriesList, setSeriesList] = useState<PreviewSeriesSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [detail, setDetail] = useState<PreviewArticleContent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<PreviewView>('content');
  const [activeType, setActiveType] = useState('');
  const [activeOutputId, setActiveOutputId] = useState('');
  const [activePub, setActivePub] = useState<'all' | string>('all');
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pubSelectOpen, setPubSelectOpen] = useState(false);
  const [seriesSelectOpen, setSeriesSelectOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const publicationNameBySlug = useMemo(() => {
    return new Map(publications.map((publication) => [publication.slug, publication.name]));
  }, [publications]);

  const groupedOutputs = useMemo(() => {
    return detail ? groupOutputsByType(detail.outputs) : {};
  }, [detail]);

  const activeOutputs = useMemo(() => {
    return groupedOutputs[activeType] ?? [];
  }, [activeType, groupedOutputs]);

  const activeOutput = useMemo((): PreviewArticleOutput | null => {
    return activeOutputs.find((output) => output.id === activeOutputId) ?? activeOutputs[0] ?? null;
  }, [activeOutputId, activeOutputs]);

  const resolvedPublication = useMemo(() => {
    const slug = detail?.metaJson?.publication;
    if (!slug) {
      return null;
    }

    return publications.find((publication) => publication.slug === slug) ?? null;
  }, [detail?.metaJson?.publication, publications]);

  const resolvedSeries = useMemo(() => {
    const slug = detail?.metaJson?.series;
    if (!slug) {
      return null;
    }

    return seriesList.find((series) => series.slug === slug) ?? null;
  }, [detail?.metaJson?.series, seriesList]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const loadInitialData = useCallback(async () => {
    setListLoading(true);
    setListError(null);

    try {
      const [nextBootstrap, nextArticles, nextPublications, nextSeries] = await Promise.all([
        loadPreviewBootstrap(),
        loadPreviewArticles(),
        loadPreviewPublications(),
        loadPreviewSeries(),
      ]);

      const nextSlug = nextBootstrap.currentSlug || nextArticles[0]?.slug || '';

      setBootstrap(nextBootstrap);
      setArticles(nextArticles);
      setPublications(nextPublications);
      setSeriesList(nextSeries);
      setSelectedSlug(nextSlug);
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Failed to load preview data.');
    } finally {
      setListLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (slug: string) => {
    if (!slug) {
      setDetail(null);
      setDetailError(null);
      return;
    }

    setDetailLoading(true);
    setDetailError(null);

    try {
      const nextDetail = await loadPreviewArticle(slug);
      const selection = buildInitialSelection(nextDetail);

      setDetail(nextDetail);
      setActiveType(selection.activeType);
      setActiveOutputId(selection.activeOutputId);
      setActiveView('content');
      setDrawerOpen(false);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Failed to load generation.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!selectedSlug) {
      return;
    }

    void loadDetail(selectedSlug);
  }, [loadDetail, selectedSlug]);

  useEffect(() => {
    document.title = detail?.title ? `${detail.title} | Ideon Preview` : 'Ideon Preview';
  }, [detail?.title]);

  useEffect(() => {
    const filtered = filterGenerations(articles, {
      activePub,
      activeSeries,
      searchQuery: debouncedSearch,
    });

    if (!selectedSlug) {
      return;
    }

    if (!filtered.some((article) => article.slug === selectedSlug)) {
      const next = filtered[0];
      if (next) {
        setSelectedSlug(next.slug);
      } else {
        setSelectedSlug('');
        setDetail(null);
      }
    }
  }, [activePub, activeSeries, articles, debouncedSearch, selectedSlug]);

  const onSelectSlug = (slug: string) => {
    setSelectedSlug(slug);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const onSelectPublication = (slug: 'all' | string) => {
    setActivePub(slug);
    setActiveSeries(null);
  };

  const onCopyMarkdown = async () => {
    if (!activeOutput?.markdownBody) {
      showToast('No markdown available.');
      return;
    }

    await navigator.clipboard.writeText(activeOutput.markdownBody);
    showToast('Markdown copied');
  };

  const onDownloadMeta = async () => {
    if (!detail) {
      return;
    }

    const url = generationAssetUrl(detail.generationId, 'meta.json');
    const response = await fetch(url);
    if (!response.ok) {
      showToast('Failed to download meta.json');
      return;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = 'meta.json';
    anchor.click();
    URL.revokeObjectURL(objectUrl);
    showToast('Download started');
  };

  const onCopyPath = async () => {
    if (!detail?.sourcePath) {
      return;
    }

    await navigator.clipboard.writeText(detail.sourcePath);
    showToast('Path copied');
  };

  const emptyMessage = bootstrap?.emptyStateMessage ?? 'No generated content found yet.';

  return (
    <div id="app" className="glow-bg">
      <Header
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onRefresh={() => void loadInitialData()}
        onOpenDrawer={() => setDrawerOpen(true)}
        onCopyMarkdown={() => void onCopyMarkdown()}
        onDownloadMeta={() => void onDownloadMeta()}
        onCopyPath={() => void onCopyPath()}
        actionsOpen={actionsOpen}
        onToggleActions={() => setActionsOpen((open) => !open)}
        onCloseActions={() => setActionsOpen(false)}
        toastMessage={toastMessage}
      />

      <Sidebar
        open={sidebarOpen}
        articles={articles}
        publications={publications}
        seriesList={seriesList}
        selectedSlug={selectedSlug}
        activePub={activePub}
        activeSeries={activeSeries}
        searchQuery={searchQuery}
        pubSelectOpen={pubSelectOpen}
        seriesSelectOpen={seriesSelectOpen}
        publicationNameBySlug={publicationNameBySlug}
        onSearchChange={setSearchQuery}
        onSelectSlug={onSelectSlug}
        onSelectPublication={onSelectPublication}
        onSelectSeries={setActiveSeries}
        onTogglePubSelect={() => { setPubSelectOpen((open) => !open); setSeriesSelectOpen(false); }}
        onToggleSeriesSelect={() => { setSeriesSelectOpen((open) => !open); setPubSelectOpen(false); }}
        onClosePubSelect={() => setPubSelectOpen(false)}
        onCloseSeriesSelect={() => setSeriesSelectOpen(false)}
      />

      <button
        type="button"
        className={`sidebar-backdrop${sidebarOpen ? ' open' : ''}`}
        aria-label="Close sidebar"
        onClick={() => setSidebarOpen(false)}
      />

      <main id="main-content">
        <ViewTabs activeView={activeView} onChange={setActiveView} variant="desktop" />

        {listError ? (
          <div className="message-card message-card--error">
            <h3>Unable to load preview index</h3>
            <p>{listError}</p>
          </div>
        ) : null}

        {!listLoading && articles.length === 0 ? (
          <div className="empty-state">{emptyMessage}</div>
        ) : null}

        {articles.length > 0 ? (
          <>
            {detailLoading ? (
              <div className="empty-state">Loading generation...</div>
            ) : detailError ? (
              <div className="message-card message-card--error">
                <h3>Unable to load generation</h3>
                <p>{detailError}</p>
              </div>
            ) : detail ? (
              <>
                <GenerationHeader
                  detail={detail}
                  activeView={activeView}
                  activeType={activeType}
                  publicationName={resolvedPublication?.name ?? null}
                  seriesName={resolvedSeries?.name ?? null}
                  onSelectType={(nextType) => {
                    setActiveType(nextType);
                    setActiveOutputId(groupedOutputs[nextType]?.[0]?.id ?? '');
                  }}
                  onFilterPublication={onSelectPublication}
                  onFilterSeries={(slug) => setActiveSeries((current) => (current === slug ? null : slug))}
                />

                {activeView === 'content' ? (
                  <ContentView
                    key={activeOutput?.id ?? 'no-output'}
                    output={activeOutput}
                    outputs={activeOutputs}
                    activeOutputId={activeOutputId}
                    onSelectOutput={setActiveOutputId}
                    generationId={detail.generationId}
                    metaJson={detail.metaJson}
                    publicationName={resolvedPublication?.name ?? null}
                    publicationSlug={detail.metaJson?.publication ?? null}
                  />
                ) : null}

                {activeView === 'plan' ? (
                  <PlanAssetsView
                    detail={detail}
                    publicationName={resolvedPublication?.name ?? null}
                    seriesName={resolvedSeries?.name ?? null}
                  />
                ) : null}

                {activeView === 'logs' ? <LogsView detail={detail} /> : null}
              </>
            ) : (
              <div className="empty-state">No generation selected.</div>
            )}
          </>
        ) : null}
      </main>

      <ViewTabs activeView={activeView} onChange={setActiveView} variant="mobile" />

      <MetadataDrawer
        open={drawerOpen}
        detail={detail}
        publication={resolvedPublication}
        series={resolvedSeries}
        onClose={() => setDrawerOpen(false)}
      />

    </div>
  );
}
