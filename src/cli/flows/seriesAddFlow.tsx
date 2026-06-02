import React, { useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { contentIntentValues, contentTypeValues, targetLengthValues, writingStyleValues } from '../../config/schema.js';
import { listPublications } from '../../config/publicationStore.js';
import type { SeriesDefaults, SeriesEditorialPolicy } from '../../types/series.js';
import type { Publication } from '../../types/publication.js';

interface SeriesAddFlowProps {
  name: string;
  onDone: (result: { topic: string; publication?: string; defaults: SeriesDefaults; editorialPolicy: SeriesEditorialPolicy } | null) => void;
}

type Step = 'topic' | 'publication' | 'style' | 'intent' | 'length' | 'type' | 'tone' | 'forbiddenTopics' | 'disclosure' | 'restrictions' | 'notes';

export function SeriesAddFlow({ name, onDone }: SeriesAddFlowProps): React.JSX.Element {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>('topic');
  const [topic, setTopic] = useState('');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [publication, setPublication] = useState<string | undefined>(undefined);
  const [style, setStyle] = useState<string | undefined>(undefined);
  const [intent, setIntent] = useState<string | undefined>(undefined);
  const [targetLength, setTargetLength] = useState<string | undefined>(undefined);
  const [contentType, setContentType] = useState<string | undefined>(undefined);
  const [tone, setTone] = useState('');
  const [forbiddenTopics, setForbiddenTopics] = useState('');
  const [disclosure, setDisclosure] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    listPublications().then(setPublications).catch(() => setPublications([]));
  }, []);

  const skipToEnd = (): void => {
    onDone({
      topic: topic.trim(),
      publication,
      defaults: buildDefaults(style, intent, targetLength, contentType),
      editorialPolicy: buildPolicy(tone, forbiddenTopics, disclosure, restrictions, notes),
    });
    exit();
  };

  if (step === 'topic') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Series: {name}</Text>
        <Text color="gray">What is this series about? Leave empty to skip.</Text>
        <Box marginTop={1}>
          <Text>{'> '}</Text>
          <TextInput
            value={topic}
            onChange={setTopic}
            onSubmit={() => setStep('publication')}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'publication') {
    const items = [
      { label: '(none)', value: '' },
      ...publications.map((p) => ({ label: `${p.name} (${p.slug})`, value: p.slug })),
    ];

    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Associate to Publication</Text>
        <Text color="gray">Link this series to a publication (or skip).</Text>
        <Box marginTop={1}>
          <SelectInput
            items={items}
            onSelect={(item) => {
              setPublication(item.value || undefined);
              setStep('style');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'style') {
    const items = [
      { label: '(skip)', value: '' },
      ...writingStyleValues.map((v) => ({ label: v, value: v })),
    ];

    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Default Writing Style</Text>
        <Text color="gray">Choose a default style for this series (or skip).</Text>
        <Box marginTop={1}>
          <SelectInput
            items={items}
            onSelect={(item) => {
              setStyle(item.value || undefined);
              setStep('intent');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'intent') {
    const items = [
      { label: '(skip)', value: '' },
      ...contentIntentValues.map((v) => ({ label: v, value: v })),
    ];

    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Default Intent</Text>
        <Text color="gray">Choose a default content intent (or skip).</Text>
        <Box marginTop={1}>
          <SelectInput
            items={items}
            onSelect={(item) => {
              setIntent(item.value || undefined);
              setStep('length');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'length') {
    const items = [
      { label: '(skip)', value: '' },
      ...targetLengthValues.map((v) => ({ label: v, value: v })),
    ];

    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Default Target Length</Text>
        <Text color="gray">Choose a default length (or skip).</Text>
        <Box marginTop={1}>
          <SelectInput
            items={items}
            onSelect={(item) => {
              setTargetLength(item.value || undefined);
              setStep('type');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'type') {
    const items = [
      { label: '(skip)', value: '' },
      ...contentTypeValues.map((v) => ({ label: v, value: v })),
    ];

    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Default Content Type</Text>
        <Text color="gray">Choose a default primary content type (or skip).</Text>
        <Box marginTop={1}>
          <SelectInput
            items={items}
            onSelect={(item) => {
              setContentType(item.value || undefined);
              setStep('tone');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'tone') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Editorial Policy: Tone</Text>
        <Text color="gray">Describe the desired tone. Leave empty to skip.</Text>
        <Box marginTop={1}>
          <Text>{'> '}</Text>
          <TextInput
            value={tone}
            onChange={setTone}
            onSubmit={() => setStep('forbiddenTopics')}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'forbiddenTopics') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Forbidden Topics</Text>
        <Text color="gray">Comma-separated topics to avoid. Leave empty to skip.</Text>
        <Box marginTop={1}>
          <Text>{'> '}</Text>
          <TextInput
            value={forbiddenTopics}
            onChange={setForbiddenTopics}
            onSubmit={() => setStep('disclosure')}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'disclosure') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Disclosure Requirements</Text>
        <Text color="gray">Comma-separated disclosure rules. Leave empty to skip.</Text>
        <Box marginTop={1}>
          <Text>{'> '}</Text>
          <TextInput
            value={disclosure}
            onChange={setDisclosure}
            onSubmit={() => setStep('restrictions')}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'restrictions') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Audience Restrictions</Text>
        <Text color="gray">Comma-separated audience constraints. Leave empty to skip.</Text>
        <Box marginTop={1}>
          <Text>{'> '}</Text>
          <TextInput
            value={restrictions}
            onChange={setRestrictions}
            onSubmit={() => setStep('notes')}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'notes') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">Editorial Policy Notes</Text>
        <Text color="gray">Freeform editorial guidelines. Leave empty to skip.</Text>
        <Box marginTop={1}>
          <Text>{'> '}</Text>
          <TextInput
            value={notes}
            onChange={setNotes}
            onSubmit={skipToEnd}
          />
        </Box>
      </Box>
    );
  }

  return <Box />;
}

function buildDefaults(
  style: string | undefined,
  intent: string | undefined,
  targetLength: string | undefined,
  contentType: string | undefined,
): SeriesDefaults {
  const defaults: SeriesDefaults = {};

  if (style) defaults.style = style as (typeof writingStyleValues)[number];
  if (intent) defaults.intent = intent as (typeof contentIntentValues)[number];
  if (targetLength) {
    const aliasMap: Record<string, number> = { small: 500, medium: 900, large: 1400 };
    defaults.targetLength = aliasMap[targetLength] ?? Number.parseInt(targetLength, 10);
  }
  if (contentType) {
    defaults.contentTargets = [{
      contentType: contentType as (typeof contentTypeValues)[number],
      role: 'primary',
      count: 1,
    }];
  }

  return defaults;
}

function buildPolicy(
  tone: string,
  forbiddenTopics: string,
  disclosure: string,
  restrictions: string,
  notes: string,
): SeriesEditorialPolicy {
  return {
    tone: tone.trim(),
    forbiddenTopics: splitComma(forbiddenTopics),
    disclosureRequirements: splitComma(disclosure),
    audienceRestrictions: splitComma(restrictions),
    notes: notes.trim(),
  };
}

function splitComma(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}
