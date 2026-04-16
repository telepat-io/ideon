import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Ideon Docs',
  tagline: 'Turn ideas into rich Markdown articles with generated imagery.',
  favicon: 'img/favicon.svg',

  // Set the production url of your site here
  url: 'https://docs.telepat.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/ideon/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'telepat-io',
  projectName: 'ideon',

  trailingSlash: false,
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-Hans'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          editUrl: 'https://github.com/telepat-io/ideon/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Ideon',
      logo: {
        alt: 'Ideon Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'userSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/reference/cli-reference',
          label: 'CLI Reference',
          position: 'left',
        },
        {
          to: '/technical/architecture',
          label: 'Technical',
          position: 'left',
        },
        {
          to: '/for-agents',
          label: 'For Agents',
          position: 'left',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/telepat-io/ideon',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/getting-started/overview',
            },
            {
              label: 'CLI Reference',
              to: '/reference/cli-reference',
            },
          ],
        },
        {
          title: 'Project',
          items: [
            {
              label: 'Repository',
              href: 'https://github.com/telepat-io/ideon',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'For Agents',
              to: '/for-agents',
            },
            {
              label: 'Contributing',
              to: '/contributing/development',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/telepat-io/ideon',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Ideon contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
