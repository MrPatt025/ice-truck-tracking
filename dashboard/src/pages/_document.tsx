// Minimal custom Document to satisfy Next.js pages manifest in dev
// This coexists with the App Router and is only used for legacy pages internals.
import Document, { Html, Head, Main, NextScript } from 'next/document';
import type { JSX } from 'react';

export default class MyDocument extends Document {
  render(): JSX.Element {
    return (
      <Html lang="en">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
