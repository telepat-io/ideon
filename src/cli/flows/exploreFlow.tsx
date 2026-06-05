import React, { useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { listPublications } from '../../config/publicationStore.js';
import type { Publication } from '../../types/publication.js';

interface PlanExploreInput {
  contentIdea: string;
  publication: string;
  businessContext: string;
  countryCodes: string;
  language: string;
  seriesCount: string;
  articlesPerSeries: string;
  seedKeywords: string;
  excludeSeries: string;
  contentType: string;
}

type ExploreStep =
  | 'idea'
  | 'publication'
  | 'businessContext'
  | 'country'
  | 'language'
  | 'seriesCount'
  | 'articlesPerSeries'
  | 'seedKeywords'
  | 'excludeSeries'
  | 'contentType'
  | 'done';

interface ExploreFlowProps {
  readonly initialPublication?: string;
  readonly onDone: (result: PlanExploreInput | null) => void;
}

function TextInputStep({
  title,
  hint,
  value,
  onChange,
  onSubmit,
}: {
  readonly title: string;
  readonly hint: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly onSubmit: () => void;
}): React.JSX.Element {
  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">{title}</Text>
      <Text color="gray">{hint}</Text>
      <Box marginTop={1}>
        <Text>{'> '}</Text>
        <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
      </Box>
    </Box>
  );
}

export function ExploreFlow({ initialPublication, onDone }: ExploreFlowProps): React.JSX.Element {
  const { exit } = useApp();

  const [publications, setPublications] = useState<Publication[]>([]);

  const [step, setStep] = useState<ExploreStep>('idea');
  const [idea, setIdea] = useState('');
  const [publication, setPublication] = useState(initialPublication ?? '');
  const [businessContext, setBusinessContext] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [seriesCount, setSeriesCount] = useState('3');
  const [articlesPerSeries, setArticlesPerSeries] = useState('5');
  const [seedKeywords, setSeedKeywords] = useState('');
  const [excludeSeries, setExcludeSeries] = useState('');
  const [contentType, setContentType] = useState('article');

  useEffect(() => {
    listPublications().then(setPublications).catch(() => setPublications([]));
  }, []);

  useEffect(() => {
    if (step === 'done') {
      onDone({
        contentIdea: idea.trim(),
        publication,
        businessContext: businessContext.trim(),
        countryCodes: country.trim(),
        language: language.trim(),
        seriesCount: seriesCount.trim(),
        articlesPerSeries: articlesPerSeries.trim(),
        seedKeywords: seedKeywords.trim(),
        excludeSeries: excludeSeries.trim(),
        contentType,
      });
      exit();
    }
  }, [step, idea, publication, businessContext, country, language, seriesCount, articlesPerSeries, seedKeywords, excludeSeries, contentType, onDone, exit]);

  if (step === 'idea') {
    return (
      <TextInputStep
        title="Explore: Content Idea"
        hint="Describe the idea you want to research."
        value={idea}
        onChange={setIdea}
        onSubmit={() => setStep('publication')}
      />
    );
  }

  if (step === 'publication') {
    const items = [
      { label: '(select publication)', value: '' },
      ...publications.map((p) => ({ label: `${p.name} (${p.slug})`, value: p.slug })),
    ];

    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Explore: Select Publication</Text>
        <Text color="gray">Choose a publication to scope the research.</Text>
        <Box marginTop={1}>
          <SelectInput
            items={items}
            onSelect={(item) => {
              setPublication(item.value);
              setStep('businessContext');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'businessContext') {
    return (
      <TextInputStep
        title="Explore: Business Context"
        hint="ICP, product, or company context. Leave empty to skip."
        value={businessContext}
        onChange={setBusinessContext}
        onSubmit={() => setStep('country')}
      />
    );
  }

  if (step === 'country') {
    return (
      <TextInputStep
        title="Explore: Target Countries"
        hint="Comma-separated ISO country codes (e.g. US,GB). Leave empty for all."
        value={country}
        onChange={setCountry}
        onSubmit={() => setStep('language')}
      />
    );
  }

  if (step === 'language') {
    return (
      <TextInputStep
        title="Explore: Target Language"
        hint="ISO 639-1 language code (e.g. en). Leave empty for English."
        value={language}
        onChange={setLanguage}
        onSubmit={() => setStep('seriesCount')}
      />
    );
  }

  if (step === 'seriesCount') {
    return (
      <TextInputStep
        title="Explore: Target Series Count"
        hint="Desired number of series to create (soft target)."
        value={seriesCount}
        onChange={setSeriesCount}
        onSubmit={() => setStep('articlesPerSeries')}
      />
    );
  }

  if (step === 'articlesPerSeries') {
    return (
      <TextInputStep
        title="Explore: Articles Per Series"
        hint="Target articles per series (soft target)."
        value={articlesPerSeries}
        onChange={setArticlesPerSeries}
        onSubmit={() => setStep('seedKeywords')}
      />
    );
  }

  if (step === 'seedKeywords') {
    return (
      <TextInputStep
        title="Explore: Seed Keywords"
        hint="Comma-separated keywords to always include. Leave empty to skip."
        value={seedKeywords}
        onChange={setSeedKeywords}
        onSubmit={() => setStep('excludeSeries')}
      />
    );
  }

  if (step === 'excludeSeries') {
    return (
      <TextInputStep
        title="Explore: Exclude Series"
        hint="Comma-separated series slugs to avoid. Leave empty to skip."
        value={excludeSeries}
        onChange={setExcludeSeries}
        onSubmit={() => setStep('contentType')}
      />
    );
  }

  if (step === 'contentType') {
    const items = [
      { label: 'article', value: 'article' },
      { label: 'blog-post', value: 'blog-post' },
      { label: 'newsletter', value: 'newsletter' },
    ];

    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Explore: Content Type</Text>
        <Text color="gray">Content type for queued articles.</Text>
        <Box marginTop={1}>
          <SelectInput
            items={items}
            onSelect={(item) => {
              setContentType(item.value);
              setStep('done');
            }}
          />
        </Box>
      </Box>
    );
  }

  return <Box />;
}
