import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { contentIntentValues, contentTypeValues, targetLengthValues, writingStyleValues } from '../../config/schema.js';
import type { ContentTargetInput } from '../../config/resolver.js';
import { listSeries } from '../../config/seriesStore.js';
import type { Series } from '../../types/series.js';

interface WriteOptionsFlowProps {
  askSeries: boolean;
  askStyle: boolean;
  askIntent: boolean;
  askTargets: boolean;
  askLength: boolean;
  initialStyle: string;
  initialIntent: string;
  initialTargetLength: string;
  initialTargets: ContentTargetInput[];
  onDone: (result: { series?: string; style?: string; intent?: string; targetLength?: string; contentTargets?: ContentTargetInput[] } | null) => void;
}

type Step = 'series' | 'primary' | 'secondary' | 'counts' | 'style' | 'intent' | 'length';

interface SecondarySelection {
  contentType: string;
  checked: boolean;
}

export function WriteOptionsFlow({
  askSeries,
  askStyle,
  askIntent,
  askTargets,
  askLength,
  initialStyle,
  initialIntent,
  initialTargetLength,
  initialTargets,
  onDone,
}: WriteOptionsFlowProps): React.JSX.Element {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>(() => {
    if (askSeries) return 'series';
    if (askTargets) return 'primary';
    if (askStyle) return 'style';
    if (askIntent) return 'intent';
    if (askLength) return 'length';
    return 'primary';
  });
  const [availableSeries, setAvailableSeries] = useState<Series[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (askSeries) {
      listSeries().then(setAvailableSeries).catch(() => setAvailableSeries([]));
    }
  }, [askSeries]);
  const initialPrimary = initialTargets.find((target) => target.role === 'primary')?.contentType
    ?? initialTargets[0]?.contentType
    ?? 'article';
  const [primaryType, setPrimaryType] = useState(initialPrimary);
  const [cursor, setCursor] = useState(0);
  const [secondarySelections, setSecondarySelections] = useState<SecondarySelection[]>(() => {
    const selected = new Set(
      initialTargets
        .filter((target) => target.role === 'secondary')
        .map((target) => target.contentType),
    );
    return contentTypeValues.map((contentType) => ({
      contentType,
      checked: contentType === initialPrimary ? false : selected.has(contentType),
    }));
  });
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    for (const target of initialTargets) {
      base[target.contentType] = target.count;
    }
    return base;
  });
  const [countInput, setCountInput] = useState('1');
  const [countIndex, setCountIndex] = useState(0);
  const [style, setStyle] = useState(initialStyle);
  const [intent, setIntent] = useState(initialIntent);
  const [targetLength, setTargetLength] = useState(initialTargetLength);

  const selectedSecondaryTypes = useMemo(
    () => secondarySelections.filter((item) => item.checked).map((item) => item.contentType),
    [secondarySelections],
  );

  const buildContentTargets = (resolvedPrimaryType: string, secondaryTypes: string[]): ContentTargetInput[] => {
    const orderedTypes = [resolvedPrimaryType, ...secondaryTypes.filter((type) => type !== resolvedPrimaryType)];
    return orderedTypes.map((contentType, index) => {
      const count = counts[contentType] ?? 1;
      return {
        contentType,
        role: index === 0 ? 'primary' : 'secondary',
        count,
      };
    });
  };

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      onDone(null);
      exit();
      return;
    }

    if (!askTargets || step !== 'secondary') {
      return;
    }

    if (key.upArrow) {
      setCursor((current) => (current <= 0 ? secondarySelections.length - 1 : current - 1));
      return;
    }

    if (key.downArrow) {
      setCursor((current) => (current + 1) % secondarySelections.length);
      return;
    }

    if (input === ' ') {
      setSecondarySelections((current) =>
        current.map((item, index) =>
          index === cursor && item.contentType !== primaryType
            ? {
                ...item,
                checked: !item.checked,
              }
            : item,
        ),
      );
      return;
    }

    if (key.return) {
      setCountIndex(0);
      setCountInput(String(counts[primaryType] ?? 1));
      setStep('counts');
    }
  });

  if (step === 'series' && askSeries) {
    const items = [
      { label: '(none)', value: '' },
      ...availableSeries.map((s) => ({ label: `${s.name} (${s.slug})`, value: s.slug })),
    ];

    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          Select Content Series
        </Text>
        <Text color="gray">Associate this run with an existing series (or skip).</Text>
        <Box marginTop={1}>
          <SelectInput
            items={items}
            onSelect={(item) => {
              const seriesSlug = item.value || undefined;
              setSelectedSeries(seriesSlug);

              if (askTargets) {
                setStep('primary');
              } else if (askStyle) {
                setStep('style');
              } else if (askIntent) {
                setStep('intent');
              } else if (askLength) {
                setStep('length');
              } else {
                onDone({ series: seriesSlug });
                exit();
              }
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'primary' && askTargets) {
    const items = contentTypeValues.map((value) => ({
      label: value,
      value,
    }));

    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          Select Primary Content Type
        </Text>
        <Text color="gray">Choose exactly one primary output for this run.</Text>
        <Box marginTop={1}>
          <SelectInput
            items={items}
            initialIndex={Math.max(0, items.findIndex((item) => item.value === primaryType))}
            onSelect={(item) => {
              setPrimaryType(item.value);
              setSecondarySelections((current) =>
                current.map((secondary) =>
                  secondary.contentType === item.value
                    ? { ...secondary, checked: false }
                    : secondary,
                ),
              );
              setStep('secondary');
            }}
          />
        </Box>
      </Box>
    );
  }

  if (step === 'secondary' && askTargets) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          Select Secondary Content Types
        </Text>
        <Text color="gray">Use up/down to move, space to toggle, enter to continue.</Text>
        <Text color="gray">Primary: {primaryType}</Text>
        <Box marginTop={1} flexDirection="column">
          {secondarySelections.map((item, index) => {
            const marker = item.checked ? '[x]' : '[ ]';
            const pointer = index === cursor ? '>' : ' ';
            const disabled = item.contentType === primaryType;
            return (
              <Text key={item.contentType}>
                {pointer} {disabled ? '[•]' : marker} {item.contentType}
              </Text>
            );
          })}
        </Box>
      </Box>
    );
  }

  if (step === 'counts') {
    const countTypes = [primaryType, ...selectedSecondaryTypes];
    const currentType = countTypes[countIndex] ?? countTypes[0]!;

    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          Outputs per Content Type
        </Text>
        <Text color="gray">Enter a positive integer for {currentType}.</Text>
        <Box marginTop={1}>
          <Text>{'> '}</Text>
          <TextInput
            value={countInput}
            onChange={setCountInput}
            onSubmit={(value) => {
              const parsed = Number.parseInt(value.trim(), 10);
              const nextCount = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
              setCounts((current) => ({
                ...current,
                [currentType]: nextCount,
              }));

              const nextIndex = countIndex + 1;
              if (nextIndex >= countTypes.length) {
                if (askStyle) {
                  setStep('style');
                } else if (askIntent) {
                  setStep('intent');
                } else if (askLength) {
                  setStep('length');
                } else {
                  const contentTargets = buildContentTargets(primaryType, selectedSecondaryTypes).map((target) => ({
                    ...target,
                    count: target.contentType === currentType ? nextCount : (counts[target.contentType] ?? target.count),
                  }));
                  onDone({ series: selectedSeries, contentTargets });
                  exit();
                }
                return;
              }

              setCountIndex(nextIndex);
              const nextType = countTypes[nextIndex]!;
              setCountInput(String(counts[nextType] ?? 1));
            }}
          />
        </Box>
      </Box>
    );
  }

  const styleItems = writingStyleValues.map((value) => ({
    label: value,
    value,
  }));

  if (step === 'style') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          Select Style
        </Text>
        <Text color="gray">Choose a single style for this generation run.</Text>
        <Box marginTop={1}>
          <SelectInput
            items={styleItems}
            initialIndex={Math.max(0, styleItems.findIndex((item) => item.value === style))}
            onSelect={(item) => {
              const contentTargets = askTargets
                ? buildContentTargets(primaryType, selectedSecondaryTypes)
                : undefined;

              setStyle(item.value);

              if (askIntent) {
                setStep('intent');
                return;
              }

              if (askLength) {
                setStep('length');
                return;
              }

              onDone({
                series: selectedSeries,
                style: item.value,
                ...(contentTargets ? { contentTargets } : {}),
              });
              exit();
            }}
          />
        </Box>
      </Box>
    );
  }

  const intentItems = contentIntentValues.map((value) => ({
    label: value,
    value,
  }));

  if (step === 'intent') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          Select Intent
        </Text>
        <Text color="gray">Choose the primary content intent for this generation run.</Text>
        <Box marginTop={1}>
          <SelectInput
            items={intentItems}
            initialIndex={Math.max(0, intentItems.findIndex((item) => item.value === intent))}
            onSelect={(item) => {
              const contentTargets = askTargets
                ? buildContentTargets(primaryType, selectedSecondaryTypes)
                : undefined;

              setIntent(item.value);

              if (askLength) {
                setStep('length');
                return;
              }

              onDone({
                series: selectedSeries,
                ...(askStyle ? { style } : {}),
                intent: item.value,
                ...(contentTargets ? { contentTargets } : {}),
              });
              exit();
            }}
          />
        </Box>
      </Box>
    );
  }

  const lengthItems = targetLengthValues.map((value) => ({
    label: value,
    value,
  }));

  if (step === 'length') {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          Select Target Length
        </Text>
        <Text color="gray">Choose the desired output size for this generation run.</Text>
        <Box marginTop={1}>
          <SelectInput
            items={lengthItems}
            initialIndex={Math.max(0, lengthItems.findIndex((item) => item.value === targetLength))}
            onSelect={(item) => {
              const contentTargets = askTargets
                ? buildContentTargets(primaryType, selectedSecondaryTypes)
                : undefined;

              setTargetLength(item.value);

              onDone({
                series: selectedSeries,
                ...(askStyle ? { style } : {}),
                ...(askIntent ? { intent } : {}),
                targetLength: item.value,
                ...(contentTargets ? { contentTargets } : {}),
              });
              exit();
            }}
          />
        </Box>
      </Box>
    );
  }

  return <Box />;
}
