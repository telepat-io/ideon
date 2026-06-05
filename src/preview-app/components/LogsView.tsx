import React, { useState } from 'react';
import type { NormalizedPreviewInteraction, PreviewArticleContent } from '../../types/preview.js';
import { formatDuration } from '../format.js';
import {
  extractInteractionTextSnapshot,
  groupInteractionsByStage,
  normalizeInteractions,
} from '../interactions.js';

type InspectorMode = 'prompt' | 'response' | 'json';

interface LogsViewProps {
  detail: PreviewArticleContent;
}

function interactionStatusClass(status: string): 'ok' | 'warn' | 'err' {
  if (status === 'succeeded' || status === 'ok') {
    return 'ok';
  }

  if (status === 'failed' || status === 'err') {
    return 'err';
  }

  return 'warn';
}

function interactionTypeLabel(interaction: NormalizedPreviewInteraction): string {
  if (interaction.source === 't2i') {
    const kind = 'kind' in interaction.raw ? String(interaction.raw.kind || 't2i') : 't2i';
    return `${kind} · ${interaction.source}`;
  }

  return `${interaction.requestType || 'text'} · ${interaction.source}`;
}

export function LogsView({ detail }: LogsViewProps) {
  const normalized = normalizeInteractions(detail.interactions);
  const stageGroups = groupInteractionsByStage(normalized);
  const [selectedInteractionId, setSelectedInteractionId] = useState(normalized[0]?.id ?? '');
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>('prompt');

  const selectedInteraction = normalized.find((item) => item.id === selectedInteractionId)
    ?? normalized[0]
    ?? null;

  if (!selectedInteraction || stageGroups.length === 0) {
    return (
      <section className="view-content active" id="view-logs">
        <div className="empty-state">No interactions captured for this generation.</div>
      </section>
    );
  }

  const snapshot = extractInteractionTextSnapshot(selectedInteraction);

  const inspectorBody = inspectorMode === 'json'
    ? JSON.stringify(selectedInteraction.raw, null, 2)
    : inspectorMode === 'response'
      ? (snapshot.responseText || 'No response text found.')
      : (snapshot.promptText || 'No prompt text found.');

  return (
    <section className="view-content active" id="view-logs">
      <div className="stage-panel">
        {stageGroups.map((group) => (
          <div key={group.stageId} className="stage-group">
            <div className="stage-group-name">{group.stageId}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`stage-interaction${item.id === selectedInteractionId ? ' active' : ''}`}
                onClick={() => {
                  setSelectedInteractionId(item.id);
                  setInspectorMode('prompt');
                }}
              >
                <div className="stage-interaction-left">
                  <div className={`stage-interaction-status ${interactionStatusClass(item.status)}`} />
                  <div>
                    <div className="stage-interaction-name">{item.operationId || item.id}</div>
                    <div className="stage-interaction-type">{interactionTypeLabel(item)}</div>
                  </div>
                </div>
                <div className="stage-interaction-time">{formatDuration(item.durationMs)}</div>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="inspector-panel">
        <div className="inspector-meta">
          <div className="inspector-meta-item">
            <strong>Operation</strong>
            {selectedInteraction.operationId || selectedInteraction.id}
          </div>
          <div className="inspector-meta-item">
            <strong>Source</strong>
            {selectedInteraction.source}
          </div>
          <div className="inspector-meta-item">
            <strong>Status</strong>
            {selectedInteraction.status || 'unknown'}
          </div>
          <div className="inspector-meta-item">
            <strong>Model</strong>
            {selectedInteraction.modelId || 'unknown'}
          </div>
          <div className="inspector-meta-item">
            <strong>Duration</strong>
            {formatDuration(selectedInteraction.durationMs)}
          </div>
        </div>

        <div className="inspector-tabs">
          <button
            type="button"
            className={`inspector-tab${inspectorMode === 'prompt' ? ' active' : ''}`}
            onClick={() => setInspectorMode('prompt')}
          >
            Prompt
          </button>
          <button
            type="button"
            className={`inspector-tab${inspectorMode === 'response' ? ' active' : ''}`}
            onClick={() => setInspectorMode('response')}
          >
            Response
          </button>
          <button
            type="button"
            className={`inspector-tab${inspectorMode === 'json' ? ' active' : ''}`}
            onClick={() => setInspectorMode('json')}
          >
            Full JSON
          </button>
        </div>

        <div className="inspector-body">{inspectorBody}</div>
      </div>
    </section>
  );
}
