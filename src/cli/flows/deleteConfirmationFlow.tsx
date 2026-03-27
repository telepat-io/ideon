import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';

interface DeleteConfirmationTargets {
  slug: string;
  markdownPath: string;
  analyticsPath: string;
  assetDir: string;
}

interface DeleteConfirmationFlowProps {
  targets: DeleteConfirmationTargets;
  onDone: (confirmed: boolean) => void;
}

export function DeleteConfirmationFlow({ targets, onDone }: DeleteConfirmationFlowProps): React.JSX.Element {
  const { exit } = useApp();

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === 'c')) {
      onDone(false);
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold color="redBright">
        Delete article "{targets.slug}"?
      </Text>
      <Text color="gray">Use the arrow keys to choose an action, then press Enter.</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>- {targets.markdownPath}</Text>
        <Text>- {targets.analyticsPath}</Text>
        <Text>- {targets.assetDir}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <SelectInput
          items={[
            { label: 'Delete article and assets', value: true },
            { label: 'Cancel', value: false },
          ]}
          onSelect={(item) => {
            onDone(item.value);
            exit();
          }}
        />
      </Box>
    </Box>
  );
}