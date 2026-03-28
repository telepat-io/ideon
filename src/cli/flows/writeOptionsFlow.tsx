import React, { useMemo, useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import { contentTypeValues, targetLengthValues, writingStyleValues } from '../../config/schema.js';
import type { ContentTargetInput } from '../../config/resolver.js';

interface WriteOptionsFlowProps {
  askStyle: boolean;
  askTargets: boolean;
  askLength: boolean;
  initialStyle: string;
  initialTargetLength: string;
  initialTargets: ContentTargetInput[];
  onDone: (result: { style?: string; targetLength?: string; contentTargets?: ContentTargetInput[] } | null) => void;
}

type Step = 'targets' | 'counts' | 'style' | 'length';

interface TargetSelection {
  contentType: string;
  checked: boolean;
}

export function WriteOptionsFlow({
  askStyle,
  askTargets,
  askLength,
  initialStyle,
  initialTargetLength,
  initialTargets,
  onDone,
}: WriteOptionsFlowProps): React.JSX.Element {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>(() => {
    if (askTargets) return 'targets';
    if (askStyle) return 'style';
    if (askLength) return 'length';
    return 'targets';
  });
  const [cursor, setCursor] = useState(0);
  const [targetSelections, setTargetSelections] = useState<TargetSelection[]>(() => {
    const selected = new Set(initialTargets.map((target) => target.contentType));
    return contentTypeValues.map((contentType) => ({
      contentType,
      checked: selected.has(contentType),
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
  const [targetLength, setTargetLength] = useState(initialTargetLength);

  const selectedTypes = useMemo(
    () => targetSelections.filter((item) => item.checked).map((item) => item.contentType),
    [targetSelections],
  );

  const buildContentTargets = (types: string[]): ContentTargetInput[] => {
    return types.map((contentType) => {
      const count = counts[contentType] ?? 1;
      return { contentType, count };
    });
  };

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      onDone(null);
      exit();
      return;
    }

    if (!askTargets || step !== 'targets') {
      return;
    }

    if (key.upArrow) {
      setCursor((current) => (current <= 0 ? targetSelections.length - 1 : current - 1));
      return;
    }

    if (key.downArrow) {
      setCursor((current) => (current + 1) % targetSelections.length);
      return;
    }

    if (input === ' ') {
      setTargetSelections((current) =>
        current.map((item, index) =>
          index === cursor
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
      const normalizedSelection = selectedTypes.length > 0 ? selectedTypes : ['article'];
      if (selectedTypes.length === 0) {
        setTargetSelections((current) =>
          current.map((item) => ({
            ...item,
            checked: item.contentType === 'article',
          })),
        );
      }

      setCountIndex(0);
      setCountInput(String(counts[normalizedSelection[0]!] ?? 1));
      setStep('counts');
    }
  });

  if (step === 'targets' && askTargets) {
    return (
      <Box flexDirection="column">
        <Text bold color="cyanBright">
          Select Content Types
        </Text>
        <Text color="gray">Use up/down to move, space to toggle, enter to continue.</Text>
        <Box marginTop={1} flexDirection="column">
          {targetSelections.map((item, index) => {
            const marker = item.checked ? '[x]' : '[ ]';
            const pointer = index === cursor ? '>' : ' ';
            return (
              <Text key={item.contentType}>
                {pointer} {marker} {item.contentType}
              </Text>
            );
          })}
        </Box>
      </Box>
    );
  }

  if (step === 'counts') {
    const normalizedSelection = selectedTypes.length > 0 ? selectedTypes : ['article'];
    const currentType = normalizedSelection[countIndex] ?? normalizedSelection[0]!;

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
              if (nextIndex >= normalizedSelection.length) {
                if (askStyle) {
                  setStep('style');
                } else if (askLength) {
                  setStep('length');
                } else {
                  const contentTargets = normalizedSelection.map((contentType) => ({
                    contentType,
                    count: counts[contentType] ?? (contentType === currentType ? nextCount : 1),
                  }));
                  onDone({ contentTargets });
                  exit();
                }
                return;
              }

              setCountIndex(nextIndex);
              const nextType = normalizedSelection[nextIndex]!;
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
              const normalizedSelection = selectedTypes.length > 0 ? selectedTypes : ['article'];
              const contentTargets = askTargets
                ? buildContentTargets(normalizedSelection)
                : undefined;

              setStyle(item.value);

              if (askLength) {
                setStep('length');
                return;
              }

              onDone({
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
              const normalizedSelection = selectedTypes.length > 0 ? selectedTypes : ['article'];
              const contentTargets = askTargets
                ? buildContentTargets(normalizedSelection)
                : undefined;

              setTargetLength(item.value);

              onDone({
                ...(askStyle ? { style } : {}),
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
