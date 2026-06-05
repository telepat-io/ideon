import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { Plan } from '../types/plan.js';

interface PlanReviewProps {
  readonly plan: Plan;
  readonly publicationSlug: string;
  readonly onDone: (approved: boolean) => void;
}

function SummaryView({
  plan,
  publicationSlug,
  totalSeries,
  totalArticles,
}: {
  readonly plan: Plan;
  readonly publicationSlug: string;
  readonly totalSeries: number;
  readonly totalArticles: number;
}): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">Plan Review Summary</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>Publication: {publicationSlug}</Text>
        <Text>Series planned: {totalSeries}</Text>
        <Text>Articles planned: {totalArticles}</Text>
        <Text>Research rounds: {plan.researchStats.queryRoundsCompleted}</Text>
        <Text>Candidates evaluated: {plan.researchStats.candidatesEvaluated}</Text>
        <Text>Candidates passed: {plan.researchStats.candidatesPassed}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Press Enter to review details, or 'n' to skip to approval.</Text>
      </Box>
    </Box>
  );
}

function SeriesView({
  plan,
  selectedSeriesIndex,
  expandedSeries,
}: {
  readonly plan: Plan;
  readonly selectedSeriesIndex: number;
  readonly expandedSeries: Set<number>;
}): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">Series Review</Text>
      <Box flexDirection="column" marginTop={1}>
        {plan.series.map((series, index) => {
          const isSelected = index === selectedSeriesIndex;
          const isExpanded = expandedSeries.has(index);
          const pointer = isSelected ? '>' : ' ';
          const expandIcon = isExpanded ? '▼' : '▶';

          return (
            <Box key={series.name} flexDirection="column">
              <Text>
                {pointer} {expandIcon} {series.name}
                {isSelected && <Text color="yellow"> (selected)</Text>}
              </Text>
              {isExpanded && (
                <Box marginLeft={2} flexDirection="column">
                  <Text color="gray">Pillar: {series.pillarKeyword}</Text>
                  <Text color="gray">Funnel: {series.funnelStage}</Text>
                  <Text color="gray">Articles: {series.articles.length}</Text>
                  {series.clusterRationale && (
                    <Text color="gray" wrap="wrap">Rationale: {series.clusterRationale}</Text>
                  )}
                  <Box marginLeft={2} flexDirection="column" marginTop={1}>
                    {series.articles.map((article) => (
                      <Text key={article.title} color="gray">
                        • {article.title}
                      </Text>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Press Enter to expand/collapse, 'n' to continue to approval.</Text>
      </Box>
    </Box>
  );
}

function ArticlesView({
  plan,
  selectedArticleIndex,
}: {
  readonly plan: Plan;
  readonly selectedArticleIndex: number;
}): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">Article Review</Text>
      <Box flexDirection="column" marginTop={1}>
        {plan.articles.map((article, index) => {
          const isSelected = index === selectedArticleIndex;
          const pointer = isSelected ? '>' : ' ';

          return (
            <Box key={article.title} flexDirection="column">
              <Text>
                {pointer} {article.title}
                {isSelected && <Text color="yellow"> (selected)</Text>}
              </Text>
              {isSelected && (
                <Box marginLeft={2} flexDirection="column">
                  <Text color="gray">Keyword: {article.primaryKeyword}</Text>
                  <Text color="gray">Intent: {article.intentType}</Text>
                  <Text color="gray">Format: {article.format}</Text>
                  <Text color="gray">Priority: {article.priority}</Text>
                  {article.confidenceNote && (
                    <Text color="gray" wrap="wrap">Note: {article.confidenceNote}</Text>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Press 'n' to continue to approval.</Text>
      </Box>
    </Box>
  );
}

function ConfirmView({
  totalSeries,
  totalArticles,
  publicationSlug,
}: {
  readonly totalSeries: number;
  readonly totalArticles: number;
  readonly publicationSlug: string;
}): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">Save Plan?</Text>
      <Box flexDirection="column" marginTop={1}>
        <Text>This will create {totalSeries} series and {totalArticles} articles in the queue.</Text>
        <Text>Publication: {publicationSlug}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="green">[Y] Save plan</Text>
      </Box>
      <Box>
        <Text color="red">[N] Cancel</Text>
      </Box>
    </Box>
  );
}

export function PlanReview({ plan, publicationSlug, onDone }: PlanReviewProps): React.JSX.Element {
  const { exit } = useApp();
  const [step, setStep] = useState<'summary' | 'series' | 'articles' | 'confirm'>('summary');
  const [selectedSeriesIndex, setSelectedSeriesIndex] = useState(0);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0);
  const [expandedSeries, setExpandedSeries] = useState<Set<number>>(new Set());

  const totalArticles = plan.articles.length;
  const totalSeries = plan.series.length;

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      onDone(false);
      exit();
      return;
    }

    if (step === 'confirm') {
      if (input === 'y' || input === 'Y') {
        onDone(true);
        exit();
      } else if (input === 'n' || input === 'N') {
        onDone(false);
        exit();
      }
      return;
    }

    if (step === 'summary') {
      if (key.return) {
        setStep(plan.series.length > 0 ? 'series' : 'articles');
      }
      return;
    }

    if (step === 'series') {
      if (key.return) {
        const series = plan.series[selectedSeriesIndex];
        if (series) {
          const next = new Set(expandedSeries);
          if (next.has(selectedSeriesIndex)) {
            next.delete(selectedSeriesIndex);
          } else {
            next.add(selectedSeriesIndex);
          }
          setExpandedSeries(next);
        }
      } else if (key.downArrow) {
        setSelectedSeriesIndex((i) => Math.min(i + 1, plan.series.length - 1));
      } else if (key.upArrow) {
        setSelectedSeriesIndex((i) => Math.max(i - 1, 0));
      } else if (input === 'n' || input === 'N') {
        setStep('confirm');
      }
      return;
    }

    if (step === 'articles' && plan.series.length === 0) {
      if (key.downArrow) {
        setSelectedArticleIndex((i) => Math.min(i + 1, totalArticles - 1));
      } else if (key.upArrow) {
        setSelectedArticleIndex((i) => Math.max(i - 1, 0));
      } else if (input === 'n' || input === 'N') {
        setStep('confirm');
      }
    }
  });

  if (step === 'summary') {
    return <SummaryView plan={plan} publicationSlug={publicationSlug} totalSeries={totalSeries} totalArticles={totalArticles} />;
  }

  if (step === 'series' && plan.series.length > 0) {
    return <SeriesView plan={plan} selectedSeriesIndex={selectedSeriesIndex} expandedSeries={expandedSeries} />;
  }

  if (step === 'articles' && plan.series.length === 0) {
    return <ArticlesView plan={plan} selectedArticleIndex={selectedArticleIndex} />;
  }

  if (step === 'confirm') {
    return <ConfirmView totalSeries={totalSeries} totalArticles={totalArticles} publicationSlug={publicationSlug} />;
  }

  return <Box />;
}

export async function showPlanReview(plan: Plan, publicationSlug: string): Promise<boolean> {
  const React = (await import('react')).default;
  const { render } = await import('ink');

  let approved = false;

  const app = render(
    React.createElement(PlanReview, {
      plan,
      publicationSlug,
      onDone: (result: boolean) => {
        approved = result;
      },
    }),
  );

  await app.waitUntilExit();
  process.stdout.write('\n');

  return approved;
}
