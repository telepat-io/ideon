import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  userSidebar: [
    'index',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/overview',
        'getting-started/installation',
        'getting-started/quickstart',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/configuration',
        'guides/credentials-and-secrets',
        'guides/job-files',
        'guides/pipeline-stages',
        'guides/output-structure',
        'guides/local-preview',
        'guides/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/cli-reference',
        'reference/environment-variables',
        'reference/t2i-models',
      ],
    },
    {
      type: 'category',
      label: 'Technical',
      items: [
        'technical/architecture',
        'technical/llm-and-image-pipeline',
        'technical/testing',
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      items: [
        'contributing/development',
        'contributing/releasing-and-docs-deploy',
      ],
    },
  ],
};

export default sidebars;
