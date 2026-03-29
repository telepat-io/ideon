import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

export type PreviewThemeMode = 'light' | 'dark';

export function buildPreviewTheme(mode: PreviewThemeMode): ThemeConfig {
  return {
    algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    cssVar: { key: 'ideon-preview' },
    token: {
      colorPrimary: '#0e7490',
      colorInfo: '#0e7490',
      colorSuccess: '#2f855a',
      colorWarning: '#b7791f',
      colorError: '#c0564a',
      borderRadius: 8,
      controlHeight: 36,
      fontFamily: '"Avenir Next", "Segoe UI", "Trebuchet MS", sans-serif',
      fontFamilyCode: '"SF Mono", Menlo, Consolas, monospace',
      colorBgBase: mode === 'dark' ? '#0f1923' : '#f8f4ef',
      colorTextBase: mode === 'dark' ? '#e8eff4' : '#1e2933',
    },
  };
}