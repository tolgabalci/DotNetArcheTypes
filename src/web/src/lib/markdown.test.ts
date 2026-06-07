import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders markdown and strips script tags', () => {
    const html = renderMarkdown('# Hello\n<script>alert("x")</script>');

    expect(html).toContain('<h1>Hello</h1>');
    expect(html).not.toContain('<script>');
  });
});
