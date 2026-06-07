import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEntry, listEntries, searchEntries } from './entriesApi';

describe('entriesApi', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        return new Response(
          JSON.stringify({
            url,
            method: init?.method ?? 'GET',
            items: [],
            nextCursor: null
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' }
          }
        );
      })
    );
  });

  it('lists entries with a cursor', async () => {
    const page = await listEntries('token', 'abc');

    expect((page as unknown as { url: string }).url).toContain('/api/v1/entries?cursor=abc');
  });

  it('searches entries by query text', async () => {
    const page = await searchEntries('token', 'payment gateway');

    expect((page as unknown as { url: string }).url).toContain('/api/v1/entries/search?q=payment+gateway');
  });

  it('creates entries with a JSON body', async () => {
    await createEntry('token', {
      descriptionMarkdown: 'Summary',
      mermaidSource: 'flowchart TD\nA-->B'
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/entries'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          descriptionMarkdown: 'Summary',
          mermaidSource: 'flowchart TD\nA-->B'
        })
      })
    );
  });
});
