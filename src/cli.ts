#!/usr/bin/env node

import { command, run, flag, positional, optional, string, boolean } from 'cmd-ts';
import { readdown } from './index.js';

const app = command({
  name: 'readdown',
  description: 'HTML to clean Markdown optimized for LLMs',
  args: {
    url: positional({
      type: optional(string),
      displayName: 'url',
      description: 'Fetch URL and convert to markdown',
    }),
    stdin: flag({
      type: boolean,
      long: 'stdin',
      description: 'Read HTML from stdin',
    }),
    raw: flag({
      type: boolean,
      long: 'raw',
      description: 'Skip content extraction, convert full HTML',
    }),
    noHeader: flag({
      type: boolean,
      long: 'no-header',
      description: "Don't add title/metadata header",
    }),
    json: flag({
      type: boolean,
      long: 'json',
      description: 'Output as JSON (includes metadata + token count)',
    }),
  },
  handler: async ({ url, stdin, raw, noHeader, json }) => {
    let html = '';

    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
        process.exit(1);
      }
      html = await res.text();
    } else if (stdin || !process.stdin.isTTY) {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk as Buffer);
      }
      html = Buffer.concat(chunks).toString('utf-8');
    } else {
      console.error('Error: provide a URL or pipe HTML via stdin');
      process.exit(1);
    }

    const result = readdown(html, {
      url: url || undefined,
      raw,
      includeHeader: !noHeader,
    });

    if (json) {
      console.log(JSON.stringify({
        markdown: result.markdown,
        metadata: result.metadata,
        tokens: result.tokens,
        chars: result.chars,
        contextUsage: result.contextUsage,
      }, null, 2));
    } else {
      process.stdout.write(result.markdown);
    }
  },
});

run(app, process.argv.slice(2)).catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
