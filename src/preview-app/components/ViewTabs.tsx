import React from 'react';

export type PreviewView = 'content' | 'plan' | 'logs';

interface ViewTabsProps {
  activeView: PreviewView;
  onChange: (view: PreviewView) => void;
  variant: 'desktop' | 'mobile';
}

export function ViewTabs({ activeView, onChange, variant }: ViewTabsProps) {
  if (variant === 'desktop') {
    return (
      <div className="view-tabs desktop">
        <button type="button" className={`view-tab${activeView === 'content' ? ' active' : ''}`} onClick={() => onChange('content')}>
          Content
        </button>
        <button type="button" className={`view-tab${activeView === 'plan' ? ' active' : ''}`} onClick={() => onChange('plan')}>
          Plan &amp; Assets
        </button>
        <button type="button" className={`view-tab${activeView === 'logs' ? ' active' : ''}`} onClick={() => onChange('logs')}>
          Logs
        </button>
      </div>
    );
  }

  return (
    <nav className="mobile-tabs">
      <button type="button" className={`view-tab${activeView === 'content' ? ' active' : ''}`} onClick={() => onChange('content')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        Content
      </button>
      <button type="button" className={`view-tab${activeView === 'plan' ? ' active' : ''}`} onClick={() => onChange('plan')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18M3 9h18" />
        </svg>
        Plan
      </button>
      <button type="button" className={`view-tab${activeView === 'logs' ? ' active' : ''}`} onClick={() => onChange('logs')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
        Logs
      </button>
    </nav>
  );
}
