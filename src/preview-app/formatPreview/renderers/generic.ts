import { wrapContentBody } from '../shared.js';
import type { FormatPreviewInput } from '../types.js';

export function renderGenericPreview(input: FormatPreviewInput): string {
  return `<div class="fmt-generic rendered-content">${wrapContentBody(input.htmlBody)}</div>`;
}
