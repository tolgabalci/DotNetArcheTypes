import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  MessageBar,
  Spinner,
  Text,
  Textarea,
  Title2,
  Toolbar,
  ToolbarButton
} from '@fluentui/react-components';
import { DismissRegular, SaveRegular } from '@fluentui/react-icons';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useAuthSession } from '../../lib/auth';
import { ChartRenderer } from '../../components/ChartRenderer';
import { createEntry, getEntry, updateEntry } from './entriesApi';
import { MermaidEditor } from './MermaidEditor';
import type { Entry, EntryInput } from './types';

const defaultMermaid = `flowchart TD
  A[Capture note] --> B[Write Mermaid]
  B --> C[Render chart]
`;

type EditorPageProps = {
  entryId: string | 'new';
  onCancel: () => void;
  onSaved: (entry: Entry) => void;
};

export function EditorPage({ entryId, onCancel, onSaved }: EditorPageProps) {
  const { accessToken } = useAuthSession();
  const queryClient = useQueryClient();
  const [descriptionMarkdown, setDescriptionMarkdown] = useState('');
  const [mermaidSource, setMermaidSource] = useState(defaultMermaid);

  const isNew = entryId === 'new';

  const entryQuery = useQuery({
    queryKey: ['entry', entryId],
    enabled: !isNew,
    queryFn: () => getEntry(accessToken, entryId)
  });

  useEffect(() => {
    if (entryQuery.data) {
      setDescriptionMarkdown(entryQuery.data.descriptionMarkdown);
      setMermaidSource(entryQuery.data.mermaidSource);
    }
  }, [entryQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input: EntryInput = {
        descriptionMarkdown,
        mermaidSource
      };

      return isNew
        ? createEntry(accessToken, input)
        : updateEntry(accessToken, entryId, input);
    },
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: ['entries'] });
      await queryClient.invalidateQueries({ queryKey: ['entry', entry.id] });
      onSaved(entry);
    }
  });

  if (entryQuery.isLoading) {
    return (
      <div className="centered-state">
        <Spinner label="Loading editor" />
      </div>
    );
  }

  if (entryQuery.isError) {
    return (
      <main className="page-shell">
        <MessageBar intent="error">
          {entryQuery.error instanceof Error ? entryQuery.error.message : 'Unable to load entry.'}
        </MessageBar>
        <Button onClick={onCancel}>Back</Button>
      </main>
    );
  }

  return (
    <main className="editor-page">
      <section className="editor-header">
        <div>
          <Title2 as="h1">{isNew ? 'New entry' : 'Edit entry'}</Title2>
          <Text>Markdown description plus live Mermaid preview.</Text>
        </div>
        <Toolbar>
          <ToolbarButton icon={<DismissRegular />} onClick={onCancel}>
            Cancel
          </ToolbarButton>
          <ToolbarButton
            appearance="primary"
            icon={<SaveRegular />}
            disabled={!descriptionMarkdown.trim() || !mermaidSource.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Save
          </ToolbarButton>
        </Toolbar>
      </section>

      {saveMutation.isError ? (
        <MessageBar intent="error">
          {saveMutation.error instanceof Error ? saveMutation.error.message : 'Unable to save entry.'}
        </MessageBar>
      ) : null}

      <Textarea
        className="description-editor"
        resize="vertical"
        placeholder="Write a quick Markdown summary for this diagram"
        value={descriptionMarkdown}
        onChange={(_, data) => setDescriptionMarkdown(data.value)}
      />

      <PanelGroup className="split-editor" direction="horizontal">
        <Panel defaultSize={48} minSize={30}>
          <MermaidEditor value={mermaidSource} onChange={setMermaidSource} />
        </Panel>
        <PanelResizeHandle className="resize-handle" />
        <Panel minSize={30}>
          <div className="preview-pane">
            <ChartRenderer source={mermaidSource} />
          </div>
        </Panel>
      </PanelGroup>
    </main>
  );
}
