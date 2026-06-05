import React from 'react';
import { IDEON_AVATAR_URL } from '../brand.js';

interface HeaderProps {
  onToggleSidebar: () => void;
  onRefresh: () => void;
  onOpenDrawer: () => void;
  onCopyMarkdown: () => void;
  onDownloadMeta: () => void;
  onCopyPath: () => void;
  actionsOpen: boolean;
  onToggleActions: () => void;
  onCloseActions: () => void;
  toastMessage: string | null;
}

export function Header({
  onToggleSidebar,
  onRefresh,
  onOpenDrawer,
  onCopyMarkdown,
  onDownloadMeta,
  onCopyPath,
  actionsOpen,
  onToggleActions,
  onCloseActions,
  toastMessage,
}: HeaderProps) {
  return (
    <header id="app-header">
      <div className="header-left">
        <button type="button" className="btn btn-icon hamburger" aria-label="Toggle sidebar" onClick={onToggleSidebar}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div className="header-brand">
          <img
            src={IDEON_AVATAR_URL}
            alt="Ideon"
            className="logo-mark"
            width={28}
            height={28}
          />
          <span className="wordmark">IDEON</span>
        </div>
      </div>
      <div className="header-actions">
        {toastMessage ? <span className="header-toast">{toastMessage}</span> : null}
        <button type="button" className="btn btn-ghost btn-icon" title="Refresh" onClick={onRefresh}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={onOpenDrawer}>Info</button>
        <div className={`dropdown-wrap${actionsOpen ? ' open' : ''}`}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onToggleActions}>
            Actions &#9662;
          </button>
          <div className="dropdown-menu">
            <button type="button" className="dropdown-item" onClick={() => { onCopyMarkdown(); onCloseActions(); }}>
              Copy Markdown
            </button>
            <button type="button" className="dropdown-item" onClick={() => { onDownloadMeta(); onCloseActions(); }}>
              Download meta.json
            </button>
            <button type="button" className="dropdown-item" onClick={() => { onCopyPath(); onCloseActions(); }}>
              Open Source Folder
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
