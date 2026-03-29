import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App as AntApp,
  Button,
  Card,
  ConfigProvider,
  Divider,
  Drawer,
  Empty,
  Flex,
  Grid,
  Layout,
  Segmented,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  BulbOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  GlobalOutlined,
  LinkedinOutlined,
  MailOutlined,
  MenuOutlined,
  MoonOutlined,
  ReloadOutlined,
  TwitterOutlined,
} from '@ant-design/icons';
import type {
  NormalizedPreviewInteraction,
  PreviewArticleContent,
  PreviewArticleListItem,
  PreviewArticleOutput,
  PreviewBootstrapData,
} from '../types/preview.js';
import { loadPreviewArticle, loadPreviewArticles, loadPreviewBootstrap } from './api.js';
import {
  describeInteraction,
  extractInteractionTextSnapshot,
  formatPreviewDate,
  groupInteractionsByStage,
  groupOutputsByType,
  normalizeInteractions,
  sanitizeClassName,
  sortContentTypes,
} from './interactions.js';
import { buildPreviewTheme, type PreviewThemeMode } from './theme.js';

const IDEON_LOGO_PATH = './logo.svg';

const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  'article': <FileTextOutlined />,
  'blog-post': <FileTextOutlined />,
  'x-post': <TwitterOutlined />,
  'x-thread': <TwitterOutlined />,
  'linkedin-post': <LinkedinOutlined />,
  'reddit-post': <GlobalOutlined />,
  'newsletter': <MailOutlined />,
  'landing-page-copy': <GlobalOutlined />,
};

type TopView = 'content' | 'logs';
type InteractionViewMode = 'text' | 'json';

const THEME_STORAGE_KEY = 'ideon-preview-theme';

function getStoredTheme(): PreviewThemeMode | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function getInitialTheme(): PreviewThemeMode {
  const stored = getStoredTheme();
  if (stored) {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function buildInitialSelection(detail: PreviewArticleContent): {
  activeType: string;
  activeOutputId: string;
  selectedInteractionId: string;
} {
  const groupedOutputs = groupOutputsByType(detail.outputs);
  const contentTypes = sortContentTypes(Object.keys(groupedOutputs));
  const activeType = contentTypes[0] ?? '';
  const activeOutputId = groupedOutputs[activeType]?.[0]?.id ?? '';
  const interactions = normalizeInteractions(detail.interactions);

  return {
    activeType,
    activeOutputId,
    selectedInteractionId: interactions[0]?.id ?? '',
  };
}

export default function PreviewApp() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const [themeMode, setThemeMode] = useState<PreviewThemeMode>(getInitialTheme);
  const [bootstrap, setBootstrap] = useState<PreviewBootstrapData | null>(null);
  const [articles, setArticles] = useState<PreviewArticleListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [detail, setDetail] = useState<PreviewArticleContent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState('');
  const [activeOutputId, setActiveOutputId] = useState('');
  const [activeView, setActiveView] = useState<TopView>('content');
  const [selectedInteractionId, setSelectedInteractionId] = useState('');
  const [interactionViewMode, setInteractionViewMode] = useState<InteractionViewMode>('text');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState('');

  const groupedOutputs = useMemo(() => {
    return detail ? groupOutputsByType(detail.outputs) : {};
  }, [detail]);

  const contentTypes = useMemo(() => {
    return sortContentTypes(Object.keys(groupedOutputs));
  }, [groupedOutputs]);

  const activeOutputs = useMemo(() => {
    return groupedOutputs[activeType] ?? [];
  }, [activeType, groupedOutputs]);

  const activeOutput = useMemo(() => {
    return activeOutputs.find((output) => output.id === activeOutputId) ?? activeOutputs[0] ?? null;
  }, [activeOutputId, activeOutputs]);

  const normalizedInteractions = useMemo(() => {
    return detail ? normalizeInteractions(detail.interactions) : [];
  }, [detail]);

  const selectedInteraction = useMemo(() => {
    return normalizedInteractions.find((interaction) => interaction.id === selectedInteractionId)
      ?? normalizedInteractions[0]
      ?? null;
  }, [normalizedInteractions, selectedInteractionId]);

  const stageGroups = useMemo(() => {
    return groupInteractionsByStage(normalizedInteractions);
  }, [normalizedInteractions]);

  const loadInitialData = useCallback(async () => {
    setListLoading(true);
    setListError(null);

    try {
      const [nextBootstrap, nextArticles] = await Promise.all([
        loadPreviewBootstrap(),
        loadPreviewArticles(),
      ]);

      const nextSlug = nextBootstrap.currentSlug || nextArticles[0]?.slug || '';

      setBootstrap(nextBootstrap);
      setArticles(nextArticles);
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
      setInteractionViewMode('text');
      setSelectedInteractionId(selection.selectedInteractionId);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Failed to load generation.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // Ignore local storage write failures.
    }
  }, [themeMode]);

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
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (!getStoredTheme()) {
        setThemeMode(event.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (!copiedSlug) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopiedSlug('');
    }, 1500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [copiedSlug]);

  const sourcePathLabel = detail?.sourcePath ?? bootstrap?.sourcePath ?? 'Resolving preview source...';
  const totalDurationLabel = formatDuration(detail?.analyticsSummary?.totalDurationMs ?? null);
  const totalCostLabel = formatUsd(detail?.analyticsSummary?.totalCostUsd ?? null);
  const costSource = detail?.analyticsSummary?.totalCostSource;

  const onSelectType = (nextType: string) => {
    setActiveType(nextType);
    setActiveView('content');
    setActiveOutputId(groupedOutputs[nextType]?.[0]?.id ?? '');
  };

  const onCopySlug = async (slug: string) => {
    await navigator.clipboard.writeText(slug);
    setCopiedSlug(slug);
  };

  const generationList = (
    <SidebarContent
      articles={articles}
      listError={listError}
      listLoading={listLoading}
      selectedSlug={selectedSlug}
      onRefresh={() => void loadInitialData()}
      onSelectSlug={(slug) => {
        setSelectedSlug(slug);
        setDrawerOpen(false);
      }}
    />
  );

  return (
    <ConfigProvider theme={buildPreviewTheme(themeMode)}>
      <AntApp>
        <div className="preview-root">
          <div className="preview-backdrop" />
          <Layout className="preview-layout">
            {!isMobile ? (
              <Layout.Sider width={340} className="preview-sider">
                {generationList}
              </Layout.Sider>
            ) : null}

            <Layout className="preview-main-layout">
              <Layout.Header className="preview-header">
                <Flex align="center" justify="space-between" style={{ height: '100%' }}>
                  {isMobile ? (
                    <Flex align="center" gap={8}>
                      <img src={IDEON_LOGO_PATH} alt="Ideon" className="preview-brand-logo" />
                      <Typography.Text strong className="preview-brand">IDEON</Typography.Text>
                      <Button
                        icon={<MenuOutlined />}
                        size="small"
                        onClick={() => setDrawerOpen(true)}
                      />
                    </Flex>
                  ) : (
                    <span />
                  )}
                  <Space size="small">
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => void loadInitialData()}
                      title="Refresh"
                    />
                    <Button
                      icon={<BulbOutlined />}
                      type={themeMode === 'light' ? 'primary' : 'default'}
                      onClick={() => setThemeMode('light')}
                      title="Light mode"
                    />
                    <Button
                      icon={<MoonOutlined />}
                      type={themeMode === 'dark' ? 'primary' : 'default'}
                      onClick={() => setThemeMode('dark')}
                      title="Dark mode"
                    />
                  </Space>
                </Flex>
              </Layout.Header>

              <Layout.Content className="preview-content">
                <div className="preview-grid">
                  <Card className="preview-summary-card" variant="borderless" size="small">
                    <Flex justify="space-between" gap={12} align="center" wrap>
                      <Typography.Text className="preview-source-path" style={{ margin: 0 }}>
                        {sourcePathLabel}
                      </Typography.Text>

                      <Space size="small" wrap>
                        <Tag icon={<ClockCircleOutlined />} bordered={false} className="preview-pill">
                          {`Total time: ${totalDurationLabel}`}
                        </Tag>
                        <Tag icon={<DollarOutlined />} bordered={false} className="preview-pill">
                          {`Total cost: ${totalCostLabel}${costSource ? ` (${costSource})` : ''}`}
                        </Tag>
                      </Space>
                    </Flex>
                  </Card>

                  {listError ? (
                    <Card className="preview-message-card preview-message-card--error">
                      <Typography.Title level={4}>Unable to load preview index</Typography.Title>
                      <Typography.Paragraph>{listError}</Typography.Paragraph>
                    </Card>
                  ) : null}

                  {!listLoading && articles.length === 0 ? (
                    <Card className="preview-message-card">
                      <Empty
                        description={bootstrap?.emptyStateMessage ?? 'No generated content found yet.'}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    </Card>
                  ) : null}

                  {articles.length > 0 ? (
                    <Card className="preview-panel-card" variant="borderless">
                      <Flex justify="space-between" gap={16} wrap align="center">
                        <div>
                          <Typography.Text className="preview-overline">Active Generation</Typography.Text>
                          <Typography.Title level={3} className="preview-generation-title">
                            {detail?.title ?? bootstrap?.title ?? 'Loading generation...'}
                          </Typography.Title>
                          {selectedSlug ? (
                            <Tag bordered={false} className="preview-generation-tag">
                              {selectedSlug}
                            </Tag>
                          ) : null}
                        </div>

                        <Segmented
                          options={[
                            { label: 'Content', value: 'content' },
                            { label: 'Logs', value: 'logs' },
                          ]}
                          value={activeView}
                          onChange={(val) => setActiveView(val as TopView)}
                        />
                      </Flex>

                      <Divider />

                      {detailLoading ? (
                        <Skeleton active paragraph={{ rows: 8 }} />
                      ) : detailError ? (
                        <Card className="preview-message-card preview-message-card--error">
                          <Typography.Title level={4}>Unable to load generation</Typography.Title>
                          <Typography.Paragraph>{detailError}</Typography.Paragraph>
                        </Card>
                      ) : detail ? (
                        <div className="preview-detail-stack">
                          {contentTypes.length > 0 ? (
                            <Tabs
                              activeKey={activeType}
                              onChange={(key) => { onSelectType(key); }}
                              type="card"
                              className="preview-type-tabs"
                              items={contentTypes.map((contentType) => {
                                const firstOutput = groupedOutputs[contentType]?.[0];
                                const label = firstOutput?.contentTypeLabel ?? contentType;
                                return {
                                  key: contentType,
                                  label: (
                                    <span className="preview-type-tab-label">
                                      {CONTENT_TYPE_ICONS[contentType] ?? <FileTextOutlined />}
                                      {label}
                                    </span>
                                  ),
                                };
                              })}
                            />
                          ) : null}

                          {activeView === 'content' ? (
                            <>
                              {activeOutputs.length > 1 ? (
                                <Segmented
                                  size="small"
                                  options={activeOutputs.map((output) => ({
                                    label: `${output.contentTypeLabel} ${output.index}`,
                                    value: output.id,
                                  }))}
                                  value={activeOutputId || activeOutputs[0]?.id || ''}
                                  onChange={(value) => setActiveOutputId(value as string)}
                                  style={{ marginBottom: 4 }}
                                />
                              ) : null}

                              {activeOutput ? (
                                <OutputCard
                                  copiedSlug={copiedSlug}
                                  output={activeOutput}
                                  onCopySlug={(slug) => void onCopySlug(slug)}
                                />
                              ) : (
                                <Empty description="No content outputs found for this generation." />
                              )}
                            </>
                          ) : (
                            <LogsPanel
                              interactionViewMode={interactionViewMode}
                              selectedInteraction={selectedInteraction}
                              selectedInteractionId={selectedInteractionId}
                              stageGroups={stageGroups}
                              onChangeInteractionMode={setInteractionViewMode}
                              onSelectInteraction={setSelectedInteractionId}
                            />
                          )}
                        </div>
                      ) : (
                        <Empty description="No generation selected." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      )}
                    </Card>
                  ) : null}
                </div>
              </Layout.Content>
            </Layout>
          </Layout>

          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Generations"
            width={Math.min(window.innerWidth - 24, 420)}
          >
            {generationList}
          </Drawer>
        </div>
      </AntApp>
    </ConfigProvider>
  );
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null || !Number.isFinite(durationMs) || durationMs < 0) {
    return '--';
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return '--';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function SidebarContent({
  articles,
  listLoading,
  listError,
  selectedSlug,
  onRefresh,
  onSelectSlug,
}: {
  articles: PreviewArticleListItem[];
  listLoading: boolean;
  listError: string | null;
  selectedSlug: string;
  onRefresh: () => void;
  onSelectSlug: (slug: string) => void;
}) {
  return (
    <div className="preview-sidebar-shell">
      <div className="preview-sidebar-hd">
        <Flex align="center" gap={8}>
          <img src={IDEON_LOGO_PATH} alt="Ideon" className="preview-brand-logo" />
          <Typography.Text strong className="preview-brand">IDEON</Typography.Text>
        </Flex>
        <Button size="small" icon={<ReloadOutlined />} onClick={onRefresh} title="Refresh" />
      </div>

      <div className="preview-sidebar-body">
        {listLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
        {listError ? <Typography.Text type="danger" style={{ fontSize: 13 }}>{listError}</Typography.Text> : null}
        {!listLoading && !listError && articles.length === 0 ? (
          <Empty description="No generations yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : null}

        <div className="preview-generation-list">
          {articles.map((article) => {
            const isActive = article.slug === selectedSlug;

            return (
              <button
                key={article.slug}
                type="button"
                className={isActive ? 'preview-generation-item is-active' : 'preview-generation-item'}
                onClick={() => onSelectSlug(article.slug)}
              >
                {article.coverImageUrl ? (
                  <img
                    className="preview-generation-thumb"
                    src={article.coverImageUrl}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className="preview-generation-thumb preview-generation-thumb--fallback" />
                )}

                <div className="preview-generation-copy">
                  <span className="preview-generation-item-title">{article.title}</span>
                  <span className="preview-generation-item-meta">{formatPreviewDate(article.mtime)}</span>
                  <span className="preview-generation-item-snippet">{article.previewSnippet}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OutputCard({
  output,
  copiedSlug,
  onCopySlug,
}: {
  output: PreviewArticleOutput;
  copiedSlug: string;
  onCopySlug: (slug: string) => void;
}) {
  const channelClassName = `preview-output-shell preview-output-shell--${sanitizeClassName(output.contentType)}`;

  return (
    <section className={channelClassName}>
      <header className="preview-output-header">
        <div>
          <Typography.Title level={4}>{output.title || output.contentTypeLabel}</Typography.Title>
          <Space wrap>
            <Tag bordered={false} className="preview-generation-tag">
              {output.contentTypeLabel}
            </Tag>
            <Tag bordered={false} className="preview-generation-tag">
              {`Variant ${output.index}`}
            </Tag>
          </Space>
        </div>

        <Flex gap={8} wrap align="center">
          <Tag bordered={false} className="preview-slug-pill">
            {output.slug}
          </Tag>
          <Button onClick={() => onCopySlug(output.slug)}>
            {copiedSlug === output.slug ? 'Copied' : 'Copy slug'}
          </Button>
        </Flex>
      </header>

      <div
        className="preview-output-body preview-rendered-html"
        dangerouslySetInnerHTML={{ __html: output.htmlBody }}
      />
    </section>
  );
}

function LogsPanel({
  interactionViewMode,
  selectedInteraction,
  selectedInteractionId,
  stageGroups,
  onChangeInteractionMode,
  onSelectInteraction,
}: {
  interactionViewMode: InteractionViewMode;
  selectedInteraction: NormalizedPreviewInteraction | null;
  selectedInteractionId: string;
  stageGroups: Array<{ stageId: string; items: NormalizedPreviewInteraction[] }>;
  onChangeInteractionMode: (mode: InteractionViewMode) => void;
  onSelectInteraction: (interactionId: string) => void;
}) {
  if (stageGroups.length === 0 || !selectedInteraction) {
    return <Empty description="No interactions captured for this generation." image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const snapshot = extractInteractionTextSnapshot(selectedInteraction);

  return (
    <div className="preview-logs-layout">
      <section className="preview-logs-list">
        {stageGroups.map((group) => (
          <div key={group.stageId} className="preview-stage-group">
            <Typography.Text className="preview-stage-title">{group.stageId}</Typography.Text>
            <div className="preview-stage-items">
              {group.items.map((item) => {
                const isActive = item.id === selectedInteractionId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={isActive ? 'preview-stage-button is-active' : 'preview-stage-button'}
                    onClick={() => onSelectInteraction(item.id)}
                  >
                    <span className="preview-stage-button-title">{item.operationId || item.id}</span>
                    <span className="preview-stage-button-meta">{describeInteraction(item)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <Card className="preview-logs-detail" variant="borderless">
        <Flex justify="space-between" gap={16} wrap align="center">
          <div>
            <Typography.Text className="preview-overline">Interaction Inspector</Typography.Text>
            <Typography.Title level={4}>{selectedInteraction.operationId || selectedInteraction.id}</Typography.Title>
          </div>

          <Space wrap>
            <Button
              type={interactionViewMode === 'text' ? 'primary' : 'default'}
              onClick={() => onChangeInteractionMode('text')}
            >
              Prompt / Response
            </Button>
            <Button
              type={interactionViewMode === 'json' ? 'primary' : 'default'}
              onClick={() => onChangeInteractionMode('json')}
            >
              Full JSON
            </Button>
          </Space>
        </Flex>

        <Divider />

        <dl className="preview-inspector-grid">
          <dt>Stage</dt>
          <dd>{selectedInteraction.stageId}</dd>
          <dt>Source</dt>
          <dd>{selectedInteraction.source}</dd>
          <dt>Status</dt>
          <dd>{selectedInteraction.status || 'unknown'}</dd>
          <dt>Model</dt>
          <dd>{selectedInteraction.modelId || 'unknown'}</dd>
          <dt>Duration</dt>
          <dd>{`${selectedInteraction.durationMs} ms`}</dd>
        </dl>

        {interactionViewMode === 'json' ? (
          <pre className="preview-inspector-pre">{JSON.stringify(selectedInteraction.raw, null, 2)}</pre>
        ) : (
          <div className="preview-inspector-text-stack">
            <section>
              <Typography.Text className="preview-overline">Prompt / Request</Typography.Text>
              <pre className="preview-inspector-pre">{snapshot.promptText || 'No prompt text found.'}</pre>
            </section>

            <section>
              <Typography.Text className="preview-overline">Response</Typography.Text>
              <pre className="preview-inspector-pre">{snapshot.responseText || 'No response text found.'}</pre>
            </section>
          </div>
        )}
      </Card>
    </div>
  );
}