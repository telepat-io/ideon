import React, { useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { listPublications } from '../../config/publicationStore.js';
import { listSeries } from '../../config/seriesStore.js';
import type { Publication } from '../../types/publication.js';
import type { Series } from '../../types/series.js';

interface PlanExpandInput {
  seriesSlug: string;
  publication: string;
  countryCodes: string;
  language: string;
  articleCount: string;
  seedKeywords: string;
  contentType: string;
}

type ExpandStep =
  | 'series'
  | 'publication'
  | 'country'
  | 'language'
  | 'articleCount'
  | 'seedKeywords'
  | 'contentType'
  | 'done';

interface ExpandFlowProps {
  readonly initialPublication?: string;
  readonly initialSeries?: string;
  readonly onDone: (result: PlanExpandInput | null) => void;
}

function SeriesStep({
  series,
  onSelect,
}: {
  readonly series: Series[];
  readonly onSelect: (slug: string) => void;
}): React.JSX.Element {
  const items = [
    { label: '(select series)', value: '' },
    ...series.map((s) => ({ label: `${s.name} (${s.slug})`, value: s.slug })),
  ];

  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">Expand Series: Select Series</Text>
      <Text color="gray">Choose a series to expand.</Text>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => {
            if (item.value) onSelect(item.value);
          }}
        />
      </Box>
    </Box>
  );
}

function PublicationStep({
  publications,
  onSelect,
}: {
  readonly publications: Publication[];
  readonly onSelect: (slug: string) => void;
}): React.JSX.Element {
  const items = [
    { label: '(select publication)', value: '' },
    ...publications.map((p) => ({ label: `${p.name} (${p.slug})`, value: p.slug })),
  ];

  return (
    <Box flexDirection="column">
      <Text bold color="cyanBright">Expand Series: Select Publication</Text>
      <Text color="gray">Choose a publication to scope the research.</Text>
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={(item) => onSelect(item.value)} />
      </Box>
    </Box>
  );
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

export function ExpandFlow({
  initialPublication,
  initialSeries,
  onDone,
}: ExpandFlowProps): React.JSX.Element {
  const { exit } = useApp();

  const [publications, setPublications] = useState<Publication[]>([]);
  const [series, setSeries] = useState<Series[]>([]);

  const [step, setStep] = useState<ExpandStep>(initialSeries ? 'publication' : 'series');
  const [seriesSlug, setSeriesSlug] = useState(initialSeries ?? '');
  const [publication, setPublication] = useState(initialPublication ?? '');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [articleCount, setArticleCount] = useState('5');
  const [seedKeywords, setSeedKeywords] = useState('');
  const [contentType, setContentType] = useState('article');

  useEffect(() => {
    listPublications().then(setPublications).catch(() => setPublications([]));
    listSeries().then(setSeries).catch(() => setSeries([]));
  }, []);

  useEffect(() => {
    if (step === 'done') {
      onDone({
        seriesSlug,
        publication,
        countryCodes: country.trim(),
        language: language.trim(),
        articleCount: articleCount.trim(),
        seedKeywords: seedKeywords.trim(),
        contentType,
      });
      exit();
    }
  }, [step, seriesSlug, publication, country, language, articleCount, seedKeywords, contentType, onDone, exit]);

  const filteredSeries = publication
    ? series.filter((s) => s.publication === publication)
    : series;

  if (step === 'series') {
    return (
      <SeriesStep
        series={filteredSeries}
        onSelect={(slug) => {
          setSeriesSlug(slug);
          setStep('publication');
        }}
      />
    );
  }

  if (step === 'publication') {
    return (
      <PublicationStep
        publications={publications}
        onSelect={(slug) => {
          setPublication(slug);
          setStep('country');
        }}
      />
    );
  }

  if (step === 'country') {
    return (
      <TextInputStep
        title="Expand Series: Target Countries"
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
        title="Expand Series: Target Language"
        hint="ISO 639-1 language code (e.g. en). Leave empty for English."
        value={language}
        onChange={setLanguage}
        onSubmit={() => setStep('articleCount')}
      />
    );
  }

  if (step === 'articleCount') {
    return (
      <TextInputStep
        title="Expand Series: Article Count"
        hint="Target number of new articles to plan."
        value={articleCount}
        onChange={setArticleCount}
        onSubmit={() => setStep('seedKeywords')}
      />
    );
  }

  if (step === 'seedKeywords') {
    return (
      <TextInputStep
        title="Expand Series: Additional Seed Keywords"
        hint="Comma-separated additional seeds. Leave empty to skip."
        value={seedKeywords}
        onChange={setSeedKeywords}
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
        <Text bold color="cyanBright">Expand Series: Content Type</Text>
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
