import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <pre className={styles.logoBanner}>{`ooooo oooooooooo.   oooooooooooo   .oooooo.   ooooo      ooo
      \`888' \`888'   \`Y8b  \`888'     \`8  d8P'  \`Y8b  \`888b.     \`8'
 888   888      888  888         888      888  8 \`88b.    8
 888   888      888  888oooo8    888      888  8   \`88b.  8
 888   888      888  888    "    888      888  8     \`88b.8
 888   888     d88'  888       o \`88b    d88'  8       \`888
o888o o888bood8P'   o888ooooood8  \`Y8bood8P'  o8o        \`8`}</pre>
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/quickstart">
            Get Started
          </Link>
          <Link
            className="button button--outline button--lg"
            to="/docs/reference/cli-reference">
            CLI Reference
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} | User Documentation`}
      description="User-first documentation for installing, configuring, and running Ideon.">
      <HomepageHeader />
      <main>
        <section className={styles.section}>
          <div className="container">
            <div className="row">
              <div className="col col--4">
                <h2>Features</h2>
                <ul>
                  <li>Generate complete Markdown articles from a single idea.</li>
                  <li>Produce cover and inline images with supported T2I models.</li>
                  <li>Track every stage in a clear terminal pipeline UI.</li>
                </ul>
              </div>
              <div className="col col--4">
                <h2>Installation</h2>
                <p>Install Node.js 20+, run <code>npm install</code>, and launch the CLI with <code>npm run dev -- --help</code>.</p>
                <p>
                  Continue with <Link to="/docs/getting-started/installation">Installation Guide</Link>.
                </p>
              </div>
              <div className="col col--4">
                <h2>Getting Started</h2>
                <p>Set credentials, run your first idea, and inspect generated output paths in minutes.</p>
                <p>
                  Start at <Link to="/docs/getting-started/quickstart">Quickstart</Link>.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className={styles.sectionMuted}>
          <div className="container">
            <h2>Need deeper internals?</h2>
            <p>
              Developer and contributor documentation lives in dedicated tracks:
              {' '}
              <Link to="/docs/technical/architecture">Technical Docs</Link>
              {' '}
              and
              {' '}
              <Link to="/docs/contributing/development">Contributing</Link>.
            </p>
          </div>
        </section>
      </main>
    </Layout>
  );
}
