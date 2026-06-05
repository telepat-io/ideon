import {
  escapeHtml,
  formatRelativeTime,
  resolveAuthorIdentity,
  wrapContentBody,
} from '../shared.js';
import type { FormatPreviewInput } from '../types.js';

export function renderRedditPostPreview(input: FormatPreviewInput): string {
  const identity = resolveAuthorIdentity(input.publicationName, input.publicationSlug);
  const relativeTime = formatRelativeTime(input.metaJson?.generatedAt);

  return `<div class="fmt-reddit">
    <div class="fmt-reddit-sub">r/programming · Posted by u/${escapeHtml(identity.handle)} · ${escapeHtml(relativeTime)} ago</div>
    <h1 class="fmt-title">${escapeHtml(input.title)}</h1>
    <div class="fmt-reddit-body">
      ${wrapContentBody(input.htmlBody)}
    </div>
    <div class="fmt-reddit-vote">
      <span>⬆ <strong>1.2k</strong></span> <span>⬇</span>
      <span>💬 <strong>345 comments</strong></span>
      <span>🔗 Share</span> <span>🎁 Award</span>
    </div>
    <div class="fmt-reddit-comments">
      <div class="fmt-comment"><strong>u/devopsjane</strong> · 234 points · 2h<br>This is exactly what we've been doing for our documentation pipeline. The key insight is that the human editor should spend time on voice and accuracy, not formatting.</div>
      <div class="fmt-comment fmt-comment-nested"><strong>u/${escapeHtml(identity.handle)}</strong> · 89 points · 2h<br>100%. We found that once we separated "structure" from "voice" in the review process, quality went up while time went down.</div>
      <div class="fmt-comment"><strong>u/randomuser</strong> · 156 points · 3h<br>Has anyone tried this with non-English content? We publish in multiple languages and the translation layer adds complexity.</div>
    </div>
  </div>`;
}
