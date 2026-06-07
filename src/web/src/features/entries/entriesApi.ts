import { requestJson } from '../../lib/apiClient';
import type { Entry, EntryInput, EntryPage } from './types';

export function listEntries(token: string | undefined, cursor?: string | null) {
  const params = new URLSearchParams();
  if (cursor) {
    params.set('cursor', cursor);
  }

  const query = params.toString();
  return requestJson<EntryPage>(`/api/v1/entries${query ? `?${query}` : ''}`, { token });
}

export function searchEntries(token: string | undefined, q: string) {
  const params = new URLSearchParams({ q });
  return requestJson<EntryPage>(`/api/v1/entries/search?${params}`, { token });
}

export function getEntry(token: string | undefined, id: string) {
  return requestJson<Entry>(`/api/v1/entries/${id}`, { token });
}

export function createEntry(token: string | undefined, input: EntryInput) {
  return requestJson<Entry>('/api/v1/entries', {
    method: 'POST',
    token,
    body: input
  });
}

export function updateEntry(token: string | undefined, id: string, input: EntryInput) {
  return requestJson<Entry>(`/api/v1/entries/${id}`, {
    method: 'PUT',
    token,
    body: input
  });
}

export function deleteEntry(token: string | undefined, id: string) {
  return requestJson<void>(`/api/v1/entries/${id}`, {
    method: 'DELETE',
    token
  });
}
