import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Input,
  MessageBar,
  Spinner,
  Text,
  Title2,
  Toolbar,
  ToolbarButton
} from '@fluentui/react-components';
import { AddRegular, SearchRegular } from '@fluentui/react-icons';
import { useAuthSession } from '../../lib/auth';
import { deleteEntry, listEntries, searchEntries } from './entriesApi';
import { EntryCard } from './EntryCard';

type FeedPageProps = {
  focusEntryId?: string | null;
  onCreate: () => void;
  onOpen: (entryId: string) => void;
};

export function FeedPage({ focusEntryId, onCreate, onOpen }: FeedPageProps) {
  const { accessToken } = useAuthSession();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const focusedRef = useRef<HTMLDivElement | null>(null);

  const query = useInfiniteQuery({
    queryKey: ['entries', submittedSearch],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      submittedSearch
        ? searchEntries(accessToken, submittedSearch)
        : listEntries(accessToken, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 10_000
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => deleteEntry(accessToken, entryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entries'] });
    }
  });

  const entries = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data]
  );

  useEffect(() => {
    if (!query.hasNextPage || query.isFetchingNextPage || submittedSearch) {
      return;
    }

    const node = loadMoreRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void query.fetchNextPage();
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [query, submittedSearch]);

  useEffect(() => {
    focusedRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focusEntryId, entries]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setSubmittedSearch(searchText.trim());
  }

  return (
    <main className="page-shell">
      <section className="feed-header">
        <div>
          <Title2 as="h1">Mermaid Notes</Title2>
          <Text>Reverse chronological diagrams and notes.</Text>
        </div>
        <Toolbar>
          <ToolbarButton appearance="primary" icon={<AddRegular />} onClick={onCreate}>
            New entry
          </ToolbarButton>
        </Toolbar>
      </section>

      <form className="search-row" onSubmit={submitSearch}>
        <Input
          contentBefore={<SearchRegular />}
          placeholder="Search descriptions or Mermaid code"
          value={searchText}
          onChange={(_, data) => setSearchText(data.value)}
        />
        <Button type="submit">Search</Button>
        {submittedSearch ? (
          <Button
            type="button"
            appearance="subtle"
            onClick={() => {
              setSearchText('');
              setSubmittedSearch('');
            }}
          >
            Clear
          </Button>
        ) : null}
      </form>

      {query.isError ? (
        <MessageBar intent="error">
          {query.error instanceof Error ? query.error.message : 'Unable to load entries.'}
        </MessageBar>
      ) : null}

      {query.isLoading ? (
        <div className="centered-state">
          <Spinner label="Loading entries" />
        </div>
      ) : null}

      {!query.isLoading && entries.length === 0 ? (
        <div className="empty-state">
          <Title2 as="h2">No entries yet</Title2>
          <Text>Create your first note with a Mermaid chart.</Text>
          <Button appearance="primary" icon={<AddRegular />} onClick={onCreate}>
            New entry
          </Button>
        </div>
      ) : null}

      <section className="feed-list" aria-label="Entries">
        {entries.map((entry) => (
          <div
            key={entry.id}
            ref={entry.id === focusEntryId ? focusedRef : undefined}
          >
            <EntryCard
              entry={entry}
              isHighlighted={entry.id === focusEntryId}
              onOpen={onOpen}
              onDelete={(entryId) => {
                if (window.confirm('Delete this entry?')) {
                  deleteMutation.mutate(entryId);
                }
              }}
            />
          </div>
        ))}
      </section>

      {!submittedSearch ? <div ref={loadMoreRef} className="load-more-sentinel" /> : null}
      {query.isFetchingNextPage ? <Spinner size="small" label="Loading older entries" /> : null}
    </main>
  );
}
